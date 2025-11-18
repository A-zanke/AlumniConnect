const forge = require('node-forge');
const crypto = require('crypto');

/**
 * Hybrid Encryption Service (RSA + AES)
 * Similar to WhatsApp's end-to-end encryption
 * 
 * Flow:
 * 1. Generate RSA key pairs for each user
 * 2. For each message: Generate random AES key + IV
 * 3. Encrypt message with AES-256-CBC
 * 4. Encrypt AES key with recipient's RSA public key
 * 5. Store only encrypted data in MongoDB
 */

// Cache for parsed public keys to avoid re-parsing PEM on every message
const publicKeyCache = new Map();
const CACHE_MAX_SIZE = 100; // Limit cache size to prevent memory issues

/**
 * Get or parse public key from PEM (with caching)
 * @param {string} publicKeyPem - Public key in PEM format
 * @returns {Object} Forge public key object
 */
function getPublicKey(publicKeyPem) {
  if (!publicKeyCache.has(publicKeyPem)) {
    // Parse and cache the key
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
    // Limit cache size (FIFO)
    if (publicKeyCache.size >= CACHE_MAX_SIZE) {
      const firstKey = publicKeyCache.keys().next().value;
      publicKeyCache.delete(firstKey);
    }
    
    publicKeyCache.set(publicKeyPem, publicKey);
  }
  
  return publicKeyCache.get(publicKeyPem);
}

/**
 * Generate RSA key pair (2048-bit)
 * @returns {Object} { publicKey: string, privateKey: string }
 */
function generateRSAKeyPair() {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  
  return {
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey)
  };
}

/**
 * Encrypt a message for a specific recipient
 * @param {string} plainText - The message to encrypt
 * @param {string} recipientPublicKeyPem - Recipient's RSA public key (PEM format)
 * @returns {Object} { encryptedMessage, encryptedAESKey, iv, version } or null on failure
 */
function encryptMessage(plainText, recipientPublicKeyPem) {
  try {
    // Validate inputs
    if (!plainText || typeof plainText !== 'string' || plainText.trim() === '') {
      console.error('❌ Invalid plainText provided to encryptMessage');
      return null;
    }
    
    if (!recipientPublicKeyPem || typeof recipientPublicKeyPem !== 'string') {
      console.error('❌ No recipient public key provided');
      return null;
    }
    
    // Validate PEM format
    if (!recipientPublicKeyPem.includes('BEGIN PUBLIC KEY')) {
      console.error('❌ Invalid PEM format - missing BEGIN PUBLIC KEY header');
      return null;
    }
    
    // Step 1: Generate random AES key (256 bits) and IV (128 bits for AES-CBC)
    const aesKey = crypto.randomBytes(32); // 256 bits
    const iv = crypto.randomBytes(16); // 128 bits
    
    // Step 2: Encrypt the message using AES-256-CBC (fast)
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedMessage = cipher.update(plainText, 'utf8', 'base64');
    encryptedMessage += cipher.final('base64');
    
    // Verify encryption produced output
    if (!encryptedMessage || encryptedMessage.length === 0) {
      console.error('❌ AES encryption produced empty result');
      return null;
    }
    
    // Step 3: Parse public key (with error handling)
    let publicKey;
    try {
      publicKey = getPublicKey(recipientPublicKeyPem);
    } catch (keyError) {
      console.error('❌ Failed to parse public key:', keyError.message);
      return null;
    }
    
    // Step 4: Encrypt the AES key using recipient's RSA public key
    const encryptedAESKey = publicKey.encrypt(aesKey.toString('binary'), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    });
    
    // Verify RSA encryption produced output
    if (!encryptedAESKey || encryptedAESKey.length === 0) {
      console.error('❌ RSA encryption produced empty result');
      return null;
    }
    
    // Step 5: Return result (all operations completed successfully)
    const result = {
      encryptedMessage: encryptedMessage,
      encryptedAESKey: forge.util.encode64(encryptedAESKey),
      iv: iv.toString('base64'),
      version: 'v1'
    };
    
    // Final validation
    if (!result.encryptedMessage || !result.encryptedAESKey || !result.iv) {
      console.error('❌ Encryption result missing required fields');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
    console.error('Stack:', error.stack);
    return null; // Return null instead of throwing
  }
}

/**
 * Decrypt a message using recipient's private key
 * @param {Object} encryptedData - { encryptedMessage, encryptedAESKey, iv }
 * @param {string} recipientPrivateKeyPem - Recipient's RSA private key (PEM format)
 * @returns {string} Decrypted plain text
 */
function decryptMessage(encryptedData, recipientPrivateKeyPem) {
  try {
    // Defensive validation to avoid throwing on missing fields
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new Error('Missing encryption data object');
    }

    const { encryptedMessage, encryptedAESKey, iv } = encryptedData;

    // Validate all required fields are present
    if (!encryptedMessage || typeof encryptedMessage !== 'string') {
      throw new Error('Missing or invalid encryptedMessage');
    }
    if (!encryptedAESKey || typeof encryptedAESKey !== 'string') {
      throw new Error('Missing or invalid encryptedAESKey');
    }
    if (!iv || typeof iv !== 'string') {
      throw new Error('Missing or invalid IV');
    }
    if (!recipientPrivateKeyPem || typeof recipientPrivateKeyPem !== 'string') {
      throw new Error('Missing or invalid recipient private key');
    }
    
    // Validate private key format
    if (!recipientPrivateKeyPem.includes('BEGIN') || !recipientPrivateKeyPem.includes('PRIVATE KEY')) {
      throw new Error('Invalid private key PEM format');
    }
    
    // Step 1: Parse private key
    let privateKey;
    try {
      privateKey = forge.pki.privateKeyFromPem(recipientPrivateKeyPem);
    } catch (keyError) {
      throw new Error(`Failed to parse private key: ${keyError.message}`);
    }
    
    // Step 2: Decrypt the AES key using RSA private key
    let aesKeyBinary;
    try {
      const encryptedKeyBinary = forge.util.decode64(encryptedAESKey);
      aesKeyBinary = privateKey.decrypt(encryptedKeyBinary, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        }
      });
    } catch (rsaError) {
      throw new Error(`RSA decryption failed: ${rsaError.message}`);
    }
    
    if (!aesKeyBinary || aesKeyBinary.length !== 32) {
      throw new Error('Decrypted AES key has invalid length');
    }
    
    // Step 3: Convert AES key from binary to Buffer
    const aesKey = Buffer.from(aesKeyBinary, 'binary');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // Step 4: Decrypt the message using AES-256-CBC
    let decrypted;
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, ivBuffer);
      decrypted = decipher.update(encryptedMessage, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
    } catch (aesError) {
      throw new Error(`AES decryption failed: ${aesError.message}`);
    }
    
    return decrypted;
  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ Decryption error:', error.message);
    // Return user-friendly error
    throw new Error('Failed to decrypt message: ' + error.message);
  }
}

/**
 * Encrypt message for group chat (multiple recipients)
 * @param {string} plainText - Message to encrypt
 * @param {Array<string>} recipientPublicKeys - Array of recipient public keys
 * @returns {Object} { encryptedMessage, iv, encryptedKeysMap }
 */
function encryptGroupMessage(plainText, recipientPublicKeys) {
  try {
    // Step 1: Generate one AES key for all recipients
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Step 2: Encrypt message once with AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedMessage = cipher.update(plainText, 'utf8', 'base64');
    encryptedMessage += cipher.final('base64');
    
    // Step 3: Encrypt AES key for each recipient
    const encryptedKeysMap = {};
    recipientPublicKeys.forEach(({ userId, publicKey }) => {
      const pubKey = forge.pki.publicKeyFromPem(publicKey);
      const encryptedKey = pubKey.encrypt(aesKey.toString('binary'), 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha256.create() }
      });
      encryptedKeysMap[userId] = forge.util.encode64(encryptedKey);
    });
    
    return {
      encryptedMessage,
      iv: iv.toString('base64'),
      encryptedKeysMap,
      version: 'v1'
    };
  } catch (error) {
    console.error('Group encryption error:', error);
    throw new Error('Failed to encrypt group message: ' + error.message);
  }
}

/**
 * Validate if a string is a valid PEM-formatted RSA key
 * @param {string} keyPem - Key in PEM format
 * @param {string} type - 'public' or 'private'
 * @returns {boolean}
 */
function validateRSAKey(keyPem, type = 'public') {
  try {
    if (type === 'public') {
      forge.pki.publicKeyFromPem(keyPem);
    } else {
      forge.pki.privateKeyFromPem(keyPem);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert PEM key to compact format (remove headers/footers, newlines)
 * Useful for storage optimization
 * @param {string} pemKey - Key in PEM format
 * @returns {string} Compact key
 */
function pemToCompact(pemKey) {
  return pemKey
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .replace(/\s/g, '');
}

/**
 * Convert compact key back to PEM format
 * @param {string} compactKey - Compact key
 * @param {string} type - 'public' or 'private'
 * @returns {string} PEM formatted key
 */
function compactToPem(compactKey, type = 'public') {
  const header = type === 'public' 
    ? '-----BEGIN PUBLIC KEY-----\n'
    : '-----BEGIN RSA PRIVATE KEY-----\n';
  const footer = type === 'public'
    ? '\n-----END PUBLIC KEY-----'
    : '\n-----END RSA PRIVATE KEY-----';
  
  // Split into 64-character lines
  const lines = compactKey.match(/.{1,64}/g) || [];
  return header + lines.join('\n') + footer;
}

module.exports = {
  generateRSAKeyPair,
  encryptMessage,
  decryptMessage,
  encryptGroupMessage,
  validateRSAKey,
  pemToCompact,
  compactToPem,
  // Utility to clear cache if needed (e.g., for testing)
  clearKeyCache: () => publicKeyCache.clear()
};
