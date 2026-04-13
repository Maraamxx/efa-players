'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Player, Club, League, PlayerMatch, PlayerAnalysis, FieldSchema, FieldType, FieldTarget, MediaAsset } from '@/types/domain'
import { textStyle } from '@/lib/font'
import { VideoPlayer, fmtTime, fmtSize } from '@/components/VideoPlayer'
import { VideoUploadButton } from '@/components/VideoUploadButton'
import { apiFetch } from '@/lib/apiFetch'
import { AppNav } from '@/components/AppNav'
import { DynamicFieldInput } from '@/components/DynamicFieldInput'
import { useCan, useAuth } from '@/lib/auth'
import { fmtDate } from '@/lib/dates'
import { useToast } from '@/components/Toast'
import { useEscKey } from '@/lib/useEscKey'
import { ProfileSkeleton, SkeletonStyles } from '@/components/Skeleton'
import { CustomSelect } from '@/components/CustomSelect'
import { FLAG, POS_FULL, FOOT, COUNTRIES, POSITIONS } from '@/lib/constants'

// ── helpers ───────────────────────────────────────────────────────────────────


function age(bd: string) {
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}
function ageGroup(bd: string) {
  return new Date(bd).getFullYear()
}

const ARABIC_RE = /[\u0600-\u06FF]/
const LATIN_RE  = /[a-zA-Z]/

// ── shared UI ─────────────────────────────────────────────────────────────────

function InlineInput({
  value, onChange, placeholder, type = 'text', lang, multiline,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  lang?: 'ar' | 'en'
  multiline?: boolean
  maxLength?: number
}) {
  const [focused, setFocused] = useState(false)

  const isAr = lang === 'ar'

  const style: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
    borderRadius: 'var(--r)',
    background: 'var(--bg)',
    fontFamily: isAr ? 'var(--arabic)' : 'var(--onest)',
    fontSize: isAr ? 15 : 13,
    fontWeight: 500,
    color: 'var(--t1)',
    padding: multiline ? '8px 12px' : '0 12px',
    height: multiline ? 'auto' : 34,
    outline: 'none',
    direction: isAr ? 'rtl' : 'ltr',
    boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
    transition: 'border-color .15s',
    resize: multiline ? 'vertical' as const : undefined,
    minHeight: multiline ? 72 : undefined,
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let v = e.target.value

    if (type === 'tel') {
      v = v.replace(/[^\d]/g, '')
      onChange(v)
      return
    }

    if (lang === 'ar' && /[a-zA-Z]/.test(v)) return
    if (lang === 'en' && /[\u0600-\u06FF]/.test(v)) return

    if (maxLength && v.length > maxLength) return

    onChange(v)
  }

  const props = {
    value,
    onChange: handleChange,
    placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style,
    maxLength,
  }

  return multiline
    ? <textarea {...props} />
    : <input type={type === 'tel' ? 'text' : type} inputMode={type === 'tel' ? 'numeric' as const : undefined} {...props} />
}


// ── dynamic field renderer (display + edit) ───────────────────────────────────

function DynamicFieldDisplay({ schema, value }: { schema: FieldSchema; value: string | undefined }) {
  if (value == null || value === '') return <span style={{ color: 'var(--t3)' }}>—</span>
  if (schema.fieldType === 'boolean') return <span style={{ color: value === 'true' ? 'var(--green)' : 'var(--t2)' }}>{value === 'true' ? 'Yes' : 'No'}</span>
  if (schema.fieldType === 'date') return <span>{fmtDate(value)}</span>
  if (schema.fieldType === 'multiselect') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.split(',').filter(Boolean).map(v => (
          <span key={v} style={{
            fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500,
            padding: '2px 8px', borderRadius: 3,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--t2)',
          }}>{v}</span>
        ))}
      </div>
    )
  }
  return <span style={textStyle(value)}>{value}</span>
}

// ── add field inline form ─────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',        label: 'Text'         },
  { value: 'number',      label: 'Number'       },
  { value: 'date',        label: 'Date'         },
  { value: 'boolean',     label: 'Yes / No'     },
  { value: 'select',      label: 'Dropdown'     },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio',       label: 'Radio buttons'},
  { value: 'file',        label: 'File upload'  },
]

function AddFieldInline({
  target, section, onCreated, onCancel,
}: { target: FieldTarget; section: string; onCreated: (schema: FieldSchema) => void; onCancel: () => void }) {
  const [labelEn,    setLabelEn]    = useState('')
  const [labelAr,    setLabelAr]    = useState('')
  const [fieldType,  setFieldType]  = useState<FieldType>('text')
  const [isRequired, setIsRequired] = useState(false)
  const [options,    setOptions]    = useState<{ en: string; ar: string }[]>([])
  const [optEn,      setOptEn]      = useState('')
  const [optAr,      setOptAr]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const needsOptions = ['select', 'multiselect', 'radio'].includes(fieldType)

  const addOption = () => {
    if (!optEn.trim()) return
    setOptions(o => [...o, { en: optEn.trim(), ar: optAr.trim() || optEn.trim() }])
    setOptEn(''); setOptAr('')
  }

  const save = async () => {
    if (!labelEn.trim()) { setError('English label is required'); return }
    if (needsOptions && options.length < 2) { setError('Add at least 2 options'); return }
    setSaving(true)
    const res = await apiFetch('/api/field-schemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label:        { en: labelEn.trim(), ar: labelAr.trim() || labelEn.trim() },
        fieldType,
        entityTarget: target,
        section,
        isRequired,
        sortOrder:    999,
        options:      needsOptions ? options : null,
        validationRules: null,
      }),
    })
    const schema = await res.json()
    setSaving(false)
    onCreated(schema)
  }

  return (
    <div style={{
      borderTop: '1px solid var(--redBorder)',
      background: 'rgba(200,16,46,.03)',
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase' as const,
        color: 'var(--red)', marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>New field — applies to ALL players</span>
        <button onClick={onCancel} style={{
          fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}>
          ✕ cancel
        </button>
      </div>

      <div className="add-field-grid">
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 4 }}>
            Field Label *
          </div>
          <InlineInput value={labelEn} onChange={setLabelEn} placeholder="e.g. Agent name" lang="en" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 4 }}>
            Field type *
          </div>
          <CustomSelect value={fieldType} onChange={v => { setFieldType(v as FieldType); setOptions([]) }} searchable={false}
            options={FIELD_TYPES.map(t => ({ value: t.value, label: t.label }))} />
        </div>
      </div>

      {/* required toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
        <div onClick={() => setIsRequired(r => !r)} style={{
          width: 32, height: 18, borderRadius: 9, position: 'relative',
          background: isRequired ? 'var(--red)' : 'var(--s3)',
          border: `1px solid ${isRequired ? 'var(--red)' : 'var(--border2)'}`,
          transition: 'all .2s', cursor: 'pointer', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, left: isRequired ? 15 : 2,
            width: 12, height: 12, borderRadius: '50%',
            background: isRequired ? '#fff' : 'var(--t4)', transition: 'left .2s',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t2)' }}>
          Required field
        </span>
      </label>

      {/* options builder */}
      {needsOptions && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: 10,
        }}>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 8 }}>
            Options (min 2)
          </div>
          {options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 8 }}>
              {options.map((o, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--onest)', fontSize: 11, padding: '2px 8px',
                  borderRadius: 3, background: 'var(--bg3)', border: '1px solid var(--border)',
                  color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {o.en}
                  <span onClick={() => setOptions(opts => opts.filter((_, j) => j !== i))}
                    style={{ cursor: 'pointer', opacity: .5, fontSize: 10 }}>✕</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
            <InlineInput value={optEn} onChange={setOptEn} placeholder="e.g. Option A" lang="en" />
            <button onClick={addOption} disabled={!optEn.trim()}
              style={{
                height: 34, padding: '0 14px', borderRadius: 'var(--r)',
                fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600,
                border: '1px solid var(--red)', background: 'var(--red)',
                color: '#fff', cursor: 'pointer', opacity: !optEn ? 0.4 : 1,
              }}>
              Add
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>
          {error}
        </div>
      )}

      <button onClick={save} disabled={saving}
        style={{
          fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700,
          padding: '7px 18px', border: '1px solid var(--red)',
          borderRadius: 5, background: saving ? 'var(--t3)' : 'var(--red)',
          color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
        }}>
        {saving ? 'Creating…' : 'Create field for all players'}
      </button>
    </div>
  )
}

// ── editable card wrapper ─────────────────────────────────────────────────────

function EditableCard({
  title, target, section, children, onSave, saving, readOnly,
  showAddField = true, onFieldCreated, canEdit = true, onSaved, onSaveFailed,
}: {
  title: string
  target: FieldTarget
  section: string
  children: (editing: boolean) => React.ReactNode
  onSave: () => Promise<void>
  saving?: boolean
  readOnly?: boolean
  showAddField?: boolean
  onFieldCreated?: (schema: FieldSchema) => void
  canEdit?: boolean
  onSaved?: () => void
  onSaveFailed?: () => void
}) {
  const [editing,        setEditing]        = useState(false)
  const [showAddFieldUI, setShowAddFieldUI] = useState(false)
  const [saveState,      setSaveState]      = useState<'idle' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    try {
      await onSave()
      setEditing(false)
      setShowAddFieldUI(false)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
      onSaved?.()
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2000)
      onSaveFailed?.()
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setShowAddFieldUI(false)
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: `1px solid ${editing ? 'rgba(200,16,46,.25)' : 'var(--border)'}`,
      borderRadius: 'var(--r)', overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      {/* header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: editing ? 'rgba(200,16,46,.04)' : 'var(--bg3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background .2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700,
            letterSpacing: '.04em', color: 'var(--t2)', textTransform: 'uppercase' as const,
          }}>
            {title}
          </span>
          {saveState === 'saved' && (
            <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, color: 'var(--green)', animation: 'fadeIn .2s ease' }}>
              ✓ Saved
            </span>
          )}
          {saveState === 'error' && (
            <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, color: 'var(--red)', animation: 'fadeIn .2s ease' }}>
              ✕ Failed
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {readOnly && (
            <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)' }}>
              Read-only — auto-computed
            </span>
          )}
          {!readOnly && !editing && canEdit && (
            <button onClick={() => setEditing(true)} style={{
              fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
              padding: '4px 12px', border: '1px solid var(--border2)',
              borderRadius: 4, background: 'transparent', color: 'var(--t2)',
              cursor: 'pointer', transition: 'all .15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--t2)'
                e.currentTarget.style.color = 'var(--t1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border2)'
                e.currentTarget.style.color = 'var(--t2)'
              }}
            >
              Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleCancel} style={{
                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
                padding: '4px 12px', border: '1px solid var(--border2)',
                borderRadius: 4, background: 'transparent', color: 'var(--t2)',
                cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700,
                padding: '4px 14px', border: '1px solid var(--red)',
                borderRadius: 4, background: saving ? 'var(--t3)' : 'var(--red)',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {saving && <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* content */}
      {children(editing)}

      {/* add field row — only in edit mode */}
      {editing && showAddField && !showAddFieldUI && (
        <div style={{
          borderTop: '1px dashed var(--border2)',
          padding: '8px 16px',
        }}>
          <button
            onClick={() => setShowAddFieldUI(true)}
            style={{
              fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
              color: 'var(--red)', background: 'transparent',
              border: '1px dashed rgba(200,16,46,.3)',
              borderRadius: 4, padding: '5px 12px',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--redDim)'
              e.currentTarget.style.borderColor = 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(200,16,46,.3)'
            }}
          >
            + Add field to all players
          </button>
          <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)', marginLeft: 10 }}>
            Creates a global field — appears on every player profile
          </span>
        </div>
      )}

      {editing && showAddField && showAddFieldUI && (
        <AddFieldInline
          target={target}
          section={section}
          onCreated={(schema) => {
            setShowAddFieldUI(false)
            onFieldCreated?.(schema)
          }}
          onCancel={() => setShowAddFieldUI(false)}
        />
      )}
    </div>
  )
}

// ── info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, display, edit, editing, required }: {
  label: string | React.ReactNode
  display: React.ReactNode
  edit?: React.ReactNode
  editing: boolean
  required?: boolean
}) {
    const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: editing && edit ? 'flex-start' : 'center',
        padding: '9px 16px',
        borderBottom: '1px solid var(--border)',
        background: hov && !editing ? 'var(--bg3)' : 'transparent',
        transition: 'background .1s',
        gap: 12,
      }}
    >
      <span
        className="info-row-label"
        style={{
          fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
          letterSpacing: '.06em', textTransform: 'uppercase' as const,
          color: 'var(--t3)', width: 140, flexShrink: 0,
          paddingTop: editing && edit ? 8 : 0,
        }}
      >
        {label}
        {required && editing && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </span>
      <div style={{ flex: 1, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 500, color: 'var(--t1)', minWidth: 0 }}>
        {editing && edit ? edit : display}
      </div>
    </div>
  )
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: '16px 18px',
      borderTop: '2px solid var(--red)',
    }}>
      <div style={{
        fontFamily: 'var(--onest)', fontSize: 28, fontWeight: 800,
        letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600,
        letterSpacing: '.12em', textTransform: 'uppercase' as const,
        color: 'var(--t3)', marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  )
}

// ── tag input for strengths/weaknesses ───────────────────────────────────────

function TagInput({ tags, onChange, variant }: {
  tags: string[]; onChange: (t: string[]) => void; variant: 'strength' | 'weakness'
}) {
  const [input, setInput] = useState('')
  const isS = variant === 'strength'
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div style={{
      border: '1px solid var(--border2)', borderRadius: 'var(--r)',
      padding: '5px 8px', background: 'var(--bg)',
      display: 'flex', flexWrap: 'wrap' as const, gap: 4, minHeight: 38, alignItems: 'center',
    }}>
      {tags.map(t => (
        <span key={t} style={{
          fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500,
          padding: '2px 8px', borderRadius: 3,
          background: isS ? 'var(--greenDim)' : 'var(--redDim)',
          border: `1px solid ${isS ? 'rgba(22,163,74,.2)' : 'var(--redBorder)'}`,
          color: isS ? 'var(--green)' : 'var(--red)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {t}
          <span onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ cursor: 'pointer', opacity: .6, fontSize: 10 }}>✕</span>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={() => { if (input.trim()) add() }}
        placeholder={tags.length === 0 ? `Add ${variant}…` : ''}
        style={{
          fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)',
          background: 'transparent', border: 'none', outline: 'none', minWidth: 80, flex: 1,
        }}
      />
    </div>
  )
}

// ── COUNTRIES ─────────────────────────────────────────────────────────────────



// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

type Tab = 'information' | 'matches' | 'analysis'

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const canEditPlayers  = useCan('players', 'edit')
  const canDeletePlayers = useCan('players', 'delete')
  const canCreateMatches = useCan('matches', 'create')
  const canEditMatches  = useCan('matches', 'edit')
  const canDeleteMatches = useCan('matches', 'delete')
  const canUploadMedia  = useCan('media', 'upload')
  const toast = useToast()
  const [id,      setId]      = useState<string | null>(null)
  const [player,  setPlayer]  = useState<Player | null>(null)
  const [clubs,   setClubs]   = useState<Club[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [matches, setMatches] = useState<PlayerMatch[]>([])
  const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null)
  const [personalSchemas,  setPersonalSchemas]  = useState<FieldSchema[]>([])
  const [careerSchemas,    setCareerSchemas]    = useState<FieldSchema[]>([])
  const [contactSchemas,   setContactSchemas]   = useState<FieldSchema[]>([])
  const [additionalSchemas,   setAdditionalSchemas]   = useState<FieldSchema[]>([])
  const [analysisSchemasFull, setAnalysisSchemasFull] = useState<FieldSchema[]>([])
  const [matchMedia,    setMatchMedia]    = useState<Record<string, MediaAsset[]>>({})
  const [analysisMedia, setAnalysisMedia] = useState<MediaAsset[]>([])
  const [openPlayer,    setOpenPlayer]    = useState<MediaAsset | null>(null)
  const [tab,     setTab]     = useState<Tab>('information')
  const [loading, setLoading] = useState(true)

  // edit state drafts — one per card
  const [draftPersonal,  setDraftPersonal]  = useState<any>({})
  const [draftFootball,  setDraftFootball]  = useState<any>({})
  const [draftContact,   setDraftContact]   = useState<any>({})
  const [draftSW,        setDraftSW]        = useState<{ strengths: string[]; weaknesses: string[] }>({ strengths: [], weaknesses: [] })
  const [draftDynamic,   setDraftDynamic]   = useState<Record<string, string>>({})
  const [draftHistory,   setDraftHistory]   = useState<any[]>([])
  const [draftNat,       setDraftNat]       = useState<any[]>([])
  const [savingCard,     setSavingCard]     = useState<string | null>(null)
  const [emailError,     setEmailError]     = useState<string | null>(null)
  const [draftPhotoPreview, setDraftPhotoPreview] = useState<string | null>(null)

  // match edit/delete
  const [editingMatch,   setEditingMatch]   = useState<PlayerMatch | null>(null)
  const [deletingMatch,  setDeletingMatch]  = useState<PlayerMatch | null>(null)
  const [matchEditDraft, setMatchEditDraft] = useState<any>({})
  const [matchEditSaving, setMatchEditSaving] = useState(false)

  // delete player
  const [showDeletePlayer, setShowDeletePlayer] = useState(false)
  const [deletingPlayer,   setDeletingPlayer]   = useState(false)

  // analysis stats editing
  const [editingAnalysis, setEditingAnalysis] = useState(false)
  const [analysisDraft, setAnalysisDraft] = useState<Record<string, string>>({})
  const [savingAnalysis, setSavingAnalysis] = useState(false)

  // match modal
  const [showMatchForm,    setShowMatchForm]    = useState(false)
  const [matchSchemasFull, setMatchSchemasFull] = useState<FieldSchema[]>([])
  const [newMatch, setNewMatch] = useState({
    matchName:    '',
    matchDate:    '',
    competition:  '',
    minutesPlayed: '',
    goalsScored:  '0',
    assists:      '0',
    notes:        '',
    dynamicFields: {} as Record<string, string>,
  })
  const [matchSaving,     setMatchSaving]     = useState(false)
  const [matchFormErrors, setMatchFormErrors] = useState<Record<string, string>>({})

  // load id
  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  // load player + lookups
  const loadPlayer = useCallback(() => {
    if (!id) return
    Promise.all([
      apiFetch(`/api/players/${id}`).then(r => r.ok ? r.json() : null),
      apiFetch('/api/clubs').then(r => r.json()),
      apiFetch('/api/leagues').then(r => r.json()),
      apiFetch('/api/field-schemas?target=player').then(r => r.json()),
    ]).then(([apiPlayer, c, l, allPlayerSchemas]) => {
      // Use API data, fall back to sessionStorage cache
      let p = apiPlayer
      if (!p || !p.name) {
        try { const cached = sessionStorage.getItem(`player-${id}`); if (cached) p = JSON.parse(cached) } catch {}
      }
      if (!p || !p.name) { setPlayer(null); setLoading(false); return }
      // Cache for future loads
      try { sessionStorage.setItem(`player-${id}`, JSON.stringify(p)) } catch {}
      setPlayer(p)
      setClubs(c)
      setLeagues(l)
      setPersonalSchemas(allPlayerSchemas.filter((s: FieldSchema) => s.section === 'personal'))
      setCareerSchemas(allPlayerSchemas.filter((s: FieldSchema) => s.section === 'career'))
      setContactSchemas(allPlayerSchemas.filter((s: FieldSchema) => s.section === 'contact'))
      setAdditionalSchemas(allPlayerSchemas.filter((s: FieldSchema) => s.section === 'additional' || !s.section))
      // init drafts
      setDraftPersonal({
        nameEn:         p.name?.en ?? '',
        nameAr:         p.name?.ar ?? '',
        birthdate:      p.birthdate ?? '',
        status:         p.status ?? 'active',
        idNumber:       p.idNumber ?? '',
      })
      setDraftFootball({
        positions:      p.positions ?? (p.position ? [p.position] : []),

        preferredFoot:  p.preferredFoot ?? 'right',
        height:         String(p.height ?? ''),
        currentClubId:  p.currentClubId ?? '',
        currentLeagueId: p.currentLeagueId ?? '',
        contractStart:  p.contractStart ?? '',
        contractEnd:    p.contractEnd ?? '',
      })
      setDraftContact({
        fatherName:  p.fatherName ?? '',
        fatherPhone: p.fatherPhone ?? '',
        fatherEmail: p.fatherEmail ?? '',
      })
      setDraftSW({
        strengths:  p.strengths ?? [],
        weaknesses: p.weaknesses ?? [],
      })
      const dynMap: Record<string, string> = {}
      ;(p.dynamicFieldValues ?? []).forEach((fv: any) => {
        dynMap[fv.fieldSchemaId] = String(fv.value ?? '')
      })
      setDraftDynamic(dynMap)
      setDraftHistory(p.clubHistory ?? [])
      setDraftNat(p.nationalities ?? [])
      setDraftPhotoPreview(p.photoUrl ?? null)
      setLoading(false)
    })
  }, [id])

  useEffect(() => { loadPlayer() }, [loadPlayer])

  const loadMatchMedia = useCallback(async (matchId: string) => {
    const assets = await apiFetch(`/api/media?entityType=match&entityId=${matchId}`).then(r => r.json())
    setMatchMedia(prev => ({ ...prev, [matchId]: assets }))
  }, [])

  // load tab data
  useEffect(() => {
    if (!id || !player) return
    if (tab === 'matches') {
      Promise.all([
        apiFetch(`/api/players/${id}/matches`).then(r => r.json()),
        apiFetch('/api/field-schemas?target=match').then(r => r.json()),
      ]).then(([r, s]) => {
        setMatches(r.data)
        setMatchSchemasFull(s)
        r.data.forEach((m: PlayerMatch) => loadMatchMedia(m.id))
      })
    }
    if (tab === 'analysis') {
      Promise.all([
        apiFetch(`/api/players/${id}/analysis`).then(r => r.json()),
        apiFetch('/api/field-schemas?target=analysis').then(r => r.json()),
        apiFetch(`/api/media?entityType=analysis&entityId=${id}`).then(r => r.json()),
      ]).then(([a, s, media]) => { setAnalysis(a); setAnalysisSchemasFull(s); setAnalysisMedia(media) })
    }
  }, [tab, id, player, loadMatchMedia])

  // Lock background scroll when any modal is open
  useEffect(() => {
    const anyOpen = showMatchForm || !!editingMatch || !!deletingMatch || showDeletePlayer
    if (!anyOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMatchForm, editingMatch, deletingMatch, showDeletePlayer])

  // ESC key — close all modals
  const closeMatchForm    = useCallback(() => setShowMatchForm(false), [])
  const closeEditMatch    = useCallback(() => setEditingMatch(null), [])
  const closeDeleteMatch  = useCallback(() => setDeletingMatch(null), [])
  const closeDeletePlayer = useCallback(() => setShowDeletePlayer(false), [])
  const closeOpenPlayer   = useCallback(() => setOpenPlayer(null), [])
  useEscKey(closeMatchForm,    showMatchForm)
  useEscKey(closeEditMatch,    !!editingMatch)
  useEscKey(closeDeleteMatch,  !!deletingMatch)
  useEscKey(closeDeletePlayer, showDeletePlayer)
  useEscKey(closeOpenPlayer,   !!openPlayer)

  // patch helper
  const patch = async (data: any) => {
    const res = await apiFetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    let updated: any
    if (res.ok) {
      updated = await res.json()
    }
    if (updated && updated.name) {
      setPlayer(updated)
    } else {
      // Server lost the player (serverless cold start) — merge locally
      updated = { ...player, ...data, updatedAt: new Date().toISOString() }
      setPlayer(updated as any)
    }
    try { sessionStorage.setItem(`player-${id}`, JSON.stringify(updated)) } catch {}
    return updated
  }

  const saveMatchEdit = async () => {
    if (!editingMatch) return
    setMatchEditSaving(true)
    await apiFetch(`/api/players/${id}/matches/${editingMatch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchName:     (matchEditDraft.matchName ?? '').trim() || 'Untitled match',
        matchDate:     matchEditDraft.matchDate || editingMatch.matchDate,
        competition:   matchEditDraft.competition || null,
        minutesPlayed: matchEditDraft.minutesPlayed === '' || matchEditDraft.minutesPlayed == null ? 0 : Number(matchEditDraft.minutesPlayed),
        goalsScored:   matchEditDraft.goalsScored === '' || matchEditDraft.goalsScored == null ? 0 : Number(matchEditDraft.goalsScored),
        assists:       matchEditDraft.assists === '' || matchEditDraft.assists == null ? 0 : Number(matchEditDraft.assists),
        notes:         matchEditDraft.notes || null,
      }),
    })
    const r = await apiFetch(`/api/players/${id}/matches`).then(x => x.json())
    setMatches(r.data)
    setMatchEditSaving(false)
    setEditingMatch(null)
    toast.success('Match updated')
  }

  const confirmDeleteMatch = async () => {
    if (!deletingMatch) return
    await apiFetch(`/api/players/${id}/matches/${deletingMatch.id}`, { method: 'DELETE' })
    setMatches(m => m.filter(x => x.id !== deletingMatch.id))
    setDeletingMatch(null)
    toast.success('Match deleted')
  }

  const confirmDeletePlayer = async () => {
    setDeletingPlayer(true)
    await apiFetch(`/api/players/${id}`, { method: 'DELETE' })
    router.push('/players')
  }

  const clubName   = (cid: string | null) => clubs.find(c => c.id === cid)?.name.en ?? '—'
  const leagueName = (lid: string | null) => leagues.find(l => l.id === lid)?.name.en ?? '—'

  // ── submit match ──
  // All match fields are optional. We fall back to sensible defaults when
  // omitted so "add match" works as a lightweight note-capture flow.
  const submitMatch = async () => {
    setMatchFormErrors({})
    setMatchSaving(true)
    await apiFetch(`/api/players/${id}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchName:     newMatch.matchName.trim() || 'Untitled match',
        matchDate:     newMatch.matchDate || new Date().toISOString().slice(0, 10),
        competition:   newMatch.competition.trim() || null,
        minutesPlayed: newMatch.minutesPlayed === '' ? 0 : Number(newMatch.minutesPlayed),
        goalsScored:   newMatch.goalsScored === '' ? 0 : Number(newMatch.goalsScored),
        assists:       newMatch.assists === '' ? 0 : Number(newMatch.assists),
        notes:         newMatch.notes.trim() || null,
        videos:        [],
        dynamicFieldValues: Object.entries(newMatch.dynamicFields ?? {})
          .map(([k, v]) => ({ fieldSchemaId: k, value: v })),
      }),
    })
    const r = await apiFetch(`/api/players/${id}/matches`).then(x => x.json())
    setMatches(r.data)
    setMatchSaving(false)
    setShowMatchForm(false)
    setNewMatch({ matchName:'', matchDate:'', competition:'', minutesPlayed:'', goalsScored:'0', assists:'0', notes:'', dynamicFields:{} })
    setMatchFormErrors({})
    toast.success('Match added')
  }

  const { totalGoals, totalAssists, totalMins, recentForm } = useMemo(() => ({
    totalGoals:   matches.reduce((s, m) => s + m.goalsScored, 0),
    totalAssists: matches.reduce((s, m) => s + m.assists, 0),
    totalMins:    matches.reduce((s, m) => s + m.minutesPlayed, 0),
    recentForm:   [...matches].slice(0, 8).reverse(),
  }), [matches])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <SkeletonStyles />
      <AppNav />
      <ProfileSkeleton />
    </div>
  )

  if (!player) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppNav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 50px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 18, fontWeight: 800, color: 'var(--t2)', marginBottom: 8 }}>Player not found</div>
          <Link href="/players" style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, color: 'var(--red)', textDecoration: 'none' }}>← Back to players</Link>
        </div>
      </div>
    </div>
  )

  return (<>
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', overflowX: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes modalIn { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
      `}</style>

      <AppNav />

      {/* HERO */}
      <div className="profile-hero-pad" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 16, display: 'flex', gap: 8 }}>
          <Link href="/players" style={{ color: 'var(--t3)', textDecoration: 'none' }}>PLAYERS</Link>
          <span style={{ opacity: .3 }}>/</span>
          <span style={{ color: 'var(--t2)' }}>{player.name?.en?.toUpperCase()}</span>
        </div>

        <div className="profile-hero">
          {/* avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 'var(--r)',
              background: 'var(--s2)', border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--onest)', fontSize: 26, fontWeight: 800,
              color: 'var(--t3)', overflow: 'hidden',
            }}>
              {player.photoUrl
                ? <img src={player.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (player.name?.en ?? 'P').slice(0, 2).toUpperCase()
              }
            </div>
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: player.status === 'active' ? 'var(--green)' : player.status === 'suspended' ? 'var(--red)' : '#999',
              border: '2.5px solid var(--bg)',
              boxShadow: player.status === 'active' ? '0 0 7px rgba(22,163,74,.5)' : 'none',
            }} />
          </div>

          {/* names + attrs */}
          <div className="profile-hero-info">
            <div style={{ fontFamily: 'var(--onest)', fontSize: 26, fontWeight: 800, letterSpacing: '-.025em', color: 'var(--t1)', lineHeight: 1 }}>
              {player.name?.en}
            </div>
            <div style={{ fontFamily: 'var(--arabic)', fontSize: 16, fontWeight: 500, color: 'var(--t2)', marginTop: 3, direction: 'rtl', textAlign: 'left' }}>
              {player.name?.ar}
            </div>

          </div>

          {/* stats + edit */}
          <div className="profile-hero-stats">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => window.print()}
                className="no-print"
                style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
              >Print</button>
              {id && (
                <Link href={`/players/compare?ids=${id}`}
                  style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'all .15s' }}
                >Compare</Link>
              )}
              {canDeletePlayers && (
                <button
                  onClick={() => setShowDeletePlayer(true)}
                  style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,16,46,.4)'; e.currentTarget.style.color = '#C8102E'; e.currentTarget.style.background = 'rgba(200,16,46,.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent' }}
                >Delete Player</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { n: analysis?.totalAppearances || '—', l: 'Apps'    },
                { n: (analysis?.totalGoals ?? totalGoals) || '—',     l: 'Goals'   },
                { n: (analysis?.totalAssists ?? totalAssists) || '—',   l: 'Assists' },
              ].map(s => (
                <div key={s.l} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 16px', textAlign: 'center', minWidth: 62 }}>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: 'var(--t3)', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* attr strip — own grid row */}
          <div className="attr-strip" style={{ gridColumn: '1 / -1' }}>
            {([
              { l: 'Position', v: (player.positions ?? [(player as any).position]).filter(Boolean).join(', ') || '—', red: true  },
              { l: 'Age group', v: player.birthdate ? String(ageGroup(player.birthdate)) : '—'        },
              { l: 'Height',    v: player.height ? `${player.height} cm` : '—'                        },
              { l: 'Foot',      v: FOOT[player.preferredFoot as keyof typeof FOOT] ?? '—'             },
              { l: 'Club',      v: clubName(player.currentClubId),                         green: true },
              { l: 'Status',    v: player.status?.toUpperCase(),                           green: player.status === 'active', red2: player.status === 'suspended' },
              { l: 'League',    v: leagueName(player.currentLeagueId)                                  },
            ] as { l: string; v: string; red?: boolean; green?: boolean; red2?: boolean }[]).map((a, i) => (
              <div key={i} className="attr-strip-cell">
                <span style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>{a.l}</span>
                <span style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 700, lineHeight: 1.1, color: a.red ? 'var(--red)' : a.green ? 'var(--green)' : a.red2 ? 'var(--red)' : 'var(--t1)' }}>{a.v}</span>
              </div>
            ))}
            <div className="attr-strip-cell">
              <span style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>Nationality</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                {(player.nationalities ?? []).map(n => (
                  <img key={n.countryCode} src={FLAG(n.countryCode)} alt={n.countryCode} title={n.countryCode} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', marginTop: 18 }}>
          {(['information','matches','analysis'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase' as const,
              padding: '10px 22px', cursor: 'pointer', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${tab === t ? 'var(--red)' : 'transparent'}`,
              color: tab === t ? 'var(--t1)' : 'var(--t3)',
              transition: 'all .15s',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Mobile-only action bar */}
        <div className="profile-mobile-actions">
          <button
            onClick={() => window.print()}
            style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 5, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >Print</button>
          {id && (
            <Link href={`/players/compare?ids=${id}`} style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 5, border: '1px solid var(--border2)', color: 'var(--t2)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Compare
            </Link>
          )}
          {canDeletePlayers && (
            <button
              onClick={() => setShowDeletePlayer(true)}
              style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 5, border: '1px solid rgba(200,16,46,.3)', background: 'rgba(200,16,46,.06)', color: '#C8102E', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >Delete</button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="profile-grid">

        {/* ══ INFORMATION ══ */}
        {tab === 'information' && (<>

          {/* PERSONAL CARD */}
          <EditableCard
            title="Personal"
            target="player"
            section="personal"
            saving={savingCard === 'personal'}
            canEdit={canEditPlayers}
            onFieldCreated={schema => setPersonalSchemas(s => [...s, schema])}
            onSaved={() => toast.success('Personal info saved')}
            onSaveFailed={() => toast.error('Failed to save personal info')}
            onSave={async () => {
              setSavingCard('personal')
              try {
                await patch({
                  name:      { en: draftPersonal.nameEn, ar: draftPersonal.nameAr },
                  birthdate: draftPersonal.birthdate,
                  ageGroup:  draftPersonal.birthdate ? ageGroup(draftPersonal.birthdate) : player.ageGroup,
                  status:    draftPersonal.status,
                  idNumber:  draftPersonal.idNumber,
                  photoUrl:  draftPhotoPreview,
                  dynamicFieldValues: [
                    ...(player.dynamicFieldValues ?? []).filter((fv: any) =>
                      !personalSchemas.find(s => s.id === fv.fieldSchemaId)
                    ),
                    ...personalSchemas.map(s => ({ fieldSchemaId: s.id, value: draftDynamic[s.id] ?? '' })),
                  ],
                })
              } finally {
                setSavingCard(null)
              }
            }}
          >
            {(editing) => (
              <div>
                <InfoRow label="Name (EN)"     editing={editing} required
                  display={<span style={{ fontFamily: 'var(--onest)', fontWeight: 600 }}>{player.name?.en}</span>}
                  edit={<InlineInput value={draftPersonal.nameEn ?? ''} onChange={v => setDraftPersonal((d: any) => ({ ...d, nameEn: v }))} lang="en" placeholder="English name only" />}
                />
                <InfoRow label="Name (AR)"     editing={editing} required
                  display={<span style={{ ...textStyle(player.name?.ar ?? ''), fontSize: 15 }}>{player.name?.ar}</span>}
                  edit={<InlineInput value={draftPersonal.nameAr ?? ''} onChange={v => setDraftPersonal((d: any) => ({ ...d, nameAr: v }))} lang="ar" placeholder="الاسم بالعربية فقط" />}
                />
                <InfoRow label="Date of birth" editing={editing} required
                  display={<span>{player.birthdate ? `${fmtDate(player.birthdate)} · ${age(player.birthdate)} yrs` : '—'}</span>}
                  edit={<InlineInput value={draftPersonal.birthdate ?? ''} onChange={v => setDraftPersonal((d: any) => ({ ...d, birthdate: v }))} type="date"  />}
                />
                <InfoRow label="Age group"     editing={false}
                  display={<span style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)' }}>{player.birthdate ? ageGroup(player.birthdate) : '—'} (auto-derived)</span>}
                />
                <InfoRow label="Status"        editing={editing}
                  display={<span style={{ color: player.status === 'active' ? 'var(--green)' : player.status === 'suspended' ? 'var(--red)' : 'var(--t2)' }}>{player.status}</span>}
                  edit={
                    <CustomSelect value={draftPersonal.status ?? ''} onChange={v => setDraftPersonal((d: any) => ({ ...d, status: v }))} searchable={false}
                      options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }]} />
                  }
                />
                <InfoRow label="National ID"   editing={editing}
                  display={<span style={{ fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.1em', color: 'var(--t2)' }}>{player.idNumber ? `${player.idNumber.slice(0,3)}${'•'.repeat(player.idNumber.length - 3)}` : '—'}</span>}
                  edit={<InlineInput value={draftPersonal.idNumber ?? ''} onChange={v => setDraftPersonal((d: any) => ({ ...d, idNumber: v.replace(/\D/g, '').slice(0, 14) }))} type="tel" placeholder="14-digit national ID" />}
                />
                <InfoRow label="Photo" editing={editing} required
                  display={
                    player.photoUrl
                      ? <img src={player.photoUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border2)' }} />
                      : <span style={{ color: 'var(--t3)' }}>No photo</span>
                  }
                  edit={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {draftPhotoPreview && (
                        <img src={draftPhotoPreview} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border2)', flexShrink: 0 }} />
                      )}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '6px 14px', border: '1px dashed var(--border2)', borderRadius: 5, cursor: 'pointer', color: 'var(--t2)' }}>
                        {draftPhotoPreview ? 'Change photo' : 'Upload photo'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = () => setDraftPhotoPreview(reader.result as string)
                            reader.readAsDataURL(file)
                          }}
                        />
                      </label>
                      {draftPhotoPreview && (
                        <button onClick={() => setDraftPhotoPreview(null)} style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                      )}
                    </div>
                  }
                />

                {personalSchemas.map(schema => {
        const raw = (player.dynamicFieldValues ?? []).find((fv: any) => fv.fieldSchemaId === schema.id)
        return (
          <InfoRow
            key={schema.id}
            label={`${schema.label.en}${schema.isRequired ? ' *' : ''}`}
            editing={editing}
            display={<DynamicFieldDisplay schema={schema} value={raw?.value != null ? String(raw.value) : undefined} />}
            edit={
              <DynamicFieldInput
                schema={schema}
                value={draftDynamic[schema.id] ?? ''}
                onChange={v => setDraftDynamic(d => ({ ...d, [schema.id]: v }))}
              />
            }
          />
        )
      })}
    </div>
  )}
</EditableCard>

          {/* CAREER & PHYSICAL CARD */}
          <EditableCard
            title="Career & Physical"
            target="player"
            section='career'
            saving={savingCard === 'career'}
            canEdit={canEditPlayers}
            onFieldCreated={schema => setCareerSchemas(s => [...s, schema])}
            onSaved={() => toast.success('Career info saved')}
            onSaveFailed={() => toast.error('Failed to save career info')}
            onSave={async () => {
              setSavingCard('career')
              try {
                await patch({
                  positions:       draftFootball.positions,

                  preferredFoot:   draftFootball.preferredFoot,
                  height:          Number(draftFootball.height),
                  currentClubId:   draftFootball.currentClubId || null,
                  currentLeagueId: draftFootball.currentLeagueId || null,
                  contractStart:   draftFootball.contractStart || null,
                  contractEnd:     draftFootball.contractEnd || null,
                  dynamicFieldValues: [
                    ...(player.dynamicFieldValues ?? []).filter((fv: any) =>
                      !careerSchemas.find(s => s.id === fv.fieldSchemaId)
                    ),
                    ...careerSchemas.map(s => ({ fieldSchemaId: s.id, value: draftDynamic[s.id] ?? '' })),
                  ],
                })
              } finally {
                setSavingCard(null)
              }
            }}
          >
            {(editing) => (
              <div>
                <InfoRow label="League"        editing={editing}
                  display={
                    <div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                        {leagueName(player.currentLeagueId)}
                      </div>
                      {leagues.find(l => l.id === player.currentLeagueId)?.name.ar && leagues.find(l => l.id === player.currentLeagueId)?.name.ar !== '-' && (
                        <div style={{ fontFamily: 'var(--arabic)', fontSize: 13, color: 'var(--t3)', direction: 'rtl' as const, textAlign: 'left' as const, marginTop: 1 }}>
                          {leagues.find(l => l.id === player.currentLeagueId)?.name.ar}
                        </div>
                      )}
                    </div>
                  }
                  edit={
                    <CustomSelect value={draftFootball.currentLeagueId ?? ''} onChange={v => {
                      setDraftFootball((d: any) => ({ ...d, currentLeagueId: v, currentClubId: '' }))
                    }}
                      options={[{ value: '', label: 'Select league…' }, ...leagues.map(l => ({ value: l.id, label: l.name.en }))]}
                      placeholder="Select league…" />
                  }
                />
                <InfoRow label="Club"          editing={editing}
                  display={
                    <div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                        {clubName(player.currentClubId)}
                      </div>
                      {clubs.find(c => c.id === player.currentClubId)?.name.ar && clubs.find(c => c.id === player.currentClubId)?.name.ar !== '-' && (
                        <div style={{ fontFamily: 'var(--arabic)', fontSize: 13, color: 'var(--t3)', direction: 'rtl' as const, textAlign: 'left' as const, marginTop: 1 }}>
                          {clubs.find(c => c.id === player.currentClubId)?.name.ar}
                        </div>
                      )}
                    </div>
                  }
                  edit={
                    draftFootball.currentLeagueId ? (
                      <CustomSelect value={draftFootball.currentClubId ?? ''} onChange={v => setDraftFootball((d: any) => ({ ...d, currentClubId: v }))}
                        options={[{ value: '', label: 'Select club…' }, ...clubs.filter(c => c.leagueId === draftFootball.currentLeagueId).map(c => ({ value: c.id, label: c.name.en }))]}
                        placeholder="Select club…" />
                    ) : (
                      <div style={{ height: 34, border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t4)' }}>
                        Select a league first
                      </div>
                    )
                  }
                />
                <InfoRow label="Position(s)"   editing={editing}
                  display={
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(player.positions ?? [(player as any).position]).filter(Boolean).map(pos => (
                        <span key={pos} style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)' }}>{pos}</span>
                      ))}
                      {!(player.positions ?? [(player as any).position]).filter(Boolean).length && <span>—</span>}
                    </div>
                  }
                  edit={
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                      {POSITIONS.map(p => {
                        const on = (draftFootball.positions ?? []).includes(p.value)
                        return (
                          <button key={p.value} type="button"
                            onClick={() => {
                              const cur = draftFootball.positions ?? []
                              const next = on ? cur.filter((v: string) => v !== p.value) : [...cur, p.value]
                              setDraftFootball((d: any) => ({ ...d, positions: next }))
                            }}
                            style={{
                              fontFamily: 'var(--onest)', fontSize: 12, fontWeight: on ? 700 : 500,
                              padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                              border: `1px solid ${on ? 'var(--redBorder)' : 'var(--border2)'}`,
                              background: on ? 'var(--redDim)' : 'transparent',
                              color: on ? 'var(--red)' : 'var(--t2)',
                              transition: 'all .15s',
                            }}
                          >{p.label}</button>
                        )
                      })}
                    </div>
                  }
                />
                <InfoRow label="Preferred foot" editing={editing}
                  display={<span>{FOOT[player.preferredFoot as keyof typeof FOOT] ?? '—'}</span>}
                  edit={
                    <CustomSelect value={draftFootball.preferredFoot ?? ''} onChange={v => setDraftFootball((d: any) => ({ ...d, preferredFoot: v }))} searchable={false}
                      options={[{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }, { value: 'both', label: 'Both' }]} />
                  }
                />
                <InfoRow label="Height"        editing={editing}
                  display={<span style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)' }}>{player.height ? `${player.height} cm` : '—'}</span>}
                  edit={<InlineInput value={draftFootball.height ?? ''} onChange={v => setDraftFootball((d: any) => ({ ...d, height: v.replace(/\D/g, '').slice(0, 3) }))} placeholder="cm" type="tel" />}
                />
                <InfoRow label="Contract start" editing={editing}
                  display={<span>{player.contractStart ? fmtDate(player.contractStart) : '—'}</span>}
                  edit={<InlineInput value={draftFootball.contractStart ?? ''} onChange={v => setDraftFootball((d: any) => ({ ...d, contractStart: v }))} type="date" />}
                />
                <InfoRow label="Contract end"   editing={editing}
                  display={<span>{player.contractEnd ? fmtDate(player.contractEnd) : '—'}</span>}
                  edit={<InlineInput value={draftFootball.contractEnd ?? ''} onChange={v => setDraftFootball((d: any) => ({ ...d, contractEnd: v }))} type="date" />}
                />
              {careerSchemas.map(schema => {
        const raw = (player.dynamicFieldValues ?? []).find((fv: any) => fv.fieldSchemaId === schema.id)
        return (
          <InfoRow
            key={schema.id}
            label={`${schema.label.en}${schema.isRequired ? ' *' : ''}`}
            editing={editing}
            display={<DynamicFieldDisplay schema={schema} value={raw?.value != null ? String(raw.value) : undefined} />}
            edit={
              <DynamicFieldInput
                schema={schema}
                value={draftDynamic[schema.id] ?? ''}
                onChange={v => setDraftDynamic(d => ({ ...d, [schema.id]: v }))}
              />
            }
          />
        )
      })}
    </div>
  )}
</EditableCard>

          {/* NATIONALITIES */}
          <EditableCard title="Nationalities" target="player" section=""
            saving={savingCard === 'nat'}
            canEdit={canEditPlayers}
            showAddField={false}
            onSaved={() => toast.success('Nationalities saved')}
            onSaveFailed={() => toast.error('Failed to save nationalities')}
            onSave={async () => {
              setSavingCard('nat')
              try { await patch({ nationalities: draftNat }) } finally { setSavingCard(null) }
            }}
          >
            {(editing) => (
              <div>
                {(editing ? draftNat : (player.nationalities ?? [])).map((nat: any, i: number) => {
                  const isEgyptian = nat.countryCode === 'EG' && i === 0
                  return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${nat.isPrimary ? 'var(--red)' : 'transparent'}`,
                  }}>
                    <img src={FLAG(nat.countryCode)} alt={nat.countryCode} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />
                    {editing ? (
                      <div className="nat-edit-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                        {isEgyptian ? (
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1 }}>Egypt</span>
                        ) : (
                          <div style={{ flex: 1 }}>
                            <CustomSelect value={nat.countryCode}
                              onChange={v => setDraftNat(n => n.map((x: any, j: number) => j === i ? { ...x, countryCode: v } : x))}
                              options={COUNTRIES.map(c => ({ value: c.code, label: c.name, flag: `https://flagcdn.com/20x15/${c.code.toLowerCase()}.png` }))}
                            />
                          </div>
                        )}
                        <input value={nat.passportNumber ?? ''}
                          onChange={e => setDraftNat(n => n.map((x: any, j: number) => j === i ? { ...x, passportNumber: e.target.value.toUpperCase() } : x))}
                          placeholder="Passport number"
                          style={{ height: 30, border: '1px solid var(--border2)', borderRadius: 4, background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', padding: '0 8px', outline: 'none', width: 130 }}
                        />
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, border: `1px solid ${nat.isPrimary ? 'var(--red)' : 'var(--border2)'}`, background: nat.isPrimary ? 'var(--redDim)' : 'transparent', color: nat.isPrimary ? 'var(--red)' : 'var(--t3)', whiteSpace: 'nowrap' as const }}>
                          {nat.isPrimary ? '★ Primary' : 'Secondary'}
                        </span>
                        {!isEgyptian && (
                          <button onClick={() => setDraftNat(n => n.filter((_: any, j: number) => j !== i))}
                            style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                          >Remove</button>
                        )}
                      </div>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1 }}>
                          {COUNTRIES.find(c => c.code === nat.countryCode)?.name ?? nat.countryCode}
                        </span>
                        {nat.isPrimary && (
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)' }}>Primary</span>
                        )}
                        {nat.passportNumber && (
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t2)', letterSpacing: '.06em' }}>{nat.passportNumber}</span>
                        )}
                      </>
                    )}
                  </div>
                )})}
                {editing && (
                  <div style={{ padding: '8px 16px' }}>
                    {draftNat.length < 4 ? (
                      <button onClick={() => setDraftNat((n: any[]) => [...n, { countryCode: 'MA', isPrimary: false, passportNumber: '' }])}
                        style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, color: 'var(--red)', background: 'transparent', border: '1px dashed rgba(200,16,46,.3)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>
                        + Add nationality ({draftNat.length}/4)
                      </button>
                    ) : (
                      <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>Maximum of 4 nationalities reached</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </EditableCard>

          {/* STRENGTHS & WEAKNESSES */}
          <div style={{ gridColumn: 'span 3' }}>
          <EditableCard title="Strengths & Weaknesses" target="player" section=""
            saving={savingCard === 'sw'}
            canEdit={canEditPlayers}
            showAddField={false}
            onSaved={() => toast.success('Strengths & weaknesses saved')}
            onSaveFailed={() => toast.error('Failed to save')}
            onSave={async () => {
              setSavingCard('sw')
              try { await patch({ strengths: draftSW.strengths, weaknesses: draftSW.weaknesses }) } finally { setSavingCard(null) }
            }}
          >
            {(editing) => (
              <div className="sw-grid" style={{ padding: '12px 16px 14px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 8 }}>Strengths</div>
                  {editing
                    ? <TagInput tags={draftSW.strengths} onChange={(t: string[]) => setDraftSW(d => ({ ...d, strengths: t }))} variant="strength" />
                    : (
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                        {(player.strengths ?? []).length === 0
                          ? <span style={{ fontSize: 12, color: 'var(--t3)' }}>None recorded</span>
                          : (player.strengths ?? []).map(s => (
                            <span key={s} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 3, background: 'var(--greenDim)', border: '1px solid rgba(22,163,74,.18)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                              {s}
                            </span>
                          ))
                        }
                      </div>
                    )
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 8 }}>Weaknesses</div>
                  {editing
                    ? <TagInput tags={draftSW.weaknesses} onChange={(t: string[]) => setDraftSW(d => ({ ...d, weaknesses: t }))} variant="weakness" />
                    : (
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                        {(player.weaknesses ?? []).length === 0
                          ? <span style={{ fontSize: 12, color: 'var(--t3)' }}>None recorded</span>
                          : (player.weaknesses ?? []).map(w => (
                            <span key={w} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                              {w}
                            </span>
                          ))
                        }
                      </div>
                    )
                  }
                </div>
              </div>
            )}
          </EditableCard>
          </div>

          {/* ADDITIONAL / DYNAMIC FIELDS */}
          <EditableCard
            title="Additional Information"
            target="player"
            section="additional"
            saving={savingCard === 'dynamic'}
            canEdit={canEditPlayers}
            onFieldCreated={(schema) => {
              setAdditionalSchemas(s => [...s, schema])
              setDraftDynamic(d => ({ ...d, [schema.id]: '' }))
            }}
            onSaved={() => toast.success('Additional info saved')}
            onSaveFailed={() => toast.error('Failed to save')}
            onSave={async () => {
              setSavingCard('dynamic')
              try {
                await patch({
                  dynamicFieldValues: [
                    ...(player.dynamicFieldValues ?? []).filter((fv: any) =>
                      !additionalSchemas.find(s => s.id === fv.fieldSchemaId)
                    ),
                    ...additionalSchemas.map(s => ({ fieldSchemaId: s.id, value: draftDynamic[s.id] ?? '' })),
                  ],
                })
              } finally {
                setSavingCard(null)
              }
            }}
          >
            {(editing) => (
              <div>
      {additionalSchemas.length === 0 ? (
        <div style={{ padding: 16, fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)' }}>
          No custom fields yet. {editing ? 'Use "Add field to all players" below.' : 'Click Edit to add one.'}
        </div>
      ) : (
        additionalSchemas.map(schema => {
          const raw = (player.dynamicFieldValues ?? []).find((fv: any) => fv.fieldSchemaId === schema.id)
          return (
            <InfoRow
              key={schema.id}
              label={`${schema.label.en}${schema.isRequired ? ' *' : ''}`}
              editing={editing}
              display={<DynamicFieldDisplay schema={schema} value={raw?.value != null ? String(raw.value) : undefined} />}
              edit={
                <DynamicFieldInput
                  schema={schema}
                  value={draftDynamic[schema.id] ?? ''}
                  onChange={v => setDraftDynamic(d => ({ ...d, [schema.id]: v }))}
                />
              }
            />
          )
        })
      )}
              </div>
            )}
          </EditableCard>

          {/* CLUB HISTORY */}
          <EditableCard title="Club History" target="player" section=""
            saving={savingCard === 'history'}
            canEdit={canEditPlayers}
            showAddField={false}
            onSaved={() => toast.success('Club history saved')}
            onSaveFailed={() => toast.error('Failed to save club history')}
            onSave={async () => {
              setSavingCard('history')
              try { await patch({ clubHistory: draftHistory }) } finally { setSavingCard(null) }
            }}
          >
            {(editing) => {
              // Build display list: ensure current club is always shown at top
              const history = editing ? draftHistory : (player.clubHistory ?? [])
              const currentClubInHistory = history.some((h: any) => h.isCurrent || (!h.to && !h.leaveDate))
              const displayHistory = !editing && player.currentClubId && !currentClubInHistory
                ? [{ clubId: player.currentClubId, clubName: clubName(player.currentClubId), from: null, to: null, isCurrent: true }, ...history]
                : history
              return (
              <div>
                {displayHistory.map((h: any, i: number) => {
                  const isCurrent = h.isCurrent || (!h.to && !h.leaveDate)
                  const fromDate = h.from ?? h.joinDate
                  const toDate = h.to ?? h.leaveDate
                  const fmtRange = () => {
                    const f = fromDate ? new Date(fromDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'
                    const t = toDate ? new Date(toDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null
                    return isCurrent ? `${f} — Present` : `${f} — ${t ?? '—'}`
                  }
                  return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: isCurrent ? '11px 16px' : '9px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: isCurrent && !editing ? 'rgba(200,16,46,.03)' : 'transparent',
                    borderLeft: isCurrent ? '3px solid var(--red)' : '3px solid transparent',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isCurrent ? 'var(--red)' : 'var(--s3)', border: `1.5px solid ${isCurrent ? 'var(--red)' : 'var(--border2)'}`, boxShadow: isCurrent ? '0 0 6px rgba(200,16,46,.4)' : 'none' }} />
                    {editing ? (
                      <>
                        <div style={{ flex: 1 }}>
                          <CustomSelect value={h.clubId ?? ''}
                            onChange={v => setDraftHistory((d: any[]) => d.map((x, j) => j === i ? { ...x, clubId: v } : x))}
                            options={[{ value: '', label: 'Select club…' }, ...clubs.map(c => ({ value: c.id, label: c.name.en }))]}
                            placeholder="Select club…" />
                        </div>
                        <input type="date" value={fromDate ?? ''}
                          onChange={e => setDraftHistory((d: any[]) => d.map((x, j) => j === i ? { ...x, from: e.target.value, joinDate: e.target.value } : x))}
                          style={{ height: 30, border: '1px solid var(--border2)', borderRadius: 4, background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', padding: '0 8px', outline: 'none', width: 130 }} />
                        <input type="date" value={toDate ?? ''}
                          onChange={e => setDraftHistory((d: any[]) => d.map((x, j) => j === i ? { ...x, to: e.target.value, leaveDate: e.target.value } : x))}
                          placeholder="Leave date"
                          style={{ height: 30, border: '1px solid var(--border2)', borderRadius: 4, background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', padding: '0 8px', outline: 'none', width: 130 }} />
                        <button onClick={() => setDraftHistory((d: any[]) => d.filter((_, j) => j !== i))}
                          style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                        >Remove</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: 'var(--t1)', flex: 1 }}>
                          {h.clubName ?? clubName(h.clubId)}
                        </span>
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: isCurrent ? 'var(--t2)' : 'var(--t3)' }}>
                          {fmtRange()}
                        </span>
                        {isCurrent && (
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)', letterSpacing: '.06em' }}>
                            PRESENT
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )})}
                {(player.clubHistory ?? []).length === 0 && !editing && (
                  <div style={{ padding: '16px', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)' }}>No history recorded</div>
                )}
                {editing && (
                  <div style={{ padding: '8px 16px' }}>
                    <button onClick={() => setDraftHistory((d: any[]) => [...d, { clubId: '', joinDate: '', leaveDate: '', isCurrent: false }])}
                      style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, color: 'var(--red)', background: 'transparent', border: '1px dashed rgba(200,16,46,.3)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>
                      + Add club entry
                    </button>
                  </div>
                )}
              </div>
            )}}
          </EditableCard>

          {/* GUARDIAN CONTACT */}
          <EditableCard title="Guardian Contact" target="player" section="contact"
            saving={savingCard === 'contact'}
            canEdit={canEditPlayers}
            onFieldCreated={schema => setContactSchemas(s => [...s, schema])}
            onSaved={() => toast.success('Contact info saved')}
            onSaveFailed={() => toast.error('Failed to save contact info')}
            onSave={async () => {
              const email = draftContact.fatherEmail?.trim()
              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setEmailError('Enter a valid email address')
                throw new Error('validation')
              }
              setSavingCard('contact')
              try {
                await patch({
                  fatherName:  draftContact.fatherName,
                  fatherPhone: (draftContact.fatherPhone ?? '').replace(/[^\d]/g, ''),
                  fatherEmail: email || null,
                })
              } finally {
                setSavingCard(null)
              }
            }}
          >
            {(editing) => (
              <div>
                <InfoRow label="Father's name"  editing={editing}
                  display={<span style={textStyle(player.fatherName ?? '')}>{player.fatherName || '—'}</span>}
                  edit={<InlineInput value={draftContact.fatherName ?? ''} onChange={v => setDraftContact((d: any) => ({ ...d, fatherName: v }))} />}
                />
                <InfoRow label="Phone"          editing={editing}
                  display={<span style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)' }}>{player.fatherPhone || '—'}</span>}
                  edit={<InlineInput value={draftContact.fatherPhone ?? ''} onChange={v => setDraftContact((d: any) => ({ ...d, fatherPhone: v.replace(/[^\d]/g, '').slice(0, 15) }))} type="tel" placeholder="Digits only — no spaces or symbols" />}
                />
                <InfoRow label="Email"          editing={editing}
                  display={<span style={{ fontSize: 12, color: 'var(--t2)' }}>{player.fatherEmail || '—'}</span>}
                  edit={
                    <div>
                      <input
                        type="email"
                        value={draftContact.fatherEmail ?? ''}
                        onChange={e => {
                          setDraftContact((d: any) => ({ ...d, fatherEmail: e.target.value }))
                          setEmailError(null)
                        }}
                        onBlur={e => {
                          const val = e.target.value.trim()
                          if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                            setEmailError('Enter a valid email address')
                          }
                        }}
                        placeholder="guardian@example.com"
                        style={{
                          width: '100%', height: 34,
                          border: `1px solid ${emailError ? 'var(--red)' : 'var(--border2)'}`,
                          borderRadius: 'var(--r)', background: 'var(--bg)',
                          fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)',
                          padding: '0 12px', outline: 'none',
                        }}
                      />
                      {emailError && (
                        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                          {emailError}
                        </div>
                      )}
                    </div>
                  }
                />
{contactSchemas.map(schema => {
        const raw = (player.dynamicFieldValues ?? []).find((fv: any) => fv.fieldSchemaId === schema.id)
        return (
          <InfoRow
            key={schema.id}
            label={schema.label.en}
            editing={editing}
            display={<DynamicFieldDisplay schema={schema} value={raw?.value != null ? String(raw.value) : undefined} />}
            edit={
              <DynamicFieldInput
                schema={schema}
                value={draftDynamic[schema.id] ?? ''}
                onChange={v => setDraftDynamic(d => ({ ...d, [schema.id]: v }))}
              />
            }
          />
        )
      })}
    </div>
  )}
</EditableCard>

        </>)}

        {/* ══ MATCHES ══ */}
        {tab === 'matches' && (<>
<div
  className="stat-cards-4"
  style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}
>            <StatCard label="Appearances" value={analysis?.totalAppearances ?? 0} />
            <StatCard label="Goals"       value={analysis?.totalGoals ?? totalGoals} />
            <StatCard label="Assists"     value={analysis?.totalAssists ?? totalAssists} />
            <StatCard label="Minutes"     value={(analysis?.totalMinutes ?? totalMins).toLocaleString()} />
          </div>

<div style={{ gridColumn: 'span 3', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: 'var(--t2)' }}>Match History</span>
              {(canCreateMatches || canEditMatches) && (
                <span onClick={() => setShowMatchForm(true)} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, color: 'var(--red)', cursor: 'pointer' }}>
                  + Add Match
                </span>
              )}
            </div>
            {matches.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 700, color: 'var(--t3)' }}>No matches recorded</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as unknown as undefined }}>
              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' as const, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    {[
                    { h: 'Date',        cls: '' },
                    { h: 'Match',       cls: '' },
                    { h: 'Competition', cls: 'match-table-comp' },
                    { h: 'Mins',        cls: '' },
                    { h: 'Goals',       cls: '' },
                    { h: 'Assists',     cls: 'match-table-assists' },
                    { h: 'Added',       cls: '' },
                    { h: '',            cls: '' },
                  ].map(({ h, cls }) => (
                      <th key={h} className={cls} style={{ padding: '9px 16px', textAlign: 'left', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <React.Fragment key={m.id}>
                      <tr
                        style={{ borderBottom: 'none', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '9px 16px', fontFamily: 'var(--onest)', color: 'var(--t2)', fontSize: 12 }}>{fmtDate(m.matchDate)}</td>
                        <td style={{ padding: '9px 16px', fontWeight: 600 }}>{m.matchName}</td>
                        <td className="match-table-comp" style={{ padding: '9px 16px', color: 'var(--t2)' }}>{m.competition ?? '—'}</td>
                        <td style={{ padding: '9px 16px', fontFamily: 'var(--onest)', color: 'var(--t2)' }}>{m.minutesPlayed}'</td>
                        <td style={{ padding: '9px 16px', fontWeight: 700, color: m.goalsScored > 0 ? 'var(--red)' : 'var(--t3)' }}>{m.goalsScored > 0 ? m.goalsScored : '—'}</td>
                        <td className="match-table-assists" style={{ padding: '9px 16px', fontWeight: 700, color: m.assists > 0 ? 'var(--t2)' : 'var(--t3)' }}>{m.assists > 0 ? m.assists : '—'}</td>
                        <td style={{ padding: '9px 16px', fontFamily: 'var(--onest)', color: 'var(--t2)', fontSize: 12 }}>{m.createdAt ? fmtDate(m.createdAt) : '—'}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right' as const }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {canEditMatches && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setEditingMatch(m)
                                  setMatchEditDraft({
                                    matchName:     m.matchName,
                                    matchDate:     m.matchDate,
                                    competition:   m.competition ?? '',
                                    minutesPlayed: String(m.minutesPlayed),
                                    goalsScored:   String(m.goalsScored),
                                    assists:       String(m.assists),
                                    notes:         m.notes ?? '',
                                  })
                                }}
                                style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '3px 10px', border: '1px solid var(--border2)', borderRadius: 3, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}
                              >Edit</button>
                            )}
                            {canDeleteMatches && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeletingMatch(m) }}
                                style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '3px 10px', border: '1px solid var(--border2)', borderRadius: 3, background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,16,46,.4)'; e.currentTarget.style.color = '#C8102E'; e.currentTarget.style.background = 'rgba(200,16,46,.06)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent' }}
                              >Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {((matchMedia[m.id]?.length ?? 0) > 0 || canUploadMedia) && (
                      <tr key={`${m.id}-media`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={8} style={{ padding: '0 16px 14px' }}>
                          <div className="match-videos">
                            <div className="match-videos-header">
                              <span className="match-videos-label">
                                Videos
                                <span className="match-videos-count">{matchMedia[m.id]?.length ?? 0}</span>
                              </span>
                              {canUploadMedia && (matchMedia[m.id]?.length ?? 0) > 0 && (
                                <VideoUploadButton
                                  entityType="match"
                                  entityId={m.id}
                                  onUploaded={asset => setMatchMedia(prev => ({ ...prev, [m.id]: [...(prev[m.id] ?? []), asset] }))}
                                />
                              )}
                            </div>
                            {(matchMedia[m.id]?.length ?? 0) === 0 ? (
                              <div className="match-videos-empty">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                                  <span>No videos yet for this match.</span>
                                  {canUploadMedia && (
                                    <VideoUploadButton
                                      entityType="match"
                                      entityId={m.id}
                                      onUploaded={asset => setMatchMedia(prev => ({ ...prev, [m.id]: [...(prev[m.id] ?? []), asset] }))}
                                    />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="match-videos-strip">
                                {(matchMedia[m.id] ?? []).map(asset => {
                                  const title = asset.originalFilename?.replace(/\.[^/.]+$/, '') ?? 'Untitled video'
                                  return (
                                    <div
                                      key={asset.id}
                                      className="video-card"
                                      onClick={() => setOpenPlayer(asset)}
                                      title={asset.originalFilename}
                                    >
                                      <div className="video-card-thumb">
                                        <div className="video-card-play">
                                          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '6px 0 6px 11px', borderColor: 'transparent transparent transparent #fff', marginLeft: 3 }} />
                                        </div>
                                        {asset.notes.length > 0 && (
                                          <span className="video-card-notes-badge">{asset.notes.length} note{asset.notes.length === 1 ? '' : 's'}</span>
                                        )}
                                        {asset.durationSeconds != null && (
                                          <span className="video-card-duration">{fmtTime(asset.durationSeconds)}</span>
                                        )}
                                      </div>
                                      <div className="video-card-body">
                                        <div className="video-card-title">{title}</div>
                                        <div className="video-card-meta">
                                          <span>{fmtSize(asset.sizeBytes)}</span>
                                          {asset.uploadedAt && <span>{fmtDate(asset.uploadedAt)}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>)}

        {/* ══ ANALYSIS ══ */}
        {tab === 'analysis' && (<>
          {!analysis ? (
<div
  className="stat-cards-4"
  style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}
>              <div style={{ width: 24, height: 24, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : (<>
<div style={{ gridColumn: 'span 3', background: 'var(--bg)', border: `1px solid ${editingAnalysis ? 'rgba(200,16,46,.25)' : 'var(--border)'}`, borderRadius: 'var(--r)', overflow: 'hidden', transition: 'border-color .2s' }}>
  {/* header */}
  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: editingAnalysis ? 'rgba(200,16,46,.04)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background .2s' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: 'var(--t2)', textTransform: 'uppercase' as const }}>Performance Stats</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {!editingAnalysis && canEditPlayers && (
        <button onClick={() => {
          setEditingAnalysis(true)
          setAnalysisDraft({
            totalAppearances: String(analysis.totalAppearances),
            totalGoals: String(analysis.totalGoals),
            totalAssists: String(analysis.totalAssists),
            totalMinutes: String(analysis.totalMinutes),
          })
        }} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>
          Edit
        </button>
      )}
      {editingAnalysis && (
        <>
          <button onClick={() => setEditingAnalysis(false)} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
          {(analysis as any)._computed && (
            <button onClick={async () => {
              setSavingAnalysis(true)
              await apiFetch(`/api/players/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisStats: {} }) })
              const a = await apiFetch(`/api/players/${id}/analysis`).then(r => r.json())
              setAnalysis(a)
              setSavingAnalysis(false)
              setEditingAnalysis(false)
              toast.success('Reset to auto-computed values')
            }} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}>
              Reset to Auto
            </button>
          )}
          <button onClick={async () => {
            setSavingAnalysis(true)
            const stats: Record<string, number> = {}
            if (analysisDraft.totalAppearances) stats.totalAppearances = Number(analysisDraft.totalAppearances)
            if (analysisDraft.totalGoals)       stats.totalGoals       = Number(analysisDraft.totalGoals)
            if (analysisDraft.totalAssists)     stats.totalAssists     = Number(analysisDraft.totalAssists)
            if (analysisDraft.totalMinutes)     stats.totalMinutes     = Number(analysisDraft.totalMinutes)
            await apiFetch(`/api/players/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisStats: stats }) })
            const a = await apiFetch(`/api/players/${id}/analysis`).then(r => r.json())
            setAnalysis(a)
            setSavingAnalysis(false)
            setEditingAnalysis(false)
            toast.success('Analysis stats saved')
          }} disabled={savingAnalysis} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, padding: '4px 14px', border: '1px solid var(--red)', borderRadius: 4, background: savingAnalysis ? 'var(--t3)' : 'var(--red)', color: '#fff', cursor: savingAnalysis ? 'not-allowed' : 'pointer' }}>
            {savingAnalysis ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    </div>
  </div>

  {/* stat cards */}
  <div className="stat-cards-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: 16 }}>
    {editingAnalysis ? (
      <>
        {([
          { key: 'totalAppearances', label: 'Appearances' },
          { key: 'totalGoals',       label: 'Goals' },
          { key: 'totalAssists',     label: 'Assists' },
          { key: 'totalMinutes',     label: 'Minutes' },
        ] as const).map(f => (
          <div key={f.key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', borderTop: '2px solid var(--red)' }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 8 }}>{f.label}</div>
            <input
              type="number"
              value={analysisDraft[f.key] ?? ''}
              onChange={e => setAnalysisDraft(d => ({ ...d, [f.key]: e.target.value }))}
              placeholder="0"
              style={{ width: '100%', height: 36, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 18, fontWeight: 800, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            />
            {(analysis as any)._computed?.[f.key] != null && (
              <div style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                Auto: {(analysis as any)._computed[f.key]}
              </div>
            )}
            {f.key === 'totalAppearances' && (
              <div style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                Manual only
              </div>
            )}
          </div>
        ))}
      </>
    ) : (
      <>
        <StatCard label="Appearances" value={analysis.totalAppearances} />
        <StatCard label="Goals"       value={analysis.totalGoals} />
        <StatCard label="Assists"     value={analysis.totalAssists} />
        <StatCard label="Minutes"     value={analysis.totalMinutes.toLocaleString()} />
      </>
    )}
  </div>
</div>

            {/* Analysis Videos */}
<div style={{ gridColumn: 'span 3', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <span style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: 'var(--t2)' }}>Analysis Videos</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {analysisMedia.map(asset => (
                  <div
                    key={asset.id}
                    onClick={() => setOpenPlayer(asset)}
                    style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', transition: 'all .18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,16,46,.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,16,46,.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ height: 112, background: '#0A0A0A', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.65))' }} />
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 14px', borderColor: 'transparent transparent transparent #fff', marginLeft: 3 }} />
                      </div>
                      {asset.durationSeconds && (
                        <div style={{ position: 'absolute', bottom: 6, right: 8, zIndex: 1, fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 6px', borderRadius: 3 }}>
                          {fmtTime(asset.durationSeconds)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {asset.originalFilename}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)' }}>{fmtSize(asset.sizeBytes)}</span>
                        {asset.notes.length > 0 && (
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            💬 {asset.notes.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {canUploadMedia && (
                  <div
                    style={{ borderRadius: 10, minHeight: 162, border: '1.5px dashed var(--border2)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'var(--redDim)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <VideoUploadButton
                      entityType="analysis"
                      entityId={id!}
                      onUploaded={asset => setAnalysisMedia(prev => [...prev, asset])}
                    />
                    <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t4)' }}>MP4, MOV — up to 8 GB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis dynamic fields — editable */}
            <EditableCard
              title="Analysis Fields"
              target="analysis"
              section="analysis"
              saving={savingCard === 'analysis'}
              canEdit={canEditPlayers}
              onFieldCreated={schema => setAnalysisSchemasFull(s => [...s, schema])}
              onSaved={() => toast.success('Analysis fields saved')}
              onSaveFailed={() => toast.error('Failed to save analysis fields')}
              onSave={async () => {
                setSavingCard('analysis')
                try {
                  await apiFetch(`/api/players/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      analysisFieldValues: Object.entries(draftDynamic)
                        .map(([k, v]) => ({ fieldSchemaId: k, value: v })),
                    }),
                  })
                  // Reload analysis data so display updates
                  const a = await apiFetch(`/api/players/${id}/analysis`).then(r => r.json())
                  setAnalysis(a)
                } finally {
                  setSavingCard(null)
                }
              }}
            >
              {(editing) => (
                <div>
                  {analysisSchemasFull.length === 0 ? (
                    <div style={{ padding: 16, fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)' }}>
                      No analysis fields defined. {editing ? 'Use "Add field" below.' : 'Click Edit to add one.'}
                    </div>
                  ) : (
                    analysisSchemasFull.map(schema => {
                      const raw = (analysis.dynamicFieldValues ?? []).find((fv: any) => fv.fieldSchemaId === schema.id)
                      const displayVal = raw?.value != null ? String(raw.value) : undefined
                      const draftVal   = draftDynamic[schema.id] ?? ''
                      return (
                        <InfoRow
                          key={schema.id}
                          label={`${schema.label.en}${schema.isRequired ? ' *' : ''}`}
                          editing={editing}
                          display={<DynamicFieldDisplay schema={schema} value={displayVal} />}
                          edit={
                            <DynamicFieldInput
                              schema={schema}
                              value={draftVal}
                              onChange={v => setDraftDynamic(d => ({ ...d, [schema.id]: v }))}
                            />
                          }
                        />
                      )
                    })
                  )}
                </div>
              )}
            </EditableCard>
          </>)}
        </>)}
      </div>
    </div>

    <>
      {/* ── ADD MATCH MODAL ── */}
     {showMatchForm && (
  <div
    className="modal-overlay"
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
      background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={e => { if (e.target === e.currentTarget) setShowMatchForm(false) }}
  >
<div className="modal-sheet" style={{
  width: '100%', maxWidth: 640,
  background: 'var(--bg)',
  borderRadius: 12,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}}>
      {/* drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
      </div>

      {/* header — fixed, never scrolls */}
      <div style={{
        padding: '8px 20px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>Add Match</div>
        <button onClick={() => setShowMatchForm(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* scrollable body */}
      <div style={{
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
        flex: 1,
        padding: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
            <span>Match Name</span>
            <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: newMatch.matchName.length > 110 ? 'var(--red)' : 'var(--t4)' }}>{newMatch.matchName.length}/120</span>
          </div>
          <input type="text" value={newMatch.matchName}
            onChange={e => setNewMatch(m => ({ ...m, matchName: e.target.value.slice(0, 120) }))}
            placeholder="e.g. Al Ahly vs Zamalek — CAF QF"
            style={{ width: '100%', height: 40, border: `1px solid ${matchFormErrors.matchName ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 12px', outline: 'none', boxSizing: 'border-box' as any }}
          />
          {matchFormErrors.matchName && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{matchFormErrors.matchName}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Date</div>
            <input type="date" value={newMatch.matchDate}
              onChange={e => setNewMatch(m => ({ ...m, matchDate: e.target.value }))}
              style={{ width: '100%', height: 40, border: `1px solid ${matchFormErrors.matchDate ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' as any }}
            />
            {matchFormErrors.matchDate && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{matchFormErrors.matchDate}</div>}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Competition <span style={{ fontWeight: 400, textTransform: 'none' as const, fontSize: 10 }}>(optional)</span></div>
            <input type="text" value={newMatch.competition}
              onChange={e => setNewMatch(m => ({ ...m, competition: e.target.value }))}
              placeholder="e.g. CAF Champions League"
              style={{ width: '100%', height: 40, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' as any }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Minutes</div>
            <input type="number" value={newMatch.minutesPlayed}
              onChange={e => setNewMatch(m => ({ ...m, minutesPlayed: e.target.value }))}
              placeholder="90"
              style={{ width: '100%', height: 40, border: `1px solid ${matchFormErrors.minutesPlayed ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' as any }}
            />
            {matchFormErrors.minutesPlayed && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{matchFormErrors.minutesPlayed}</div>}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Goals</div>
            <input type="number" value={newMatch.goalsScored}
              onChange={e => setNewMatch(m => ({ ...m, goalsScored: e.target.value }))}
              style={{ width: '100%', height: 40, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' as any }}
            />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Assists</div>
            <input type="number" value={newMatch.assists}
              onChange={e => setNewMatch(m => ({ ...m, assists: e.target.value }))}
              style={{ width: '100%', height: 40, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' as any }}
            />
          </div>
        </div>

        {matchSchemasFull.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matchSchemasFull.map(schema => (
              <div key={schema.id}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>
                  {schema.label.en}{schema.isRequired ? ' *' : ''}
                </div>
                <DynamicFieldInput
                  schema={schema}
                  value={newMatch.dynamicFields?.[schema.id] ?? ''}
                  onChange={v => setNewMatch(m => ({ ...m, dynamicFields: { ...m.dynamicFields, [schema.id]: v } }))}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
            <span>Notes <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span></span>
            <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: newMatch.notes.length > 450 ? 'var(--red)' : 'var(--t4)' }}>{newMatch.notes.length}/500</span>
          </div>
          <textarea value={newMatch.notes} rows={3}
            onChange={e => setNewMatch(m => ({ ...m, notes: e.target.value.slice(0, 500) }))}
            placeholder="Match observations, performance notes, key moments…"
            style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '8px 10px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as any }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        </div>

        {/* video upload hint */}
        <div style={{
          background: 'var(--bg3)', border: '1px dashed var(--border2)', borderRadius: 'var(--r)',
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18, opacity: .4 }}>🎬</span>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
              Match Videos
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>
              You can upload videos after saving the match
            </div>
          </div>
        </div>

        <div style={{ height: 4 }} />
      </div>

      {/* footer — always visible, never scrolls away */}
      <div style={{
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10,
        flexShrink: 0,
        background: 'var(--bg)',
        borderRadius: '0 0 12px 12px',
      }}>
        <button onClick={() => setShowMatchForm(false)} style={{ flex: 1, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', borderRadius: 8, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
        <button onClick={submitMatch} disabled={matchSaving} style={{ flex: 2, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: matchSaving ? 'var(--t3)' : 'var(--red)', color: '#fff', cursor: matchSaving ? 'not-allowed' : 'pointer' }}>
          {matchSaving ? 'Saving…' : 'Save Match'}
        </button>
      </div>
    </div>
  </div>
)}
      {/* ── EDIT MATCH MODAL ── */}
      {editingMatch && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditingMatch(null) }}
        >
          <div className="modal-sheet" style={{ width: '100%', maxWidth: 640, background: 'var(--bg)', borderRadius: 12, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-drag-handle" style={{ display: 'none', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>Edit Match</div>
              <button onClick={() => setEditingMatch(null)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {/* Match Name */}
              <div>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Match Name</span>
                  <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: (matchEditDraft.matchName ?? '').length > 110 ? 'var(--red)' : 'var(--t4)' }}>{(matchEditDraft.matchName ?? '').length}/120</span>
                </div>
                <input type="text" value={matchEditDraft.matchName ?? ''}
                  onChange={e => setMatchEditDraft((d: any) => ({ ...d, matchName: e.target.value.slice(0, 120) }))}
                  placeholder="e.g. Al Ahly vs Zamalek — CAF QF"
                  style={{ width: '100%', height: 36, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {/* Date + Competition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Date</div>
                  <input type="date" value={matchEditDraft.matchDate ?? ''}
                    onChange={e => setMatchEditDraft((d: any) => ({ ...d, matchDate: e.target.value }))}
                    style={{ width: '100%', height: 36, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Competition <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span></div>
                  <input type="text" value={matchEditDraft.competition ?? ''}
                    onChange={e => setMatchEditDraft((d: any) => ({ ...d, competition: e.target.value }))}
                    placeholder="e.g. CAF Champions League"
                    style={{ width: '100%', height: 36, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                {([
                  { label: 'Minutes Played', key: 'minutesPlayed', type: 'number' },
                  { label: 'Goals',            key: 'goalsScored',   type: 'number' },
                  { label: 'Assists',          key: 'assists',       type: 'number' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>{f.label}</div>
                    <input type={f.type} value={matchEditDraft[f.key] ?? ''}
                      onChange={e => setMatchEditDraft((d: any) => ({ ...d, [f.key]: e.target.value }))}
                      style={{ width: '100%', height: 36, border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              {/* Notes */}
              <div>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notes <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span></span>
                  <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: (matchEditDraft.notes ?? '').length > 450 ? 'var(--red)' : 'var(--t4)' }}>{(matchEditDraft.notes ?? '').length}/500</span>
                </div>
                <textarea value={matchEditDraft.notes ?? ''} rows={4}
                  onChange={e => setMatchEditDraft((d: any) => ({ ...d, notes: e.target.value.slice(0, 500) }))}
                  placeholder="Match observations, performance notes, key moments…"
                  style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', padding: '8px 10px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setEditingMatch(null)} style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '8px 18px', border: '1px solid var(--border2)', borderRadius: 5, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveMatchEdit} disabled={matchEditSaving} style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '8px 22px', border: '1px solid #C8102E', borderRadius: 5, background: matchEditSaving ? 'var(--t3)' : '#C8102E', color: '#fff', cursor: matchEditSaving ? 'not-allowed' : 'pointer' }}>
                {matchEditSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MATCH CONFIRM ── */}
      {deletingMatch && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setDeletingMatch(null) }}
        >
          <div className="modal-sheet" style={{ width: '100%', maxWidth: 480, background: 'var(--bg)', borderRadius: 12, padding: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>Delete this match?</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
              <strong>{deletingMatch.matchName}</strong> · {new Date(deletingMatch.matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{deletingMatch.competition ? ` · ${deletingMatch.competition}` : ''}
              <br />This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletingMatch(null)} style={{ flex: 1, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', borderRadius: 8, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteMatch} style={{ flex: 1, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: '#C8102E', color: '#fff', cursor: 'pointer' }}>Delete Match</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PLAYER CONFIRM ── */}
      {showDeletePlayer && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeletePlayer(false) }}
        >
          <div className="modal-sheet" style={{ width: '100%', maxWidth: 480, background: 'var(--bg)', borderRadius: 12, padding: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>Delete {player.name.en}?</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
              This will permanently remove the player and all associated records. This cannot be undone.
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: '#C8102E', background: 'rgba(200,16,46,.06)', border: '1px solid rgba(200,16,46,.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 20 }}>
              All matches, videos, and notes for this player will also be deleted.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeletePlayer(false)} style={{ flex: 1, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', borderRadius: 8, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeletePlayer} disabled={deletingPlayer} style={{ flex: 1, height: 44, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: deletingPlayer ? 'var(--t3)' : '#C8102E', color: '#fff', cursor: deletingPlayer ? 'not-allowed' : 'pointer' }}>
                {deletingPlayer ? 'Deleting…' : 'Delete Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PLAYER MODAL ── */}
      {openPlayer && (
        <div className="video-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setOpenPlayer(null) }}>
          <div style={{ width: '100%', maxWidth: 1140 }}>
            <VideoPlayer
              asset={openPlayer}
              currentUser={currentUser?.nameEn}
              onNoteEdited={note => {
                const updated = { ...openPlayer, notes: openPlayer.notes.map(n => n.id === note.id ? note : n) }
                setOpenPlayer(updated)
                setMatchMedia(prev => {
                  const key = Object.keys(prev).find(k => prev[k].some(a => a.id === openPlayer.id))
                  if (!key) return prev
                  return { ...prev, [key]: prev[key].map(a => a.id === openPlayer.id ? updated : a) }
                })
                setAnalysisMedia(prev => prev.map(a => a.id === openPlayer.id ? updated : a))
              }}
              onNoteAdded={note => {
                const updated = { ...openPlayer, notes: [...openPlayer.notes, note] }
                setOpenPlayer(updated)
                setMatchMedia(prev => {
                  const key = Object.keys(prev).find(k => prev[k].some(a => a.id === openPlayer.id))
                  if (!key) return prev
                  return { ...prev, [key]: prev[key].map(a => a.id === openPlayer.id ? updated : a) }
                })
                setAnalysisMedia(prev => prev.map(a => a.id === openPlayer.id ? updated : a))
              }}
              onNoteDeleted={noteId => {
                const updated = { ...openPlayer, notes: openPlayer.notes.filter(n => n.id !== noteId) }
                setOpenPlayer(updated)
                setMatchMedia(prev => {
                  const key = Object.keys(prev).find(k => prev[k].some(a => a.id === openPlayer.id))
                  if (!key) return prev
                  return { ...prev, [key]: prev[key].map(a => a.id === openPlayer.id ? updated : a) }
                })
                setAnalysisMedia(prev => prev.map(a => a.id === openPlayer.id ? updated : a))
              }}
            />
          </div>
        </div>
      )}
    </>
  </>)
}