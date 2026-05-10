/** Raw invite tokens from platform-admin are 32 random bytes as hex (64 chars). */
export function isPlausibleInviteRawToken(raw: string): boolean {
  return /^[a-f0-9]{64}$/i.test(raw.trim());
}
