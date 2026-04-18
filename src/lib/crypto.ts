// AES-GCM 256 symmetric encryption for refresh tokens.
// Works on Bun and Cloudflare Workers via Web Crypto API.
//
// Key must be 32 bytes, provided as base64 (standard or base64url) in GOOGLE_MEETING_OAUTH_ENC_KEY.
// Generate with: `openssl rand -base64 32`

const IV_LENGTH = 12; // AES-GCM recommended

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = b64urlDecode(keyB64);
  if (raw.length !== 32) {
    throw new Error(`GOOGLE_MEETING_OAUTH_ENC_KEY must decode to 32 bytes, got ${raw.length}`);
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc)
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return b64urlEncode(out);
}

export async function decryptSecret(cipherB64: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const raw = b64urlDecode(cipherB64);
  const iv = raw.slice(0, IV_LENGTH);
  const ct = raw.slice(IV_LENGTH);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// HMAC-SHA256 signer for OAuth state cookie (reuses GOOGLE_MEETING_OAUTH_ENC_KEY).
export async function signState(payload: string, keyB64: string): Promise<string> {
  const raw = b64urlDecode(keyB64);
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifyState(signed: string, keyB64: string): Promise<string | null> {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = signed.slice(0, dot);
  const expected = await signState(payload, keyB64);
  return expected === signed ? payload : null;
}
