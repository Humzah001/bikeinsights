import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

/** PBKDF-style encoding: saltHex:hashHex */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, KEYLEN);
  return `${salt}:${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  try {
    const derived = scryptSync(plain, salt, KEYLEN);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
