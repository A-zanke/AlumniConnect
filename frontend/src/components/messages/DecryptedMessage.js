import React, { useState, useEffect } from 'react';
import { FiLock } from 'react-icons/fi';

/**
 * Component that handles message decryption before displaying
 */
const DecryptedMessage = ({ message, decryptFunction, children }) => {
  const [decryptedContent, setDecryptedContent] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState(false);

  useEffect(() => {
    const decrypt = async () => {
      // If message is not encrypted, show original content
      if (!message.encrypted || !message.encryptionData) {
        setDecryptedContent(message.content || '');
        return;
      }

      setIsDecrypting(true);
      try {
        const decrypted = await decryptFunction(message);
        setDecryptedContent(decrypted);
        setDecryptionError(false);
      } catch (error) {
        console.error('Decryption failed:', error);
        setDecryptedContent('[Unable to decrypt message]');
        setDecryptionError(true);
      } finally {
        setIsDecrypting(false);
      }
    };

    decrypt();
  }, [message, decryptFunction]);

  // If message is still being decrypted, show loading state
  if (isDecrypting) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <FiLock size={14} className="animate-pulse" />
        <span className="text-sm italic">Decrypting...</span>
      </div>
    );
  }

  // If decryption failed, show error
  if (decryptionError) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <FiLock size={14} />
        <span className="text-sm italic">{decryptedContent}</span>
      </div>
    );
  }

  // Create a modified message object with decrypted content
  const decryptedMessage = {
    ...message,
    content: decryptedContent,
  };

  // Pass the decrypted message to children render function
  return typeof children === 'function' ? children(decryptedMessage) : children;
};

export default DecryptedMessage;
