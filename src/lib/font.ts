export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
export const LATIN_RE  = /[a-zA-Z]/

export function isArabic(text: string): boolean {
  if (!text) return false
  const a = (text.match(/[\u0600-\u06FF]/g) || []).length
  const l = (text.match(/[a-zA-Z]/g) || []).length
  return a > l
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
