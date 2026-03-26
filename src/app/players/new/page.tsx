'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Club, League, FieldSchema, Position, PlayerStatus, FieldTarget } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'
import { isArabic, ARABIC_RE, LATIN_RE } from '@/lib/font'
import { DynamicFieldInput } from '@/components/DynamicFieldInput'
// ── types ─────────────────────────────────────────────────────────────────────

interface Nationality {
  countryCode: string
  isPrimary: boolean
  passportNumber: string
}

interface FormData {
  // step 1 — personal
  nameEn: string
  nameAr: string
  birthdate: string
  status: PlayerStatus
  idNumber: string
  // hasPassport and passportNumber removed — passport lives per nationality
  photoFile: File | null
  photoPreview: string | null

  // step 2 — career & physical
  position: Position | ''

  preferredFoot: 'left' | 'right' | 'both' | ''
  height: string
  currentClubId: string
  currentLeagueId: string
  contractStart: string
  contractEnd: string

  // step 3 — nationalities
  nationalities: Nationality[]

  // step 4 — contact
  fatherName: string
  fatherPhone: string
  fatherEmail: string

  // step 5 — additional
  strengths: string[]
  weaknesses: string[]
  dynamicFields: Record<string, string>
}

const EMPTY: FormData = {
  nameEn: '', nameAr: '', birthdate: '', status: 'active',
  idNumber: '',
  photoFile: null, photoPreview: null,
  position: '', preferredFoot: '', height: '',
  currentClubId: '', currentLeagueId: '', contractStart: '', contractEnd: '',
  nationalities: [{ countryCode: 'EG', isPrimary: true, passportNumber: '' }],
  fatherName: '', fatherPhone: '', fatherEmail: '',
  strengths: [], weaknesses: [], dynamicFields: {},
}

const STEPS = [
  { label: 'Personal',          desc: 'Names, birthdate, ID, photo'          },
  { label: 'Career & Physical', desc: 'Position, club, contract, stats'       },
  { label: 'Nationalities',     desc: 'Up to 4 nationalities'                },
  { label: 'Contact',           desc: 'Guardian information'                  },
  { label: 'Additional',        desc: 'Strengths, weaknesses, custom fields'  },
]

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'GK',  label: 'Goalkeeper' },
  { value: 'DEF', label: 'Defender'   },
  { value: 'MID', label: 'Midfielder' },
  { value: 'FWD', label: 'Forward'    },
]

const COUNTRIES = [
  { code: 'EG', name: 'Egypt'   }, { code: 'NG', name: 'Nigeria'  },
  { code: 'MA', name: 'Morocco' }, { code: 'DZ', name: 'Algeria'  },
  { code: 'TN', name: 'Tunisia' }, { code: 'SD', name: 'Sudan'    },
  { code: 'GH', name: 'Ghana'   }, { code: 'CM', name: 'Cameroon' },
  { code: 'CI', name: "Côte d'Ivoire" }, { code: 'SN', name: 'Senegal' },
]

const FLAG = (code: string) => `https://flagcdn.com/20x15/${code.toLowerCase()}.png`

function ageGroup(birthdate: string): number | null {
  if (!birthdate) return null
  return new Date(birthdate).getFullYear()
}

// ── shared field components ───────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{
      fontFamily: 'var(--onest)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '.06em',
      textTransform: 'uppercase' as const,
      color: 'var(--t3)',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    }}>
      {children}
      {required && <span style={{ color: 'var(--red)' }}>*</span>}
    </div>
  )
}

const Input = ({
  value, onChange, placeholder, type = 'text', lang,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  lang?: 'ar' | 'en'
}) => {
  const [focused, setFocused] = useState(false)
  const isAr = lang === 'ar'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (type === 'tel') { onChange(v.replace(/[^\d]/g, '')); return }
    if (lang === 'ar' && /[a-zA-Z]/.test(v)) return
    if (lang === 'en' && /[\u0600-\u06FF]/.test(v)) return
    onChange(v)
  }

  return (
    <input
      type={type === 'tel' ? 'text' : type}
      inputMode={type === 'tel' ? 'numeric' as const : undefined}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', height: 38,
        border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
        borderRadius: 'var(--r)', background: 'var(--bg)',
        fontFamily: isAr ? 'var(--amiri)' : 'var(--onest)',
        fontSize: isAr ? 16 : 13,
        color: 'var(--t1)', padding: '0 12px', outline: 'none',
        direction: isAr ? 'rtl' : 'ltr',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s',
      }}
    />
  )
}

function Select({
  value, onChange, children, placeholder
}: {
  value: string; onChange: (v: string) => void
  children: React.ReactNode; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', height: 38,
        border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
        borderRadius: 'var(--r)', background: 'var(--bg)',
        fontFamily: 'var(--onest)', fontSize: 13,
        color: value ? 'var(--t1)' : 'var(--t3)',
        padding: '0 12px', outline: 'none', cursor: 'pointer',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--red)' : 'var(--s3)',
          border: `1px solid ${checked ? 'var(--red)' : 'var(--border2)'}`,
          transition: 'all .2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2,
          left: checked ? 17 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--t4)',
          transition: 'left .2s',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
        {label}
      </span>
    </label>
  )
}

function TagInput({
  tags, onChange, placeholder, variant
}: {
  tags: string[]; onChange: (tags: string[]) => void
  placeholder: string; variant: 'strength' | 'weakness'
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag))

  const isStrength = variant === 'strength'
  const tagStyle = {
    fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500,
    padding: '3px 8px', borderRadius: 3,
    background: isStrength ? 'var(--greenDim)' : 'var(--redDim)',
    border: `1px solid ${isStrength ? 'rgba(22,163,74,.2)' : 'var(--redBorder)'}`,
    color: isStrength ? 'var(--green)' : 'var(--red)',
    display: 'flex', alignItems: 'center', gap: 5,
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
        borderRadius: 'var(--r)', padding: '6px 10px',
        background: 'var(--bg)', display: 'flex', flexWrap: 'wrap' as const,
        gap: 5, minHeight: 42, alignItems: 'center', cursor: 'text',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s',
      }}
    >
      {tags.map(tag => (
        <span key={tag} style={tagStyle}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isStrength ? 'var(--green)' : 'var(--red)', flexShrink: 0, display: 'inline-block' }} />
          {tag}
          <span
            onClick={e => { e.stopPropagation(); remove(tag) }}
            style={{ opacity: .6, cursor: 'pointer', fontSize: 10, marginLeft: 2 }}
          >
            ✕
          </span>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (input.trim()) add() }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1])
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)',
          background: 'transparent', border: 'none', outline: 'none',
          minWidth: 100, flex: 1,
        }}
      />
    </div>
  )
}

// ── nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      height: 50, background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
        <img src="/efa-logo.png" alt="EFA" style={{ height: 32, width: 32, objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: 'var(--bebas)', fontSize: 15, letterSpacing: '.18em', color: 'var(--t1)' }}>EFA PLAYERS</span>
          <span style={{ fontFamily: 'var(--onest)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)' }}>PLAYER MANAGEMENT</span>
        </div>
      </div>
      {['Players', 'Clubs', 'Leagues', 'Users', 'Audit'].map(n => (
        <div key={n} style={{
          fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.12em',
          color: n === 'Players' ? 'var(--t1)' : 'var(--t3)', padding: '5px 14px', cursor: 'pointer',
        }}>{n}</div>
      ))}
    </nav>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function NewPlayerPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [done, setDone] = useState<boolean[]>([false, false, false, false, false])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clubs, setClubs]     = useState<Club[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [schemas, setSchemas] = useState<FieldSchema[]>([])
  const [allPlayerSchemas, setAllPlayerSchemas] = useState<FieldSchema[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/clubs').then(r => r.json()),
      fetch('/api/leagues').then(r => r.json()),
      fetch('/api/field-schemas?target=player').then(r => r.json()),
    ]).then(([clubsData, leaguesData, schemasData]) => {
      setClubs(clubsData)
      setLeagues(leaguesData)
      setSchemas(schemasData)
      setAllPlayerSchemas(schemasData)
    })
  }, [])

const set = (key: keyof FormData, value: any) => {
  setForm(f => ({ ...f, [key]: value }))
  setErrors(e => {
    const next = { ...e }
    delete next[key]
    return next
  })
}

  // ── validation ──
  const validate = (s: number): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
if (s === 0) {
  if (!form.nameEn.trim())   e.nameEn    = 'Required'
  if (!form.nameAr.trim())   e.nameAr    = 'Required'
  if (!form.birthdate)       e.birthdate = 'Required'
  if (!form.idNumber.trim()) e.idNumber  = 'Required'
  if (form.idNumber && form.idNumber.length !== 14) e.idNumber = 'Must be 14 digits'
}
    if (s === 1) {
      if (!form.position)       e.position        = 'Required'
      if (!form.preferredFoot)  e.preferredFoot   = 'Required'
      if (!form.height)         e.height          = 'Required'
      if (!form.currentClubId)  e.currentClubId   = 'Required'
      if (!form.currentLeagueId) e.currentLeagueId = 'Required'
    }
    if (s === 2) {
      if (form.nationalities.length === 0) e.nationalities = 'At least one nationality required'
    }
    if (s === 3) {
      if (!form.fatherName.trim())  e.fatherName  = 'Required'
      if (!form.fatherPhone.trim()) e.fatherPhone = 'Required'
      if (form.fatherEmail.trim()) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRe.test(form.fatherEmail.trim())) {
          e.fatherEmail = 'Enter a valid email address'
        }
      }
      if (form.fatherPhone && form.fatherPhone.length < 7) {
        e.fatherPhone = 'Phone number too short (min 7 digits)'
      }
    }
    if (s === 4) {
  schemas
    .filter(schema => schema.isRequired && schema.entityTarget === 'player')
    .forEach(schema => {
      const val = form.dynamicFields[schema.id]
      if (!val || (typeof val === 'string' && !val.trim())) {
        errors[`dynamic_${schema.id}`] = `${schema.label.en} is required`
      }
    })
}
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate(step)) return
    setDone(d => { const n = [...d]; n[step] = true; return n })
    setStep(s => Math.min(STEPS.length - 1, s + 1))
  }

  const back = () => setStep(s => Math.max(0, s - 1))

  const goTo = (s: number) => {
    if (s < step || done[s - 1] || s === 0) setStep(s)
  }


  // ── photo drop ──
  const dropRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => set('photoPreview', e.target?.result as string)
    reader.readAsDataURL(file)
    set('photoFile', file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  // ── submit ──
  const submit = async () => {
    if (!validate(4)) return
    setSaving(true)
const payload = {
  name: { en: form.nameEn, ar: form.nameAr },
  birthdate: form.birthdate,
  ageGroup: ageGroup(form.birthdate),
  status: form.status,
  idNumber: form.idNumber,
  passportNumber: null, // passport is per-nationality now
  photoUrl: form.photoPreview,
  position: form.position,

  preferredFoot: form.preferredFoot,
  height: Number(form.height),
  currentClubId: form.currentClubId || null,
  currentLeagueId: form.currentLeagueId || null,
  nationalities: form.nationalities,
  fatherName: form.fatherName,
  fatherPhone: form.fatherPhone,
  fatherEmail: form.fatherEmail || null,
  strengths: form.strengths,
  weaknesses: form.weaknesses,
  clubHistory: [],
  dynamicFieldValues: Object.entries(form.dynamicFields)
    .map(([k, v]) => ({ fieldSchemaId: k, value: v })),
}
const res = await apiFetch('/api/players', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const created = await res.json()

setSaving(false)
router.push(`/players/${created.id}`)
  }

  // ── styles ──
  const card = {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--r)', overflow: 'hidden' as const,
  }
  const sectionTitle = {
    fontFamily: 'var(--onest)', fontSize: 18, fontWeight: 800,
    letterSpacing: '-.01em', color: 'var(--t1)', marginBottom: 4,
  }
  const sectionSub = {
    fontFamily: 'var(--onest)', fontSize: 13,
    color: 'var(--t3)', marginBottom: 28,
  }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' } as const
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 20px' } as const
  const fieldWrap = { display: 'flex', flexDirection: 'column' as const }
  const err = (key: keyof FormData) => errors[key]
    ? <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{errors[key]}</div>
    : null

  const renderSectionFields = (section: string) => {
    const sectionSchemas = allPlayerSchemas.filter(s => s.section === section)
    if (sectionSchemas.length === 0) return null
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 10, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
          Custom Fields
        </div>
        <div className="wizard-form-grid2">
          {sectionSchemas.map(schema => (
            <div key={schema.id} style={fieldWrap}>
              <FieldLabel required={schema.isRequired}>{schema.label.en}</FieldLabel>
              <DynamicFieldInput
                schema={schema}
                value={form.dynamicFields[schema.id] ?? ''}
                onChange={v => set('dynamicFields', { ...form.dynamicFields, [schema.id]: v })}
              />
              {errors[`dynamic_${schema.id}`] && (
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                  {errors[`dynamic_${schema.id}`]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <Nav />

      {/* page header */}
      <div className="page-header" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.14em', color: 'var(--t3)', marginBottom: 8, display: 'flex', gap: 8 }}>
          <Link href="/players" style={{ color: 'var(--t3)', textDecoration: 'none' }}>PLAYERS</Link>
          <span style={{ opacity: .3 }}>/</span>
          <span style={{ color: 'var(--t2)' }}>ADD NEW PLAYER</span>
        </div>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1 }}>
          Add New Player
        </div>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
          Fill in the details across all sections
        </div>
      </div>

      {/* wizard */}
      <div className="wizard-layout">

        {/* sidebar */}
        <div className="wizard-sidebar">
          {STEPS.map((s, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '12px 24px', cursor: i < step || done[i - 1] || i === 0 ? 'pointer' : 'default',
                background: step === i ? 'rgba(200,16,46,.06)' : 'transparent',
                position: 'relative', transition: 'background .12s',
              }}
            >
              {/* connector line */}
              {i < STEPS.length - 1 && (
                <div className="wizard-step-conn" style={{
                  background: done[i] ? 'var(--green)' : 'var(--border)',
                  transition: 'background .3s',
                }} />
              )}
              {/* step number */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--onest)', fontSize: done[i] ? 14 : 13,
                border: '1px solid',
                borderColor: step === i ? 'var(--red)' : done[i] ? 'var(--green)' : 'var(--border2)',
                background: step === i ? 'var(--red)' : done[i] ? 'var(--green)' : 'var(--bg2)',
                color: step === i || done[i] ? '#fff' : 'var(--t3)',
                transition: 'all .2s',
              }}>
                {done[i] ? '✓' : i + 1}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.1em',
                  color: step === i ? 'var(--red)' : done[i] ? 'var(--t2)' : 'var(--t3)',
                  marginTop: 4, lineHeight: 1, transition: 'color .15s',
                }}>
                  {s.label.toUpperCase()}
                </div>
                <div className="wizard-step-desc" style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* form area */}
        <div className="wizard-form">

          {/* ── STEP 1 — PERSONAL ── */}
          {step === 0 && (
            <div>
              <div style={sectionTitle}>Personal Information</div>
              <div style={sectionSub}>Basic identification details for the player</div>

              {/* photo upload */}
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>PLAYER PHOTO</FieldLabel>
                <div
                  ref={dropRef}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--red)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r)', background: dragging ? 'var(--redDim)' : form.photoPreview ? 'var(--bg)' : 'var(--bg3)',
                    cursor: 'pointer', transition: 'all .15s', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: form.photoPreview ? 140 : 100,
                  }}
                >
                  {form.photoPreview ? (
                    <div style={{ position: 'relative', padding: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <img src={form.photoPreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                      <div>
                        <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{form.photoFile?.name}</div>
                        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
                          {form.photoFile ? (form.photoFile.size / 1024).toFixed(0) + ' KB' : ''} · Click to replace
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 22, letterSpacing: '.04em', color: 'var(--t4)', marginBottom: 6 }}>
                        ↑
                      </div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.12em', color: 'var(--t3)' }}>
                        DRAG & DROP OR CLICK TO UPLOAD
                      </div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>
                        JPG, PNG — max 5 MB
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>

              <div className="wizard-form-grid2" style={{ marginBottom: 16 }}>
                <div style={fieldWrap}>
                  <FieldLabel required>FULL NAME (ENGLISH)</FieldLabel>
                  <Input
                    value={form.nameEn}
                    onChange={v => set('nameEn', v)}
                    placeholder="e.g. Mohamed Ibrahim"
                    lang="en"
                  />
                  {err('nameEn')}
                </div>

                <div style={fieldWrap}>
                  <FieldLabel required>FULL NAME (ARABIC)</FieldLabel>
                  <Input
                    value={form.nameAr}
                    onChange={v => set('nameAr', v)}
                    placeholder="الاسم بالعربية"
                    lang="ar"
                  />
                  {err('nameAr')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>DATE OF BIRTH</FieldLabel>
                  <Input value={form.birthdate} onChange={v => set('birthdate', v)} type="date" />
                  {form.birthdate && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Age group: {ageGroup(form.birthdate)}</div>}
                  {err('birthdate')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>STATUS</FieldLabel>
                  <Select value={form.status} onChange={v => set('status', v as PlayerStatus)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>NATIONAL ID</FieldLabel>
                  <Input value={form.idNumber} onChange={v => set('idNumber', v.replace(/\D/g,'').slice(0,14))}
                    placeholder="14-digit national ID"
                    type="tel" />
                  {err('idNumber')}
                </div>
              </div>
              {renderSectionFields('personal')}
            </div>
          )}

          {/* ── STEP 2 — CAREER & PHYSICAL ── */}
          {step === 1 && (
            <div>
              <div style={sectionTitle}>Career & Physical</div>
              <div style={sectionSub}>Position, club assignment, and contract details</div>

              <div className="wizard-form-grid2" style={{ marginBottom: 16 }}>
                <div style={fieldWrap}>
                  <FieldLabel required>POSITION</FieldLabel>
                  <Select value={form.position} onChange={v => set('position', v as Position)} placeholder="Select position">
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                  {err('position')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>PREFERRED FOOT</FieldLabel>
                  <Select value={form.preferredFoot} onChange={v => set('preferredFoot', v as any)} placeholder="Select foot">
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                    <option value="both">Both</option>
                  </Select>
                  {err('preferredFoot')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>HEIGHT (CM)</FieldLabel>
                  <Input value={form.height} onChange={v => set('height', v.replace(/\D/g,'').slice(0,3))} placeholder="e.g. 178" type="tel" />
                  {err('height')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>CURRENT CLUB</FieldLabel>
                  <Select value={form.currentClubId} onChange={v => set('currentClubId', v)} placeholder="Select club">
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name.en}</option>)}
                  </Select>
                  {err('currentClubId')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>CURRENT LEAGUE</FieldLabel>
                  <Select value={form.currentLeagueId} onChange={v => set('currentLeagueId', v)} placeholder="Select league">
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name.en}</option>)}
                  </Select>
                  {err('currentLeagueId')}
                </div>
              </div>

              {/* contract section */}
              <div style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 'var(--r)', padding: '16px 18px', marginTop: 8,
              }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.14em', color: 'var(--t3)', marginBottom: 14 }}>
                  CONTRACT DETAILS
                </div>
                <div className="wizard-form-grid2">
                  <div style={fieldWrap}>
                    <FieldLabel>CONTRACT START</FieldLabel>
                    <Input value={form.contractStart} onChange={v => set('contractStart', v)} type="date" />
                  </div>
                  <div style={fieldWrap}>
                    <FieldLabel>CONTRACT END</FieldLabel>
                    <Input value={form.contractEnd} onChange={v => set('contractEnd', v)} type="date" />
                  </div>
                </div>
              </div>
              {renderSectionFields('career')}
            </div>
          )}

          {/* ── STEP 3 — NATIONALITIES ── */}
          {step === 2 && (
            <div>
              <div style={sectionTitle}>Nationalities</div>
              <div style={sectionSub}>A player can hold up to 4 nationalities. Egyptian nationality is always primary.</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.nationalities.map((nat, i) => {
                  const isEgyptian = i === 0
                  return (
                  <div key={i} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r)', padding: '14px 16px',
                    borderLeft: nat.isPrimary ? '3px solid var(--red)' : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {/* country */}
                      <div style={{ flex: 1 }}>
                        <FieldLabel required>COUNTRY</FieldLabel>
                        {isEgyptian ? (
                          <div style={{ height: 38, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)' }}>
                            <img src={FLAG('EG')} alt="EG" style={{ borderRadius: 2 }} />
                            Egypt
                          </div>
                        ) : (
                          <Select
                            value={nat.countryCode}
                            onChange={v => {
                              const updated = [...form.nationalities]
                              updated[i] = { ...updated[i], countryCode: v }
                              set('nationalities', updated)
                            }}
                          >
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                          </Select>
                        )}
                      </div>
                      {/* flag preview */}
                      {!isEgyptian && (
                        <div style={{ paddingTop: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <img src={FLAG(nat.countryCode)} alt={nat.countryCode} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />
                        </div>
                      )}
                      {/* primary badge (non-interactive) */}
                      <div style={{ paddingTop: isEgyptian ? 0 : 20 }}>
                        <span style={{
                          fontFamily: 'var(--onest)', fontSize: 10, letterSpacing: '.1em',
                          padding: '4px 10px', borderRadius: 3,
                          border: `1px solid ${nat.isPrimary ? 'var(--red)' : 'var(--border2)'}`,
                          background: nat.isPrimary ? 'var(--redDim)' : 'transparent',
                          color: nat.isPrimary ? 'var(--red)' : 'var(--t3)',
                          display: 'inline-block',
                        }}>
                          {nat.isPrimary ? '★ PRIMARY' : 'SECONDARY'}
                        </span>
                      </div>
                      {/* remove — only for non-Egyptian rows */}
                      {!isEgyptian && (
                        <div style={{ paddingTop: 20 }}>
                          <button
                            onClick={() => set('nationalities', form.nationalities.filter((_, j) => j !== i))}
                            style={{
                              fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.08em',
                              color: 'var(--t3)', cursor: 'pointer', background: 'transparent',
                              border: 'none', padding: '4px 8px',
                            }}
                          >
                            REMOVE
                          </button>
                        </div>
                      )}
                    </div>
                    {/* passport per nationality */}
                    <div style={fieldWrap}>
                      <FieldLabel>
                        PASSPORT NUMBER
                        <span style={{
                          fontFamily: 'var(--onest)', fontSize: 10,
                          fontWeight: 400, color: 'var(--t3)',
                          textTransform: 'none' as const, letterSpacing: 0,
                        }}>
                          (optional)
                        </span>
                      </FieldLabel>
                      <Input
                        value={nat.passportNumber}
                        onChange={v => {
                          const updated = [...form.nationalities]
                          updated[i] = { ...updated[i], passportNumber: v.toUpperCase() }
                          set('nationalities', updated)
                        }}
                        placeholder={`${nat.countryCode} passport number`}
                        lang="en"
                      />
                    </div>
                  </div>
                )})}
                  <button
                    onClick={() => set('nationalities', [...form.nationalities, { countryCode: 'MA', isPrimary: false, passportNumber: '' }])}
                    style={{
                      border: '1px dashed var(--border2)', borderRadius: 'var(--r)',
                      padding: '12px', fontFamily: 'var(--onest)', fontSize: 12,
                      letterSpacing: '.12em', color: 'var(--t3)', cursor: 'pointer',
                      background: 'transparent', transition: 'all .15s', textAlign: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--red)'
                      e.currentTarget.style.color = 'var(--red)'
                      e.currentTarget.style.background = 'var(--redDim)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border2)'
                      e.currentTarget.style.color = 'var(--t3)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                  + ADD NATIONALITY ({form.nationalities.length} added)
                  </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 — CONTACT ── */}
          {step === 3 && (
            <div>
              <div style={sectionTitle}>Guardian Contact</div>
              <div style={sectionSub}>Father or legal guardian information for the player</div>

              <div className="wizard-form-grid2" style={{ marginBottom: 16 }}>
                <div style={{ ...fieldWrap, gridColumn: 'span 2' }}>
                  <FieldLabel required>FATHER'S FULL NAME</FieldLabel>
                  <Input value={form.fatherName} onChange={v => set('fatherName', v)} placeholder="e.g. Ahmed Ibrahim" />
                  {err('fatherName')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel required>PHONE NUMBER</FieldLabel>
                  <Input value={form.fatherPhone} onChange={v => set('fatherPhone', v.replace(/[^\d]/g, '').slice(0, 15))} placeholder="Digits only — no spaces or symbols" type="tel" />
                  {err('fatherPhone')}
                </div>
                <div style={fieldWrap}>
                  <FieldLabel>EMAIL ADDRESS</FieldLabel>
                  <Input value={form.fatherEmail} onChange={v => set('fatherEmail', v)} placeholder="optional@email.com" type="email" />
                  {err('fatherEmail')}
                </div>
              </div>
              {renderSectionFields('contact')}
            </div>
          )}

          {/* ── STEP 5 — ADDITIONAL ── */}
          {step === 4 && (
            <div>
              <div style={sectionTitle}>Additional Information</div>
              <div style={sectionSub}>Scouting notes and any custom fields defined by your team</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={fieldWrap}>
                  <FieldLabel>STRENGTHS</FieldLabel>
                  <TagInput
                    tags={form.strengths}
                    onChange={v => set('strengths', v)}
                    placeholder="Type a strength and press Enter…"
                    variant="strength"
                  />
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                    Press Enter or comma to add each tag
                  </div>
                </div>

                <div style={fieldWrap}>
                  <FieldLabel>WEAKNESSES</FieldLabel>
                  <TagInput
                    tags={form.weaknesses}
                    onChange={v => set('weaknesses', v)}
                    placeholder="Type a weakness and press Enter…"
                    variant="weakness"
                  />
                </div>

                {/* additional dynamic fields */}
                {(() => {
                  const additionalSchemas = allPlayerSchemas.filter(s => s.section === 'additional' || !s.section)
                  if (additionalSchemas.length === 0) return null
                  return (
                    <div>
                      <div style={{
                        fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                        letterSpacing: '.14em', textTransform: 'uppercase' as const,
                        color: 'var(--t3)', marginBottom: 10, marginTop: 4,
                      }}>
                        Custom Fields
                      </div>
                      <div className="wizard-form-grid2">
                        {additionalSchemas.map(schema => (
                          <div key={schema.id} style={fieldWrap}>
                            <FieldLabel required={schema.isRequired}>
                              {schema.label.en}
                            </FieldLabel>
                            <DynamicFieldInput
                              schema={schema}
                              value={form.dynamicFields[schema.id] ?? ''}
                              onChange={v => set('dynamicFields', { ...form.dynamicFields, [schema.id]: v })}
                            />
                            {errors[`dynamic_${schema.id}`] && (
                              <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                                {errors[`dynamic_${schema.id}`]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* footer */}
          <div className="wizard-footer">
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.12em', color: 'var(--t3)' }}>
              STEP {step + 1} OF {STEPS.length}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {step > 0 && (
                <button
                  onClick={back}
                  style={{
                    fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.12em',
                    padding: '9px 20px', border: '1px solid var(--border2)',
                    borderRadius: 5, background: 'transparent', color: 'var(--t2)', cursor: 'pointer',
                  }}
                >
                  ← BACK
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  style={{
                    fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.12em',
                    padding: '9px 24px', border: '1px solid var(--red)',
                    borderRadius: 5, background: 'var(--red)', color: '#fff', cursor: 'pointer',
                  }}
                >
                  NEXT: {STEPS[step + 1].label.toUpperCase()} →
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={saving}
                  style={{
                    fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.12em',
                    padding: '9px 28px', border: '1px solid var(--red)',
                    borderRadius: 5, background: saving ? 'var(--t3)' : 'var(--red)',
                    color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {saving ? 'SAVING…' : 'SAVE PLAYER ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}