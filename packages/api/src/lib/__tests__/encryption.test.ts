import { describe, expect, it, beforeAll } from "bun:test";
import { encryptApiKey, decryptApiKey } from "../encryption";

const TEST_KEY = "test-encryption-key-1234567890abcd"; // 32+ chars
const TEST_PLAINTEXT = "sk-my-secret-api-key-abc123";

beforeAll(() => {
  process.env.API_KEY_ENCRYPTION_KEY = TEST_KEY;
});

describe("encryptApiKey / decryptApiKey", () => {
  it("round-trips a plaintext successfully", () => {
    const encrypted = encryptApiKey(TEST_PLAINTEXT);
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe("string");

    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(TEST_PLAINTEXT);
  });

  it("produces different ciphertext each call (uses random salt/iv)", () => {
    const result1 = encryptApiKey(TEST_PLAINTEXT);
    const result2 = encryptApiKey(TEST_PLAINTEXT);
    expect(result1).not.toBe(result2);
  });

  it("handles empty string", () => {
    const encrypted = encryptApiKey("");
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles special characters", () => {
    const special = "abc123!@#$%^&*()_+-=[]{}|;':\",./<>?`~你好日本語";
    const encrypted = encryptApiKey(special);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(special);
  });
});

describe("decryptApiKey — error handling", () => {
  it("throws on invalid format (not 4 parts)", () => {
    expect(() => decryptApiKey("invalid-format")).toThrow("Invalid encrypted API key format");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptApiKey(TEST_PLAINTEXT);
    const parts = encrypted.split(":");
    // Tamper the ciphertext part
    parts[3] = "tampered-data";
    const tampered = parts.join(":");
    expect(() => decryptApiKey(tampered)).toThrow();
  });
});
