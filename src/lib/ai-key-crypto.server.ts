// AES-GCM encryption for church AI keys (Web Crypto works on the Worker runtime).
async function key(): Promise<CryptoKey> {
  const raw = process.env["AI_KEY_ENCRYPTION_SECRET"];
  if (!raw) throw new Error("AI_KEY_ENCRYPTION_SECRET is not set");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (c) => String.fromCharCode(c)).join(""));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return toB64(out);
}

export async function decryptSecret(stored: string): Promise<string> {
  const buf = fromB64(stored);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, await key(), buf.subarray(12));
  return new TextDecoder().decode(pt);
}
