import { normalizePhoneDigits } from "@/lib/phone-normalize";

/** Validates name and phone when completing invite signup (values are chosen by the user, not matched to admin-entered contact info). */
export function validateInviteAcceptProfile(displayName: string, phone: string): string | null {
  const nameTrim = displayName.trim();
  const phoneDigits = normalizePhoneDigits(phone);
  if (!nameTrim || nameTrim.length < 2) {
    return "Enter your full name (at least 2 characters).";
  }
  if (phoneDigits.length < 8) {
    return "Enter a valid phone number (at least 8 digits).";
  }
  return null;
}
