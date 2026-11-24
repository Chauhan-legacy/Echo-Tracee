/**
 * Device-Persistent Cryptographic Key Manager (Phase A)
 * Generates an ECDSA P-256 keypair once and persists it in IndexedDB.
 * The private key is non-extractable by design.
 * Provides public key fingerprinting and device key reset capabilities.
 */

const DB_NAME = 'echotrace_device_keystore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_PAIR_ID = 'device_signing_key_p256';

interface StoredKeyPair {
  id: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  createdAt: string;
}

let inMemoryFallbackKey: {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
} | null = null;

let lastStorageNotice: string | null = null;

export function getDeviceSecurityNotice(): string | null {
  if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'Web Crypto is restricted over insecure HTTP. In-memory temporary key active.';
  }
  return lastStorageNotice;
}

function openKeystoreDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Computes a human-readable 16-character hex fingerprint of a public key.
 */
export async function computeKeyFingerprint(publicKeyJwk: JsonWebKey): Promise<string> {
  const jsonStr = JSON.stringify({ x: publicKeyJwk.x, y: publicKeyJwk.y, crv: publicKeyJwk.crv });
  const data = new TextEncoder().encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  // Format as 4 groups of 4 hex: e.g., 7A3F-91C2-E4B8-0F1D
  return `${fullHex.slice(0, 4)}-${fullHex.slice(4, 8)}-${fullHex.slice(8, 12)}-${fullHex.slice(12, 16)}`;
}

/**
 * Gets the existing device keypair from IndexedDB or generates a new one.
 */
export async function getOrCreateDeviceKeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  try {
    const db = await openKeystoreDb();
    const stored = await new Promise<StoredKeyPair | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_PAIR_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (stored && stored.privateKey && stored.publicKeyJwk) {
      return {
        privateKey: stored.privateKey,
        publicKey: stored.publicKey,
        publicKeyJwk: stored.publicKeyJwk,
        fingerprint: stored.fingerprint,
      };
    }

    // Generate new non-extractable private key
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, // private key is NON-EXTRACTABLE
      ['sign']
    );

    // Export public key as JWK for verification
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const fingerprint = await computeKeyFingerprint(publicKeyJwk);

    const record: StoredKeyPair = {
      id: KEY_PAIR_ID,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyJwk,
      fingerprint,
      createdAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyJwk,
      fingerprint,
    };
  } catch (err) {
    lastStorageNotice = 'Notice: Local storage is restricted (private browsing). Device signing key stored in temporary memory for this session.';
    // Memory fallback if IndexedDB fails (e.g. private browsing or test environment)
    if (inMemoryFallbackKey) {
      return inMemoryFallbackKey;
    }
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const fingerprint = await computeKeyFingerprint(publicKeyJwk);
    inMemoryFallbackKey = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyJwk,
      fingerprint,
    };
    return inMemoryFallbackKey;
  }
}

/**
 * Signs data using the persistent device key.
 */
export async function signWithDeviceKey(dataUtf8: string): Promise<{
  signatureHex: string;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  const { privateKey, publicKeyJwk, fingerprint } = await getOrCreateDeviceKeyPair();
  const data = new TextEncoder().encode(dataUtf8);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );

  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    signatureHex,
    publicKeyJwk,
    fingerprint,
  };
}

/**
 * Resets the device key, generating a fresh keypair and new fingerprint.
 */
export async function resetDeviceKey(): Promise<string> {
  inMemoryFallbackKey = null;
  try {
    const db = await openKeystoreDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_PAIR_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}

  const fresh = await getOrCreateDeviceKeyPair();
  return fresh.fingerprint;
}
