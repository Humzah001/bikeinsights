import { normalizePhoneDigits } from "@/lib/phone-normalize";

export function validateInviteeProfile(
  invite: { invitee_name: string; invitee_phone: string },
  displayName: string,
  phone: string
): string | null {
  const nameTrim = displayName.trim();
  const phoneDigits = normalizePhoneDigits(phone);
  const storedName = invite.invitee_name.trim();
  const storedPhoneDigits = normalizePhoneDigits(invite.invitee_phone);

  if (!nameTrim || nameTrim.length < 2) {
    return "Enter your full name (at least 2 characters).";
  }
  if (storedName.length >= 2 && nameTrim.toLowerCase() !== storedName.toLowerCase()) {
    return "Name does not match the invitation. Use the same name your administrator entered.";
  }
  if (phoneDigits.length < 8) {
    return "Enter a valid phone number (at least 8 digits).";
  }
  if (storedPhoneDigits.length >= 8 && phoneDigits !== storedPhoneDigits) {
    return "Phone number does not match the invitation.";
  }
  return null;
}
