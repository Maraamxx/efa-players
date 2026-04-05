// ── Shared constants used across the application ────────────────────────────

export const COUNTRIES = [
  { code: 'EG', name: 'Egypt' },       { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },         { code: 'QA', name: 'Qatar' },
  { code: 'MA', name: 'Morocco' },     { code: 'DZ', name: 'Algeria' },
  { code: 'TN', name: 'Tunisia' },     { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },       { code: 'CM', name: 'Cameroon' },
  { code: 'SN', name: 'Senegal' },     { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'SD', name: 'Sudan' },       { code: 'LY', name: 'Libya' },
  { code: 'JO', name: 'Jordan' },      { code: 'IQ', name: 'Iraq' },
  { code: 'KW', name: 'Kuwait' },      { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },        { code: 'LB', name: 'Lebanon' },
  { code: 'GB', name: 'England' },     { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },     { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },       { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'TR', name: 'Türkiye' },
  { code: 'BE', name: 'Belgium' },     { code: 'GR', name: 'Greece' },
  { code: 'AT', name: 'Austria' },     { code: 'CH', name: 'Switzerland' },
  { code: 'DK', name: 'Denmark' },     { code: 'NO', name: 'Norway' },
  { code: 'SE', name: 'Sweden' },      { code: 'CZ', name: 'Czechia' },
  { code: 'PL', name: 'Poland' },      { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },   { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },       { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'AU', name: 'Australia' },
] as const

export const countryName = (code: string) =>
  COUNTRIES.find(c => c.code === code)?.name ?? code

export const FLAG = (code: string) =>
  `https://flagcdn.com/20x15/${code.toLowerCase()}.png`

export const POS_FULL: Record<string, string> = {
  GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LWB', RWB: 'RWB',
  CDM: 'CDM', CM: 'CM', CAM: 'CAM', LM: 'LM', RM: 'RM',
  LW: 'LW', RW: 'RW', CF: 'CF', ST: 'ST',
}

export const POS_GROUP: Record<string, string> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD',
}

export const POSITIONS = [
  { value: 'GK',  label: 'GK',  group: 'Goalkeeper' },
  { value: 'CB',  label: 'CB',  group: 'Defence' },
  { value: 'LB',  label: 'LB',  group: 'Defence' },
  { value: 'RB',  label: 'RB',  group: 'Defence' },
  { value: 'LWB', label: 'LWB', group: 'Defence' },
  { value: 'RWB', label: 'RWB', group: 'Defence' },
  { value: 'CDM', label: 'CDM', group: 'Midfield' },
  { value: 'CM',  label: 'CM',  group: 'Midfield' },
  { value: 'CAM', label: 'CAM', group: 'Midfield' },
  { value: 'LM',  label: 'LM',  group: 'Midfield' },
  { value: 'RM',  label: 'RM',  group: 'Midfield' },
  { value: 'LW',  label: 'LW',  group: 'Forward' },
  { value: 'RW',  label: 'RW',  group: 'Forward' },
  { value: 'CF',  label: 'CF',  group: 'Forward' },
  { value: 'ST',  label: 'ST',  group: 'Forward' },
] as const

export const FOOT: Record<string, string> = {
  left: 'Left', right: 'Right', both: 'Both',
}

export const STATUSES = [
  { value: 'active',    label: 'Active'    },
  { value: 'inactive',  label: 'Inactive'  },
  { value: 'suspended', label: 'Suspended' },
] as const
