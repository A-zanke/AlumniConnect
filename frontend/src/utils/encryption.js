/**
 * End-to-End Encryption Utility
 * Uses Web Crypto API for secure encryption/decryption
 * Hybrid approach: RSA for key exchange, AES-GCM for message encryption
 */

const ENCRYPTION_VERSION = 'v1';
const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};

/**
 * Generate RSA key pair for a user
 */
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      RSA_ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export keys
    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
    return {
      publicKey: arrayBufferToBase64(publicKey),
      privateKey: arrayBufferToBase64(privateKey),
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
}

/**
 * Import public key from base64 string
 */
async function importPublicKey(publicKeyBase64) {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      RSA_ALGORITHM,
      true,
      ['encrypt']
    );
  } catch (error) {
    console.error('Error importing public key:', error);
    throw error;
  }
}

/**
 * Import private key from base64 string
 */
async function importPrivateKey(privateKeyBase64) {
  try {
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    return await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      RSA_ALGORITHM,
      true,
      ['decrypt']
    );
  } catch (error) {
    console.error('Error importing private key:', error);
    throw error;
  }
}

/**
 * Generate AES key for message encryption
 */
async function generateAESKey() {
  return await window.crypto.subtle.generateKey(
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt message content using recipient's public key
 * @param {string} content - Message content to encrypt
 * @param {string} recipientPublicKey - Recipient's public key in base64
 * @returns {Object} - Encrypted message object
 */
export async function encryptMessage(content, recipientPublicKey) {
  try {
    // Generate random AES key for this message
    const aesKey = await generateAESKey();
    
    // Generate random IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt content with AES
    const contentBuffer = new TextEncoder().encode(content);
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      contentBuffer
    );
    
    // Export AES key
    const aesKeyRaw = await window.crypto.subtle.exportKey('raw', aesKey);
    
    // Encrypt AES key with recipient's RSA public key
    const publicKey = await importPublicKey(recipientPublicKey);
    const encryptedAESKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      aesKeyRaw
    );
    
    // Return encrypted package
    return {
      version: ENCRYPTION_VERSION,
      encryptedContent: arrayBufferToBase64(encryptedContent),
      encryptedKey: arrayBufferToBase64(encryptedAESKey),
      iv: arrayBufferToBase64(iv),
      encrypted: true,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback: return unencrypted if encryption fails
    return {
      version: ENCRYPTION_VERSION,
      encryptedContent: content,
      encrypted: false,
      error: error.message,
    };
  }
}

/**
 * Decrypt message content using user's private key
 * @param {Object} encryptedMessage - Encrypted message object
 * @param {string} privateKey - User's private key in base64
 * @returns {string} - Decrypted message content
 */
export async function decryptMessage(encryptedMessage, privateKey) {
  try {
    // Check if message is actually encrypted
    if (!encryptedMessage.encrypted) {
      return encryptedMessage.encryptedContent || encryptedMessage.content;
    }
    
    // Import private key
    const userPrivateKey = await importPrivateKey(privateKey);
    
    // Decrypt AES key using RSA private key
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedMessage.encryptedKey);
    const aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      userPrivateKey,
      encryptedKeyBuffer
    );
    
    // Import decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyRaw,
      AES_ALGORITHM,
      false,
      ['decrypt']
    );
    
    // Decrypt content using AES key
    const iv = base64ToArrayBuffer(encryptedMessage.iv);
    const encryptedContentBuffer = base64ToArrayBuffer(encryptedMessage.encryptedContent);
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContentBuffer
    );
    
    // Convert decrypted content to string
    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Unable to decrypt message]';
  }
}

/**
 * Encrypt message for group chat
 * @param {string} content - Message content
 * @param {string} groupKey - Shared group AES key in base64
 * @returns {Object} - Encrypted message object
 */
export async function encryptGroupMessage(content, groupKey) {
  try {
    // Import group AES key
    const groupKeyBuffer = base64ToArrayBuffer(groupKey);
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      groupKeyBuffer,
      AES_ALGORITHM,
      false,
      ['encrypt']
    );
    
    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt content
    const contentBuffer = new TextEncoder().encode(content);
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      contentBuffer
    );
    
    return {
      version: ENCRYPTION_VERSION,
      encryptedContent: arrayBufferToBase64(encryptedContent),
      iv: arrayBufferToBase64(iv),
      encrypted: true,
      isGroup: true,
    };
  } catch (error) {
    console.error('Group encryption error:', error);
    return {
      version: ENCRYPTION_VERSION,
      encryptedContent: content,
      encrypted: false,
      error: error.message,
    };
  }
}

/**
 * Decrypt group message
 * @param {Object} encryptedMessage - Encrypted message object
 * @param {string} groupKey - Shared group AES key in base64
 * @returns {string} - Decrypted content
 */
export async function decryptGroupMessage(encryptedMessage, groupKey) {
  try {
    if (!encryptedMessage.encrypted) {
      return encryptedMessage.encryptedContent || encryptedMessage.content;
    }
    
    // Import group AES key
    const groupKeyBuffer = base64ToArrayBuffer(groupKey);
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      groupKeyBuffer,
      AES_ALGORITHM,
      false,
      ['decrypt']
    );
    
    // Decrypt content
    const iv = base64ToArrayBuffer(encryptedMessage.iv);
    const encryptedContentBuffer = base64ToArrayBuffer(encryptedMessage.encryptedContent);
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContentBuffer
    );
    
    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    console.error('Group decryption error:', error);
    return '[Unable to decrypt message]';
  }
}

/**
 * Generate shared group key
 */
export async function generateGroupKey() {
  const aesKey = await generateAESKey();
  const keyRaw = await window.crypto.subtle.exportKey('raw', aesKey);
  return arrayBufferToBase64(keyRaw);
}

/**
 * Encrypt group key for a specific member
 * @param {string} groupKey - Group AES key in base64
 * @param {string} memberPublicKey - Member's public key in base64
 * @returns {string} - Encrypted group key
 */
export async function encryptGroupKeyForMember(groupKey, memberPublicKey) {
  try {
    const publicKey = await importPublicKey(memberPublicKey);
    const groupKeyBuffer = base64ToArrayBuffer(groupKey);
    
    const encryptedGroupKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      groupKeyBuffer
    );
    
    return arrayBufferToBase64(encryptedGroupKey);
  } catch (error) {
    console.error('Error encrypting group key:', error);
    throw error;
  }
}

/**
 * Decrypt group key using member's private key
 * @param {string} encryptedGroupKey - Encrypted group key in base64
 * @param {string} memberPrivateKey - Member's private key in base64
 * @returns {string} - Decrypted group key
 */
export async function decryptGroupKeyForMember(encryptedGroupKey, memberPrivateKey) {
  try {
    const privateKey = await importPrivateKey(memberPrivateKey);
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedGroupKey);
    
    const groupKeyBuffer = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedKeyBuffer
    );
    
    return arrayBufferToBase64(groupKeyBuffer);
  } catch (error) {
    console.error('Error decrypting group key:', error);
    throw error;
  }
}

// Utility functions
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Store keys in localStorage securely
 */
export function storeKeys(userId, publicKey, privateKey) {
  try {
    localStorage.setItem(`e2ee_public_${userId}`, publicKey);
    localStorage.setItem(`e2ee_private_${userId}`, privateKey);
  } catch (error) {
    console.error('Error storing keys:', error);
  }
}

/**
 * Retrieve keys from localStorage
 */
export function getStoredKeys(userId) {
  try {
    return {
      publicKey: localStorage.getItem(`e2ee_public_${userId}`),
      privateKey: localStorage.getItem(`e2ee_private_${userId}`),
    };
  } catch (error) {
    console.error('Error retrieving keys:', error);
    return { publicKey: null, privateKey: null };
  }
}

/**
 * Initialize encryption for a user
 * Generates and stores keys if not present
 */
export async function initializeEncryption(userId) {
  try {
    let keys = getStoredKeys(userId);
    
    if (!keys.publicKey || !keys.privateKey) {
      // Generate new key pair
      keys = await generateKeyPair();
      storeKeys(userId, keys.publicKey, keys.privateKey);
      
      // Return keys to be uploaded to backend
      return { newKeys: true, ...keys };
    }
    
    return { newKeys: false, ...keys };
  } catch (error) {
    console.error('Error initializing encryption:', error);
    throw error;
  }
}
