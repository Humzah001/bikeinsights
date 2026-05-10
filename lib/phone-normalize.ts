/** Strip to digits only for comparing phone numbers across formats. */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}
