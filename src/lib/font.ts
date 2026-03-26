export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
export const LATIN_RE  = /[a-zA-Z]/

export function isArabic(text: string): boolean {
  if (!text) return false
  const a = (text.match(/[\u0600-\u06FF]/g) || []).length
  const l = (text.match(/[a-zA-Z]/g) || []).length
  return a > l
}

export function fontFor(text: string): string {
  return isArabic(text) ? 'var(--amiri)' : 'var(--onest)'
}

export function dirFor(text: string): 'rtl' | 'ltr' {
  return isArabic(text) ? 'rtl' : 'ltr'
}

export function sizeFor(text: string, base = 13): number {
  return isArabic(text) ? base + 2 : base
}

/** All three at once — spread onto a style object */
export function textStyle(text: string, base = 13): React.CSSProperties {
  const arabic = isArabic(text)
  return {
    fontFamily: arabic ? 'var(--amiri)' : 'var(--onest)',
    fontSize:   arabic ? base + 2 : base,
    direction:  arabic ? 'rtl' : 'ltr',
  }
}

/** Strict email format check */
export function validateEmail(value: string): string | null {
  if (!value.trim()) return null
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(value.trim()) ? null : 'Enter a valid email address'
}

/** Egyptian national ID — exactly 14 digits */
export function validateNationalId(value: string): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return 'National ID must be exactly 14 digits'
  return null
}

/** Positive integer only */
export function toPositiveInt(value: string, max?: number): string {
  const n = value.replace(/[^\d]/g, '')
  if (max !== undefined && Number(n) > max) return String(max)
  return n
}

const _ARABIC_SIMPLE = /[\u0600-\u06FF]/
const _LATIN_SIMPLE  = /[a-zA-Z]/

export function enforceArabic(value: string): string | false {
  if (_LATIN_SIMPLE.test(value)) return false
  return value
}

export function enforceEnglish(value: string): string | false {
  if (_ARABIC_SIMPLE.test(value)) return false
  return value
}

export function isArabicText(value: string): boolean {
  return _ARABIC_SIMPLE.test(value) && !_LATIN_SIMPLE.test(value)
}