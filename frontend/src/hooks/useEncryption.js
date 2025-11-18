import { useState, useEffect, useCallback, useRef } from 'react';
import {
  storePrivateKey,
  getPrivateKey,
  decryptMessage,
  isEncrypted,
  hasPrivateKey,
  isValidEncryptionData,
  validatePrivateKey,
  clearPrivateKey,
  restorePrivateKeyFromIndexedDB
} from '../services/encryptionService';
import { toast } from 'react-toastify';

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
  const failureCountRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshPromiseRef = useRef(null);
  const refreshInfoShownRef = useRef(false);
  const fallbackErrorShownRef = useRef(false);

  const refreshPrivateKeyFromServer = useCallback(
    async ({ forceRegenerate = true, silent = false } = {}) => {
      if (!user?._id) return null;

      if (refreshInFlightRef.current && refreshPromiseRef.current) {
        try {
          return await refreshPromiseRef.current;
        } catch (error) {
          return null;
        }
      }

      const token = localStorage.getItem('token');
      if (!token) {
        if (!silent) {
          toast.error('Cannot refresh encryption keys: missing authentication.');
        }
        return null;
      }

      const runRefresh = (async () => {
        try {
          if (!silent && !refreshInfoShownRef.current) {
            toast.info('Refreshing encryption keys…');
            refreshInfoShownRef.current = true;
          }

          // Clear existing key before regeneration as it is considered invalid
          const previousKey = getPrivateKey(user._id);
          clearPrivateKey(user._id);

          const axiosModule = await import('axios');
          const axiosInstance = axiosModule.default || axiosModule;
          const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const response = await axiosInstance.get(`${baseURL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            params: forceRegenerate ? { regenerateKeys: true } : {}
          });

          const serverKey = response?.data?.encryptionKeys?.privateKey;
          if (serverKey) {
            storePrivateKey(user._id, serverKey);
            failureCountRef.current = 0;
            setHasKey(true);
            setIsReady(true);
            if (!silent) {
              toast.success('Encryption keys refreshed');
              refreshInfoShownRef.current = false;
            }
            return serverKey;
          }

          // Server did not provide a key – restore previous key so user is not locked out
          if (previousKey) {
            storePrivateKey(user._id, previousKey);
          }
          if (!silent) {
            toast.warn('Server did not issue a new encryption key.');
          }
          return null;
        } catch (error) {
          console.warn('Failed to refresh encryption keys:', error?.message || error);
          if (!silent) {
            toast.error('Failed to refresh encryption keys. Please try again.');
            refreshInfoShownRef.current = false;
          }
          return null;
        } finally {
          refreshInFlightRef.current = false;
          refreshPromiseRef.current = null;
        }
      })();

      refreshInFlightRef.current = true;
      refreshPromiseRef.current = runRefresh;
      return await runRefresh;
    },
    [user]
  );

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

      let keyExists = hasPrivateKey(user._id);
      let privateKey = keyExists ? getPrivateKey(user._id) : null;

      if (keyExists) {
        const validation = validatePrivateKey(privateKey);
        if (!validation.valid) {
          console.warn('⚠️ Stored private key invalid, regenerating…');
          clearPrivateKey(user._id);
          keyExists = false;
          privateKey = null;
        } else {
          if (!cancelled) {
            setHasKey(true);
            setIsReady(true);
          }
          return;
        }
      }

      if (!keyExists) {
        const restored = await restorePrivateKeyFromIndexedDB(user._id);
        if (restored) {
          if (!cancelled) {
            setHasKey(true);
            setIsReady(true);
          }
          console.log('✅ Private key restored from secure storage');
          return;
        }
      }

      if (!cancelled) {
        setHasKey(false);
        setIsReady(false);
      }

      await refreshPrivateKeyFromServer({ forceRegenerate: true, silent: true });
    };

    ensurePrivateKey();

    return () => {
      cancelled = true;
    };
  }, [user, refreshPrivateKeyFromServer]);

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
      privateKey = await restorePrivateKeyFromIndexedDB(user._id);
      if (!privateKey) {
        privateKey = await refreshPrivateKeyFromServer({ forceRegenerate: true, silent: false });
      } else {
        setHasKey(true);
        setIsReady(true);
      }
    }

    // If still no key, show plaintext instead of blocking UI with error banners
    if (!privateKey) {
      return message.content || message.body || message.fallbackContent || '';
    }

    // Attempt decryption (frontend service returns null on failure)
    const decrypted = decryptMessage(encryptionPayload, privateKey);
    if (decrypted === null) {
      // Decryption failed - silently use fallback content (backend keeps plaintext)
      const fallback = message.content || message.body || message.fallbackContent;
      if (fallback && fallback.trim() !== '') {
        // Successfully using fallback - no need to show errors
        console.log('📝 Using plaintext fallback for message');
        failureCountRef.current = 0;
        return fallback;
      }
      
      // Only try key refresh if we have no fallback content
      failureCountRef.current += 1;
      if (failureCountRef.current === 1 && !refreshInfoShownRef.current) {
        console.warn('⚠️ Decryption failed and no fallback available, refreshing keys...');
        refreshInfoShownRef.current = true;
      }

      const refreshedKey = await refreshPrivateKeyFromServer({ forceRegenerate: true, silent: true });
      if (refreshedKey) {
        const retry = decryptMessage(encryptionPayload, refreshedKey);
        if (retry !== null) {
          failureCountRef.current = 0;
          return retry;
        }
      }

      // Still failed - return whatever fallback we have
      return fallback || '[Unable to decrypt message]';
    }
    failureCountRef.current = 0;
    fallbackErrorShownRef.current = false;
    return decrypted;
  }, [user, refreshPrivateKeyFromServer]);

  return {
    isReady,
    hasKey,
    savePrivateKey,
    decryptReceivedMessage
  };
}
