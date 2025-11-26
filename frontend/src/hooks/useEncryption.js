import { useState, useEffect, useCallback, useRef } from "react";
import {
  storePrivateKey,
  getPrivateKey,
  decryptMessage,
  isEncrypted,
  hasPrivateKey,
  isValidEncryptionData,
  validatePrivateKey,
  clearPrivateKey,
  restorePrivateKeyFromIndexedDB,
} from "../services/encryptionService";
import { toast } from "react-toastify";

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
  const initialRefreshAttemptedRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const lastRefreshTimeRef = useRef(0);

  const refreshPrivateKeyFromServer = useCallback(
    async ({ forceRegenerate = false, silent = false } = {}) => {
      if (!user?._id) return null;

      // Throttle requests to prevent infinite loops
      const now = Date.now();
      if (now - lastRefreshTimeRef.current < 5000) {
        return null;
      }
      lastRefreshTimeRef.current = now;

      if (refreshInFlightRef.current && refreshPromiseRef.current) {
        try {
          return await refreshPromiseRef.current;
        } catch (error) {
          return null;
        }
      }

      const token = localStorage.getItem("token");
      if (!token) {
        if (!silent) {
          toast.error(
            "Cannot refresh encryption keys: missing authentication."
          );
        }
        return null;
      }

      const runRefresh = (async () => {
        try {
          if (!silent && !refreshInfoShownRef.current) {
            toast.info("Refreshing encryption keys…");
            refreshInfoShownRef.current = true;
          }

          // Clear existing key before regeneration as it is considered invalid
          const previousKey = getPrivateKey(user._id);
          clearPrivateKey(user._id);

          const axiosModule = await import("axios");
          const axiosInstance = axiosModule.default || axiosModule;
          const baseURL =
            process.env.REACT_APP_API_URL || "http://localhost:5000";
          const response = await axiosInstance.get(
            `${baseURL}/api/auth/profile`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: forceRegenerate ? { regenerateKeys: true } : {},
            }
          );

          const serverKey = response?.data?.encryptionKeys?.privateKey;
          if (serverKey) {
            storePrivateKey(user._id, serverKey);
            failureCountRef.current = 0;
            setHasKey(true);
            setIsReady(true);
            if (!silent) {
              toast.success("Encryption keys refreshed");
              refreshInfoShownRef.current = false;
            }
            return serverKey;
          }

          // Server did not provide a key – restore previous key so user is not locked out
          if (previousKey) {
            storePrivateKey(user._id, previousKey);
          }
          if (!silent) {
            toast.warn("Server did not issue a new encryption key.");
          }
          return null;
        } catch (error) {
          console.warn(
            "Failed to refresh encryption keys:",
            error?.message || error
          );
          if (!silent) {
            toast.error("Failed to refresh encryption keys. Please try again.");
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
        initialRefreshAttemptedRef.current = false;
        currentUserIdRef.current = null;
        return;
      }

      // Prevent re-running for the same user
      if (currentUserIdRef.current === user._id) {
        console.log(
          "✅ useEncryption: Skipping - already processed user",
          user._id
        );
        return;
      }

      console.log("🔐 useEncryption: Processing user", user._id);
      currentUserIdRef.current = user._id;
      initialRefreshAttemptedRef.current = false;

      let keyExists = hasPrivateKey(user._id);
      let privateKey = keyExists ? getPrivateKey(user._id) : null;

      if (keyExists) {
        const validation = validatePrivateKey(privateKey);
        if (!validation.valid) {
          console.warn("⚠️ Stored private key invalid, clearing…");
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
          console.log("✅ Private key restored from secure storage");
          return;
        }
      }

      // No key found - set ready but flag that key is not available
      // Messages will display with fallback content (plaintext)
      // User can request key refresh if needed later
      if (!cancelled) {
        setHasKey(false);
        setIsReady(true); // CHANGED: Set to true so messages display immediately
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
  const savePrivateKey = useCallback(
    (privateKeyPem) => {
      if (!user?._id) return;

      storePrivateKey(user._id, privateKeyPem);
      setHasKey(true);
      setIsReady(true);
      console.log("✅ Private key saved successfully");
    },
    [user]
  );

  /**
   * Decrypt a received message
   * @param {Object} message - Message object with encryptionData
   * @returns {string} Decrypted message or original content
   */
  const decryptReceivedMessage = useCallback(
    async (message) => {
      // If not encrypted, just return original content
      if (!isEncrypted(message)) {
        return message.content || "";
      }

      // Choose the best encryption payload: sender copy when available
      const encryptionPayload = isValidEncryptionData(message.encryptionData)
        ? message.encryptionData
        : isValidEncryptionData(message.senderEncryptionData)
        ? message.senderEncryptionData
        : null;

      if (!encryptionPayload) {
        console.warn(
          "⚠️ Encrypted flag set but encryption data incomplete. Falling back to plaintext."
        );
        // CRITICAL: Return fallbackContent first if available
        if (message.fallbackContent && message.fallbackContent.trim() !== "") {
          return message.fallbackContent;
        }
        if (message.content && message.content.trim() !== "") {
          return message.content;
        }
        if (message.body && message.body.trim() !== "") {
          return message.body;
        }
        return "[Decryption Key Unavailable]";
      }

      if (!user?._id) {
        console.warn("⚠️ Cannot decrypt - no user ID");
        // CRITICAL: Return fallbackContent first if available
        if (message.fallbackContent && message.fallbackContent.trim() !== "") {
          return message.fallbackContent;
        }
        if (message.content && message.content.trim() !== "") {
          return message.content;
        }
        if (message.body && message.body.trim() !== "") {
          return message.body;
        }
        return "[Decryption Key Unavailable]";
      }

      // Get private key from local storage/IndexedDB ONLY (no automatic server refresh)
      let privateKey = getPrivateKey(user._id);

      if (!privateKey) {
        privateKey = await restorePrivateKeyFromIndexedDB(user._id);
        if (privateKey) {
          setHasKey(true);
          setIsReady(true);
        }
      }

      // If still no key, fall back to plaintext instead of hitting the server
      if (!privateKey) {
        console.warn(
          "⚠️ Private key not available for decryption. Using fallback content."
        );
        // CRITICAL: Return fallbackContent first if available
        if (message.fallbackContent && message.fallbackContent.trim() !== "") {
          return message.fallbackContent;
        }
        if (message.content && message.content.trim() !== "") {
          return message.content;
        }
        if (message.body && message.body.trim() !== "") {
          return message.body;
        }
        return "[Decryption Key Unavailable]";
      }

      // Attempt decryption (frontend service returns null on failure)
      const decrypted = decryptMessage(encryptionPayload, privateKey);
      if (decrypted === null) {
        // Decryption failed - CRITICALLY prioritize fallback content (backend keeps plaintext)
        console.warn(
          "⚠️ Decryption failed. Attempting to use fallback content."
        );

        if (message.fallbackContent && message.fallbackContent.trim() !== "") {
          // Successfully using fallback - no need to show errors
          console.log("📝 Using plaintext fallback for message");
          failureCountRef.current = 0;
          return message.fallbackContent;
        }

        if (message.content && message.content.trim() !== "") {
          console.log("📝 Using content field as fallback");
          failureCountRef.current = 0;
          return message.content;
        }

        if (message.body && message.body.trim() !== "") {
          console.log("📝 Using body field as fallback");
          failureCountRef.current = 0;
          return message.body;
        }

        // Still failed - return visible error message instead of empty string
        console.error("❌ No fallback content available for encrypted message");
        return "[Decryption Key Unavailable]";
      }
      failureCountRef.current = 0;
      fallbackErrorShownRef.current = false;
      return decrypted;
    },
    [user]
  );

  return {
    isReady,
    hasKey,
    savePrivateKey,
    decryptReceivedMessage,
  };
}
