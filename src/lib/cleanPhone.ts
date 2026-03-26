/**
 * Strips everything except digits.
 */
export function cleanPhone(value: string): string {
  return value.replace(/[^\d]/g, '')
}

/**
 * Validates a phone number — must be 7–15 digits after cleaning.
 */
export function validatePhone(value: string): string | null {
  const cleaned = cleanPhone(value)
  if (!cleaned) return null
  if (cleaned.length < 7)  return 'Phone number too short (min 7 digits)'
  if (cleaned.length > 15) return 'Phone number too long (max 15 digits)'
  return null
}
