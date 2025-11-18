/**
 * Frontend Encryption Service
 *
 * This service handles client-side decryption only.
 * Encryption is now handled server-side for better security.
 *
 * The private key is stored in localStorage (in production, consider more secure storage)
 */

// Import forge for RSA operations
import forge from "node-forge";

// Cache for parsed private keys to avoid re-parsing on every message
const privateKeyCache = new Map();
const CACHE_MAX_SIZE = 10; // Small cache for private keys

// IndexedDB persistence for private keys (better durability than localStorage alone)
const hasIndexedDB = typeof window !== "undefined" && "indexedDB" in window;
const DB_NAME = "alumni-connect-e2ee";
const DB_VERSION = 1;
const STORE_NAME = "privateKeys";

let idbOpenPromise = null;

function openKeyDatabase() {
  if (!hasIndexedDB) {
    return Promise.reject(new Error("IndexedDB not available"));
  }

  if (!idbOpenPromise) {
    idbOpenPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error || new Error("Failed to open IndexedDB"));
      } catch (error) {
        reject(error);
      }
    });
  }

  return idbOpenPromise;
}

async function persistPrivateKeyIndexedDB(userId, privateKeyPem) {
  if (!hasIndexedDB || !userId || !privateKeyPem) return;

  try {
    const db = await openKeyDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(privateKeyPem, userId);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Failed to persist private key to IndexedDB")
        );
    });
  } catch (error) {
    console.warn(
      "Failed to persist private key to IndexedDB:",
      error?.message || error
    );
  }
}

async function removePrivateKeyIndexedDB(userId) {
  if (!hasIndexedDB || !userId) return;

  try {
    const db = await openKeyDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Failed to remove private key from IndexedDB")
        );
    });
  } catch (error) {
    console.warn(
      "Failed to remove private key from IndexedDB:",
      error?.message || error
    );
  }
}

async function loadPrivateKeyIndexedDB(userId) {
  if (!hasIndexedDB || !userId) return null;

  try {
    const db = await openKeyDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(
          request.error ||
            new Error("Failed to load private key from IndexedDB")
        );
    });
  } catch (error) {
    console.warn(
      "Failed to load private key from IndexedDB:",
      error?.message || error
    );
    return null;
  }
}

/**
 * Get or parse private key from PEM (with caching)
 * @param {string} privateKeyPem - Private key in PEM format
 * @returns {Object} Forge private key object
 */
function getCachedPrivateKey(privateKeyPem) {
  if (!privateKeyCache.has(privateKeyPem)) {
    // Parse and cache the key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    // Limit cache size (FIFO)
    if (privateKeyCache.size >= CACHE_MAX_SIZE) {
      const firstKey = privateKeyCache.keys().next().value;
      privateKeyCache.delete(firstKey);
    }

    privateKeyCache.set(privateKeyPem, privateKey);
  }

  return privateKeyCache.get(privateKeyPem);
}

/**
 * Store user's private key in localStorage
 * @param {string} userId - User ID
 * @param {string} privateKeyPem - Private key in PEM format
 */
export function storePrivateKey(userId, privateKeyPem) {
  try {
    localStorage.setItem(`e2ee_private_${userId}`, privateKeyPem);
    console.log("🔑 Private key stored successfully");
    // Persist asynchronously to IndexedDB for better durability (no await to keep API synchronous)
    persistPrivateKeyIndexedDB(userId, privateKeyPem);
  } catch (error) {
    console.error("Error storing private key:", error);
  }
}

/**
 * Get user's private key from localStorage
 * @param {string} userId - User ID
 * @returns {string|null} Private key in PEM format or null
 */
export function getPrivateKey(userId) {
  try {
    return localStorage.getItem(`e2ee_private_${userId}`);
  } catch (error) {
    console.error("Error retrieving private key:", error);
    return null;
  }
}

/**
 * Attempt to restore a private key from IndexedDB (fallback when localStorage entry is missing)
 * @param {string} userId
 * @returns {Promise<string|null>} Private key if stored, otherwise null
 */
export async function restorePrivateKeyFromIndexedDB(userId) {
  const key = await loadPrivateKeyIndexedDB(userId);
  if (key) {
    try {
      localStorage.setItem(`e2ee_private_${userId}`, key);
    } catch (error) {
      console.warn(
        "Failed to sync IndexedDB private key back to localStorage:",
        error?.message || error
      );
    }
  }
  return key;
}

/**
 * Decrypt a message using user's private key
 * @param {Object} encryptedData - {encryptedMessage, encryptedAESKey, iv}
 * @param {string} privateKeyPem - User's private key in PEM format
 * @returns {string} Decrypted message
 */
export function decryptMessage(encryptedData, privateKeyPem) {
  try {
    // Validate encryption data - return null instead of throwing for missing fields
    if (!encryptedData) {
      console.warn("⚠️ No encryption data provided");
      return null;
    }

    const { encryptedMessage, encryptedAESKey, iv } = encryptedData;

    // Check for missing required fields
    if (!encryptedMessage || !encryptedAESKey || !iv) {
      console.warn("⚠️ Missing encryption data fields:", {
        hasEncryptedMessage: !!encryptedMessage,
        hasEncryptedAESKey: !!encryptedAESKey,
        hasIV: !!iv,
      });
      return null; // Return null instead of throwing
    }

    if (!privateKeyPem) {
      console.warn("⚠️ No private key provided");
      return null;
    }

    // Validate private key format
    if (typeof privateKeyPem !== "string") {
      console.error("❌ Private key is not a string:", typeof privateKeyPem);
      return null;
    }

    // Check if key has proper PEM headers
    const hasPrivateKeyHeader =
      privateKeyPem.includes("-----BEGIN") &&
      (privateKeyPem.includes("PRIVATE KEY-----") ||
        privateKeyPem.includes("RSA PRIVATE KEY-----"));

    if (!hasPrivateKeyHeader) {
      console.error("❌ Invalid private key format - missing PEM headers");
      return null;
    }

    // Step 1: Get cached private key (avoids re-parsing)
    let privateKey;
    try {
      privateKey = getCachedPrivateKey(privateKeyPem);
    } catch (pemError) {
      console.error(" Failed to parse private key PEM:", pemError.message);
      return null;
    }

    // Step 2: Decrypt AES key using RSA private key (fast with cached key)
    const encryptedKeyBinary = forge.util.decode64(encryptedAESKey);

    // CRITICAL: Use EXACT same parameters as backend encryption (SHA-256 + MGF1 SHA-256)
    // Backend: encryptionService.js uses forge.md.sha256.create() consistently
    // DO NOT try random fallback combinations - only use what backend uses
    const backendRSAOptions = {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    };

    // Attempt RSA-OAEP with backend's exact parameters first
    let aesKeyBinary = null;
    let lastRsaError = null;

    try {
      aesKeyBinary = privateKey.decrypt(
        encryptedKeyBinary,
        "RSA-OAEP",
        backendRSAOptions
      );
      if (aesKeyBinary) {
        // Success with backend parameters
        if (aesKeyBinary.length !== 32) {
          console.warn(
            "⚠️ Decrypted AES key has unexpected length:",
            aesKeyBinary.length
          );
          aesKeyBinary = null;
        }
      }
    } catch (rsaError) {
      lastRsaError = rsaError;
      console.warn(
        "⚠️ Primary RSA-OAEP decryption failed (SHA-256):",
        rsaError.message
      );
    }

    // Only if primary fails, try SHA-1 as fallback for older encrypted messages
    if (!aesKeyBinary) {
      try {
        const fallbackOptions = {
          md: forge.md.sha1.create(),
          mgf1: { md: forge.md.sha1.create() },
        };
        aesKeyBinary = privateKey.decrypt(
          encryptedKeyBinary,
          "RSA-OAEP",
          fallbackOptions
        );
        if (aesKeyBinary) {
          console.debug("📋 RSA-OAEP fallback succeeded using SHA-1");
          if (aesKeyBinary.length !== 32) {
            console.warn(
              "⚠️ Fallback AES key has unexpected length:",
              aesKeyBinary.length
            );
            aesKeyBinary = null;
          }
        }
      } catch (fallbackError) {
        lastRsaError = fallbackError;
      }
    }

    // If still failed, this is a real error
    if (!aesKeyBinary) {
      console.error(
        "❌ Failed to decrypt AES key - neither SHA-256 nor SHA-1 worked"
      );
      console.error(
        "   Backend error: " + (lastRsaError?.message || "Unknown")
      );
      console.error(
        "   This usually means: encryption/decryption parameters mismatch"
      );
      return null;
    }

    // Step 3: Convert to proper format for AES decryption using Forge
    // Backend encrypts with Node crypto AES-256-CBC, frontend decrypts with Forge
    // Both use identical algorithm/key derivation, so they're fully compatible
    const aesKey = forge.util.createBuffer(aesKeyBinary, "raw");
    const ivBuffer = forge.util.decode64(iv);

    // Step 4: Decrypt message using AES-256-CBC with Forge
    try {
      const decipher = forge.cipher.createDecipher("AES-CBC", aesKey);
      decipher.start({ iv: ivBuffer });

      const encryptedBytes = forge.util.decode64(encryptedMessage);
      decipher.update(forge.util.createBuffer(encryptedBytes, "raw"));

      // CRITICAL: Check if decipher.finish() succeeds
      // If false, the decryption failed - usually means AES key is wrong
      if (!decipher.finish()) {
        console.warn("⚠️ AES-256-CBC decipher.finish() returned false");
        console.warn("   This usually means the AES key or IV is corrupted");
        console.warn("   Key length:", aesKeyBinary.length, "Expected: 32");
        console.warn("   IV length:", ivBuffer.length(), "Expected: 16");
        return null;
      }

      const decrypted = decipher.output.toString("utf8");

      // Validate we got valid UTF-8 output
      if (!decrypted || decrypted.trim() === "") {
        console.warn("⚠️ Decryption produced empty output");
        return null;
      }

      return decrypted;
    } catch (aesError) {
      console.error("❌ AES-256-CBC decryption error:", aesError.message);
      console.error("   Stack:", aesError.stack);
      return null;
    }
  } catch (error) {
    console.error("❌ Decryption error:", error.message);
    // Return null instead of throwing - let caller handle it
    return null;
  }
}

/**
 * Validate encryption data structure
 * @param {Object} encryptionData - Encryption data to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidEncryptionData(encryptionData) {
  if (!encryptionData || typeof encryptionData !== "object") {
    return false;
  }

  const { encryptedMessage, encryptedAESKey, iv } = encryptionData;

  return !!encryptedMessage && !!encryptedAESKey && !!iv;
}

/**
 * Check if user has a private key stored
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function hasPrivateKey(userId) {
  const key = getPrivateKey(userId);
  if (!key) return false;

  // Validate it's a proper PEM format
  const isValidFormat =
    typeof key === "string" &&
    key.includes("-----BEGIN") &&
    (key.includes("PRIVATE KEY-----") || key.includes("RSA PRIVATE KEY-----"));

  if (!isValidFormat) {
    console.error(
      "❌ Invalid private key format in localStorage for user:",
      userId
    );
    console.log(
      'Key should start with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----"'
    );
    return false;
  }

  return true;
}

/**
 * Validate private key format
 * @param {string} privateKeyPem - Private key to validate
 * @returns {Object} { valid: boolean, error: string }
 */
export function validatePrivateKey(privateKeyPem) {
  if (!privateKeyPem) {
    return { valid: false, error: "No private key provided" };
  }

  if (typeof privateKeyPem !== "string") {
    return { valid: false, error: "Private key must be a string" };
  }

  if (!privateKeyPem.includes("-----BEGIN")) {
    return { valid: false, error: "Missing PEM header (-----BEGIN...)" };
  }

  if (!privateKeyPem.includes("-----END")) {
    return { valid: false, error: "Missing PEM footer (-----END...)" };
  }

  const hasPrivateKeyMarker = privateKeyPem.includes("PRIVATE KEY-----");
  if (!hasPrivateKeyMarker) {
    return {
      valid: false,
      error: "Not a private key (missing PRIVATE KEY marker)",
    };
  }

  try {
    // Try to parse it with forge
    forge.pki.privateKeyFromPem(privateKeyPem);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: `Failed to parse: ${error.message}` };
  }
}

/**
 * Clear user's private key from localStorage
 * @param {string} userId - User ID
 */
export function clearPrivateKey(userId) {
  try {
    localStorage.removeItem(`e2ee_private_${userId}`);
    console.log("🗑️ Private key cleared");
    removePrivateKeyIndexedDB(userId);
  } catch (error) {
    console.error("Error clearing private key:", error);
  }
}

/**
 * Clear all encryption keys from localStorage (useful for debugging/reset)
 */
export function clearAllEncryptionKeys() {
  try {
    const keys = Object.keys(localStorage);
    const encryptionKeys = keys.filter((key) =>
      key.startsWith("e2ee_private_")
    );

    encryptionKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log(`🗑️ Cleared ${encryptionKeys.length} encryption keys`);
    return encryptionKeys.length;
  } catch (error) {
    console.error("Error clearing encryption keys:", error);
    return 0;
  }
}

/**
 * Convert compact public key to PEM format
 * @param {string} compactKey - Compact key (base64 without headers)
 * @returns {string} PEM formatted key
 */
export function compactToPem(compactKey) {
  const header = "-----BEGIN PUBLIC KEY-----\n";
  const footer = "\n-----END PUBLIC KEY-----";

  // Split into 64-character lines
  const lines = compactKey.match(/.{1,64}/g) || [];
  return header + lines.join("\n") + footer;
}

/**
 * Validate if a message is encrypted
 * @param {Object} message - Message object
 * @returns {boolean}
 */
export function isEncrypted(message) {
  return message && message.encrypted === true && message.encryptionData;
}
