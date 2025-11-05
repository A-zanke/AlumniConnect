import React, { useState, useEffect } from 'react';
import { FiShield, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';

/**
 * Debug panel for E2EE encryption status
 * Add this temporarily to MessagesPage to debug encryption
 * Remove after encryption is working
 */
const E2EEDebugPanel = ({ encryptionReady, keys, user }) => {
  const [localStorageKeys, setLocalStorageKeys] = useState(null);
  const [recipientKeys, setRecipientKeys] = useState({});

  useEffect(() => {
    if (user?._id) {
      const publicKey = localStorage.getItem(`e2ee_public_${user._id}`);
      const privateKey = localStorage.getItem(`e2ee_private_${user._id}`);
      setLocalStorageKeys({
        publicKey: publicKey ? publicKey.substring(0, 50) + '...' : null,
        privateKey: privateKey ? privateKey.substring(0, 50) + '...' : null,
      });
    }
  }, [user]);

  const clearKeys = () => {
    if (user?._id && window.confirm('Clear encryption keys? You will need to refresh the page.')) {
      localStorage.removeItem(`e2ee_public_${user._id}`);
      localStorage.removeItem(`e2ee_private_${user._id}`);
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-indigo-500 rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-indigo-600 flex items-center gap-2">
          <FiShield size={20} />
          E2EE Debug Panel
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        {/* Encryption Ready Status */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Encryption Ready:</span>
          <span className={`flex items-center gap-1 ${encryptionReady ? 'text-green-600' : 'text-red-600'}`}>
            {encryptionReady ? <FiCheck /> : <FiX />}
            {encryptionReady ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Has Public Key */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Has Public Key:</span>
          <span className={`flex items-center gap-1 ${keys?.publicKey ? 'text-green-600' : 'text-red-600'}`}>
            {keys?.publicKey ? <FiCheck /> : <FiX />}
            {keys?.publicKey ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Has Private Key */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Has Private Key:</span>
          <span className={`flex items-center gap-1 ${keys?.privateKey ? 'text-green-600' : 'text-red-600'}`}>
            {keys?.privateKey ? <FiCheck /> : <FiX />}
            {keys?.privateKey ? 'Yes' : 'No'}
          </span>
        </div>

        {/* User ID */}
        <div className="border-t pt-2 mt-2">
          <span className="font-medium">User ID:</span>
          <div className="text-xs text-gray-600 break-all">{user?._id || 'N/A'}</div>
        </div>

        {/* LocalStorage Keys */}
        {localStorageKeys && (
          <div className="border-t pt-2 mt-2">
            <span className="font-medium">LocalStorage:</span>
            <div className="text-xs">
              <div className={localStorageKeys.publicKey ? 'text-green-600' : 'text-red-600'}>
                Public: {localStorageKeys.publicKey || 'Not found'}
              </div>
              <div className={localStorageKeys.privateKey ? 'text-green-600' : 'text-red-600'}>
                Private: {localStorageKeys.privateKey || 'Not found'}
              </div>
            </div>
          </div>
        )}

        {/* Web Crypto Support */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Web Crypto API:</span>
          <span className={`flex items-center gap-1 ${window.crypto?.subtle ? 'text-green-600' : 'text-red-600'}`}>
            {window.crypto?.subtle ? <FiCheck /> : <FiX />}
            {window.crypto?.subtle ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {/* Actions */}
        <div className="border-t pt-2 mt-2 flex gap-2">
          <button
            onClick={clearKeys}
            className="flex-1 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center justify-center gap-1"
          >
            <FiRefreshCw size={14} />
            Reset Keys
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center justify-center gap-1"
          >
            <FiRefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Instructions */}
        <div className="border-t pt-2 mt-2 text-xs text-gray-600">
          <strong>Debug Steps:</strong>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>Check console for [E2EE] logs</li>
            <li>Ensure both users are logged in</li>
            <li>Wait 3 seconds after login</li>
            <li>All checks above should be green</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default E2EEDebugPanel;
