// Single-password admin session. The cookie holds an HMAC derived from ADMIN_PASSWORD,
// so changing the password invalidates every session. Uses Web Crypto so it runs in middleware too.
export const ADMIN_COOKIE = "jc_admin";

async function hmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  return password ? hmac(password, "justcause-admin-session") : null;
}

export async function isAdminSession(cookieValue: string | undefined): Promise<boolean> {
  const expected = await sessionToken();
  if (!expected || !cookieValue || cookieValue.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ cookieValue.charCodeAt(i);
  return diff === 0;
}
