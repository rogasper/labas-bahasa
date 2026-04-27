import { useState, useEffect, useCallback } from "react";
import { encryptText, decryptText } from "@/lib/crypto";

const STORAGE_KEY = "labas_api_key";

export interface StoredApiKey {
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  maxTokens?: number;
}

export function useApiKey() {
  const [storedKey, setStoredKey] = useState<StoredApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKey();
  }, []);

  const loadKey = async () => {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY);
      if (encrypted) {
        const decrypted = await decryptText(encrypted);
        setStoredKey(JSON.parse(decrypted));
      }
    } catch {
      // Invalid or corrupted data
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const saveKey = useCallback(async (key: StoredApiKey) => {
    const encrypted = await encryptText(JSON.stringify(key));
    localStorage.setItem(STORAGE_KEY, encrypted);
    setStoredKey(key);
  }, []);

  const removeKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStoredKey(null);
  }, []);

  return {
    storedKey,
    isLoading,
    saveKey,
    removeKey,
    hasKey: !!storedKey,
  };
}
