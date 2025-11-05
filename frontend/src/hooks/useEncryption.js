import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  initializeEncryption,
  encryptMessage,
  decryptMessage,
  getStoredKeys,
} from '../utils/encryption';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Custom hook for managing end-to-end encryption
 */
export function useEncryption(user) {
  const [isReady, setIsReady] = useState(false);
  const [keys, setKeys] = useState({ publicKey: null, privateKey: null });
  const [recipientPublicKeys, setRecipientPublicKeys] = useState({});

  // Initialize encryption for current user
  useEffect(() => {
    if (!user?._id) return;

    const initKeys = async () => {
      try {
        console.log('🔐 Initializing E2EE for user:', user._id);
        const result = await initializeEncryption(user._id);
        
        console.log('🔑 Keys loaded:', {
          hasPublicKey: !!result.publicKey,
          hasPrivateKey: !!result.privateKey,
          newKeys: result.newKeys
        });
        
        setKeys({
          publicKey: result.publicKey,
          privateKey: result.privateKey,
        });

        // If new keys were generated, upload public key to server
        if (result.newKeys) {
          console.log('📤 Uploading new public key to server...');
          const token = localStorage.getItem('token');
          await axios.put(
            `${baseURL}/api/users/encryption/public-key`,
            { publicKey: result.publicKey },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          console.log('✅ Public key uploaded successfully');
        }

        setIsReady(true);
        console.log('✅ E2EE ready!');
      } catch (error) {
        console.error('❌ E2EE initialization failed:', error);
        setIsReady(false);
      }
    };

    initKeys();
  }, [user]);

  // Fetch recipient's public key
  const getRecipientPublicKey = useCallback(async (recipientId) => {
    // Check cache first
    if (recipientPublicKeys[recipientId]) {
      return recipientPublicKeys[recipientId];
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${baseURL}/api/users/${recipientId}/public-key`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const publicKey = response.data.publicKey;
      if (publicKey) {
        // Cache the public key
        setRecipientPublicKeys((prev) => ({
          ...prev,
          [recipientId]: publicKey,
        }));
      }

      return publicKey;
    } catch (error) {
      console.error('Error fetching recipient public key:', error);
      return null;
    }
  }, [recipientPublicKeys]);

  // Encrypt a message for a recipient
  const encryptMessageForRecipient = useCallback(async (content, recipientId) => {
    if (!isReady) {
      console.warn('⚠️ Encryption not ready - keys still loading');
      return { content, encrypted: false };
    }
    
    if (!keys.publicKey || !keys.privateKey) {
      console.warn('⚠️ Missing encryption keys:', {
        hasPublicKey: !!keys.publicKey,
        hasPrivateKey: !!keys.privateKey
      });
      return { content, encrypted: false };
    }

    try {
      const recipientPublicKey = await getRecipientPublicKey(recipientId);
      
      if (!recipientPublicKey) {
        console.warn('⚠️ Recipient public key not available - recipient needs to log in first');
        return { content, encrypted: false };
      }

      const encrypted = await encryptMessage(content, recipientPublicKey);
      
      return {
        content: '', // Clear plain text content
        encrypted: true,
        encryptionData: encrypted,
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      return { content, encrypted: false };
    }
  }, [isReady, keys, getRecipientPublicKey]);

  // Decrypt a received message
  const decryptReceivedMessage = useCallback(async (message) => {
    if (!message.encrypted || !message.encryptionData) {
      console.log('Message not encrypted, returning plain content');
      return message.content || '';
    }

    if (!isReady || !keys.privateKey) {
      console.warn('⚠️ Decryption not ready - keys not loaded');
      return '[Encrypted message - keys not loaded]';
    }

    try {
      console.log('🔓 Attempting decryption with private key...');
      const decrypted = await decryptMessage(message.encryptionData, keys.privateKey);
      console.log('✅ Decryption successful:', decrypted?.substring(0, 30));
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      return '[Unable to decrypt message]';
    }
  }, [isReady, keys]);

  return {
    isReady,
    keys,
    encryptMessageForRecipient,
    decryptReceivedMessage,
    getRecipientPublicKey,
  };
}
