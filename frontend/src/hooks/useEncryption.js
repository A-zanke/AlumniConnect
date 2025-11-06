import { useState, useEffect, useCallback } from 'react';
import {
  storePrivateKey,
  getPrivateKey,
  decryptMessage,
  isEncrypted,
  hasPrivateKey,
  isValidEncryptionData,
  validatePrivateKey,
  clearPrivateKey
} from '../services/encryptionService';

/**
 * Custom hook for managing end-to-end encryption
 * 
 * NOTE: Encryption is now handled SERVER-SIDE
 * This hook only handles:
 * 1. Storing the private key received during registration
 * 2. Decrypting messages when received
 */
export function useEncryption(user) {
  const [isReady, setIsReady] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // Check if user has a private key
  useEffect(() => {
    let cancelled = false;

    const ensurePrivateKey = async () => {
      if (!user?._id) {
        if (!cancelled) {
          setIsReady(false);
          setHasKey(false);
        }
        return;
      }

      const keyExists = hasPrivateKey(user._id);
      if (!cancelled) {
        setHasKey(keyExists);
        setIsReady(keyExists);
      }

      if (keyExists) {
        // Validate the key format
        const privateKey = getPrivateKey(user._id);
        const validation = validatePrivateKey(privateKey);

        if (!validation.valid) {
          console.error('❌ Private key validation failed:', validation.error);
          console.error('🧹 Clearing invalid private key from localStorage...');

          clearPrivateKey(user._id);

          if (!cancelled) {
            setHasKey(false);
            setIsReady(false);
          }

          console.error('⚠️ Invalid encryption key detected and cleared!');
          console.error('🔑 Please LOGOUT and LOGIN again to get a fresh encryption key');
        } else {
          console.log('🔐 E2EE ready - private key is valid');
        }
        return;
      }

      console.warn('⚠️ No private key found - attempting to fetch from server');

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ Cannot fetch private key - missing auth token');
          return;
        }

        const axiosModule = await import('axios');
        const axiosInstance = axiosModule.default || axiosModule;
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await axiosInstance.get(`${baseURL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { regenerateKeys: true },
        });
        const serverKey = response?.data?.encryptionKeys?.privateKey;
        if (serverKey) {
          storePrivateKey(user._id, serverKey);
          if (!cancelled) {
            setHasKey(true);
            setIsReady(true);
          }
          console.log('✅ Private key fetched from server and stored locally');
        } else {
          console.warn('⚠️ Server did not return a private key even after regeneration request');
        }
      } catch (error) {
        console.warn('Failed to fetch private key from server:', error?.message || error);
      }
    };

    ensurePrivateKey();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Store private key (called after registration or when keys are received)
   * @param {string} privateKeyPem - Private key in PEM format
   */
  const savePrivateKey = useCallback((privateKeyPem) => {
    if (!user?._id) return;
    
    storePrivateKey(user._id, privateKeyPem);
    setHasKey(true);
    setIsReady(true);
    console.log('✅ Private key saved successfully');
  }, [user]);

  /**
   * Decrypt a received message
   * @param {Object} message - Message object with encryptionData
   * @returns {string} Decrypted message or original content
   */
  const decryptReceivedMessage = useCallback(async (message) => {
    // If not encrypted, just return original content
    if (!isEncrypted(message)) {
      return message.content || '';
    }

    // Choose the best encryption payload: sender copy when available
    const encryptionPayload = isValidEncryptionData(message.encryptionData)
      ? message.encryptionData
      : isValidEncryptionData(message.senderEncryptionData)
      ? message.senderEncryptionData
      : null;

    if (!encryptionPayload) {
      console.warn('⚠️ Encrypted flag set but encryption data incomplete. Falling back to plaintext.');
      return message.content || message.body || message.fallbackContent || '';
    }

    if (!user?._id) {
      console.warn('⚠️ Cannot decrypt - no user ID');
      return message.content || message.body || message.fallbackContent || '';
    }

    // Get private key, auto-fetch from server if missing
    let privateKey = getPrivateKey(user._id);

    if (!privateKey) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const axios = (await import('axios')).default;
          const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const response = await axios.get(`${baseURL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const fromServer = response?.data?.encryptionKeys?.privateKey;
          if (fromServer) {
            privateKey = fromServer;
            storePrivateKey(user._id, privateKey);
            console.log('✅ Private key fetched and stored from server');
          }
        }
      } catch (error) {
        console.warn('Failed to fetch private key from server:', error?.message || error);
      }
    }

    // If still no key, show plaintext instead of blocking UI with error banners
    if (!privateKey) {
      return message.content || message.body || message.fallbackContent || '';
    }

    // Attempt decryption (frontend service returns null on failure)
    const decrypted = decryptMessage(encryptionPayload, privateKey);
    if (decrypted === null) {
      // Graceful fallback: return original content if present
      return message.content || message.body || message.fallbackContent || '';
    }
    return decrypted;
  }, [user]);

  return {
    isReady,
    hasKey,
    savePrivateKey,
    decryptReceivedMessage
  };
}
