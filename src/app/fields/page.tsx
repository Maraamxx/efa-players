'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FieldSchema, FieldType, FieldTarget } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'
import { AppNav } from '@/components/AppNav'
import { textStyle } from '@/lib/font'
import { useCan, useAuth } from '@/lib/auth'

// ── types ─────────────────────────────────────────────────────────────────────

interface DraftSchema {
  labelEn: string
  labelAr: string
  fieldType: FieldType
  entityTarget: FieldTarget
  isRequired: boolean
  options: { en: string; ar: string }[]
}

const EMPTY_DRAFT: DraftSchema = {
  labelEn: '',
  labelAr: '',
  fieldType: 'text',
  entityTarget: 'player',
  isRequired: false,
  options: [],
}

const FIELD_TYPES: { value: FieldType; label: string; desc: string }[] = [
  { value: 'text',        label: 'Text',         desc: 'Single line of text'         },
  { value: 'number',      label: 'Number',        desc: 'Numeric value'               },
  { value: 'date',        label: 'Date',          desc: 'Calendar date picker'        },
  { value: 'boolean',     label: 'Yes / No',      desc: 'Toggle switch'               },
  { value: 'select',      label: 'Dropdown',      desc: 'Choose one from a list'      },
  { value: 'multiselect', label: 'Multi-select',  desc: 'Choose multiple from a list' },
  { value: 'radio',       label: 'Radio buttons', desc: 'Visible button choices'      },
  { value: 'file',        label: 'File upload',   desc: 'Attach a file or document'   },
]

const TARGETS: { value: FieldTarget; label: string }[] = [
  { value: 'player',   label: 'Player profile'  },
  { value: 'match',    label: 'Match record'     },
  { value: 'analysis', label: 'Analysis tab'     },
]

const TYPE_ICON: Record<FieldType, string> = {
  text:        'Aa',
  number:      '12',
  date:        '📅',
  boolean:     '◐',
  select:      '▾',
  multiselect: '▾▾',
  radio:       '◉',
  file:        '↑',
}

// ── shared components ─────────────────────────────────────────────────────────


function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{
      fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
      letterSpacing: '.06em', textTransform: 'uppercase' as const,
      color: 'var(--t3)', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {children}
      {required && <span style={{ color: 'var(--red)' }}>*</span>}
    </div>
  )
}

function Input({
  value, onChange, placeholder, lang, type = 'text',
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; lang?: 'ar' | 'en'; type?: string
}) {
  const [focused, setFocused] = useState(false)
  const arabic = lang === 'ar'
  const ARABIC_RE = /[\u0600-\u06FF]/
  const LATIN_RE  = /[a-zA-Z]/

  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => {
        const v = e.target.value
        if (lang === 'ar' && LATIN_RE.test(v)) return
        if (lang === 'en' && ARABIC_RE.test(v)) return
        onChange(v)
      }}
      style={{
        width: '100%', height: 38,
        border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
        borderRadius: 'var(--r)', background: 'var(--bg)',
        fontFamily: arabic ? 'var(--arabic)' : 'var(--onest)',
        fontSize: arabic ? 15 : 13, fontWeight: 500,
        color: 'var(--t1)', padding: '0 12px', outline: 'none',
        direction: arabic ? 'rtl' : 'ltr',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s',
      }}
    />
  )
}

function Select({
  value, onChange, children,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
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
        color: 'var(--t1)', padding: '0 12px',
        outline: 'none', cursor: 'pointer',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s',
      }}
    >
      {children}
    </select>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function FieldsPage() {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const canCreate = useCan('fields', 'create')
  const canEdit   = useCan('fields', 'edit')
  const canDelete = useCan('fields', 'delete')
  const canView   = useCan('fields', 'view')
  const [schemas,    setSchemas]    = useState<FieldSchema[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [draft,      setDraft]      = useState<DraftSchema>(EMPTY_DRAFT)
  const [saving,     setSaving]     = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [filterTarget, setFilterTarget] = useState<FieldTarget | 'all'>('all')
  const [optionInput,  setOptionInput]  = useState({ en: '', ar: '' })
  const [errors,     setErrors]     = useState<Partial<Record<keyof DraftSchema, string>>>({})

  const load = () => {
    setLoading(true)
    apiFetch('/api/field-schemas')
      .then(r => r.json())
      .then(setSchemas)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (!authLoading && !canView) router.replace('/players') }, [authLoading])

  if (!canView) return null

  const set = (key: keyof DraftSchema, value: any) => {
    setDraft(d => ({ ...d, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const openCreate = () => {
    setDraft(EMPTY_DRAFT)
    setEditId(null)
    setOptionInput({ en: '', ar: '' })
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (schema: FieldSchema) => {
    setDraft({
      labelEn:      schema.label.en,
      labelAr:      schema.label.ar,
      fieldType:    schema.fieldType,
      entityTarget: schema.entityTarget,
      isRequired:   schema.isRequired,
      options:      (schema.options ?? []).map(o => ({ en: o.en, ar: o.ar })),
    })
    setEditId(schema.id)
    setOptionInput({ en: '', ar: '' })
    setErrors({})
    setShowForm(true)
  }

  const validate = () => {
    const e: Partial<Record<keyof DraftSchema, string>> = {}
    if (!draft.labelEn.trim()) e.labelEn = 'Required'
    if (!draft.labelAr.trim()) e.labelAr = 'Required'
    if (['select','multiselect','radio'].includes(draft.fieldType) && draft.options.length < 2)
      e.options = 'Add at least 2 options'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      label:        { en: draft.labelEn, ar: draft.labelAr },
      fieldType:    draft.fieldType,
      entityTarget: draft.entityTarget,
      isRequired:   draft.isRequired,
      sortOrder:    editId
        ? (schemas.find(s => s.id === editId)?.sortOrder ?? schemas.length)
        : schemas.length,
      options:      draft.options.length
        ? draft.options.map(o => ({ en: o.en, ar: o.ar }))
        : null,
      validationRules: null,
    }
    if (editId) {
      await apiFetch(`/api/field-schemas/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await apiFetch('/api/field-schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const deleteSchema = async (id: string) => {
    await apiFetch(`/api/field-schemas/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  const addOption = () => {
    if (!optionInput.en.trim() || !optionInput.ar.trim()) return
    set('options', [...draft.options, { en: optionInput.en.trim(), ar: optionInput.ar.trim() }])
    setOptionInput({ en: '', ar: '' })
  }

  const removeOption = (i: number) =>
    set('options', draft.options.filter((_, j) => j !== i))

  const needsOptions = ['select', 'multiselect', 'radio'].includes(draft.fieldType)

  const filtered = filterTarget === 'all'
    ? schemas
    : schemas.filter(s => s.entityTarget === filterTarget)

  const grouped = TARGETS.reduce((acc, t) => {
    acc[t.value] = filtered.filter(s => s.entityTarget === t.value)
    return acc
  }, {} as Record<FieldTarget, FieldSchema[]>)

  // ── styles ──
  const card = {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--r)', overflow: 'hidden' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <AppNav />

      {/* page header */}
      <div style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '20px 24px', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
            letterSpacing: '.1em', textTransform: 'uppercase' as const,
            color: 'var(--t3)', marginBottom: 4,
          }}>
            SYSTEM SETTINGS
          </div>
          <h1 style={{
            fontFamily: 'var(--onest)', fontSize: 24, fontWeight: 800,
            letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1,
          }}>
            Custom Fields
          </h1>
          <p style={{
            fontFamily: 'var(--onest)', fontSize: 13,
            color: 'var(--t3)', marginTop: 4,
          }}>
            {schemas.length} field{schemas.length !== 1 ? 's' : ''} defined —
            applied globally to all players
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            style={{
              fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
              padding: '9px 22px', border: '1px solid var(--red)',
              borderRadius: 5, background: 'var(--red)',
              color: '#fff', cursor: 'pointer',
            }}
          >
            + Add Field
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[{ value: 'all', label: 'All Fields' }, ...TARGETS].map(t => (
            <button
              key={t.value}
              onClick={() => setFilterTarget(t.value as any)}
              style={{
                fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600,
                padding: '6px 16px', borderRadius: 5, cursor: 'pointer',
                border: '1px solid',
                borderColor: filterTarget === t.value ? 'var(--red)' : 'var(--border2)',
                background: filterTarget === t.value ? 'var(--redDim)' : 'transparent',
                color: filterTarget === t.value ? 'var(--red)' : 'var(--t3)',
                transition: 'all .15s',
              }}
            >
              {t.label}
              {t.value !== 'all' && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 700,
                  color: filterTarget === t.value ? 'var(--red)' : 'var(--t4)',
                }}>
                  {schemas.filter(s => s.entityTarget === t.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid var(--red)', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin .7s linear infinite',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : schemas.length === 0 ? (
          <div style={{
            ...card, padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--onest)', fontSize: 32, fontWeight: 800,
              color: 'var(--t4)', marginBottom: 12,
            }}>
              ⊕
            </div>
            <div style={{
              fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 700,
              color: 'var(--t2)', marginBottom: 6,
            }}>
              No custom fields yet
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>
              Custom fields appear on every player profile automatically once created.
            </div>
            <button
              onClick={openCreate}
              style={{
                fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                padding: '9px 22px', border: '1px solid var(--red)',
                borderRadius: 5, background: 'var(--red)', color: '#fff', cursor: 'pointer',
              }}
            >
              + Add your first field
            </button>
          </div>
        ) : (
          // grouped by target
          TARGETS.filter(t => filterTarget === 'all' || t.value === filterTarget).map(target => (
            grouped[target.value].length > 0 && (
              <div key={target.value} style={{ marginBottom: 28 }}>
                <div style={{
                  fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase' as const,
                  color: 'var(--t3)', marginBottom: 10,
                  paddingBottom: 8, borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{target.label}</span>
                  <span style={{ fontWeight: 400 }}>{grouped[target.value].length} field{grouped[target.value].length !== 1 ? 's' : ''}</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 10,
                }}>
                  {grouped[target.value].map(schema => (
                    <div
                      key={schema.id}
                      style={{
                        ...card,
                        transition: 'border-color .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,.14)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{
                        padding: '12px 14px',
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                          {/* type badge */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 6,
                            background: 'var(--bg3)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                            color: 'var(--t3)', flexShrink: 0, letterSpacing: '.02em',
                          }}>
                            {TYPE_ICON[schema.fieldType]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* English label */}
                            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                              {schema.label.en}
                            </div>
                            {schema.label.ar && (
                              <div style={{ fontFamily: 'var(--arabic)', fontSize: 13, color: 'var(--t3)', direction: 'rtl' as const, textAlign: 'left' as const, marginTop: 2 }}>
                                {schema.label.ar}
                              </div>
                            )}
                            {/* meta row */}
                            <div style={{
                              display: 'flex', gap: 6, marginTop: 8,
                              flexWrap: 'wrap' as const,
                            }}>
                              <span style={{
                                fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600,
                                padding: '2px 7px', borderRadius: 3,
                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                color: 'var(--t3)', letterSpacing: '.04em',
                              }}>
                                {FIELD_TYPES.find(f => f.value === schema.fieldType)?.label}
                              </span>
                              {schema.isRequired && (
                                <span style={{
                                  fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600,
                                  padding: '2px 7px', borderRadius: 3,
                                  background: 'var(--redDim)', border: '1px solid var(--redBorder)',
                                  color: 'var(--red)', letterSpacing: '.04em',
                                }}>
                                  Required
                                </span>
                              )}
                              {schema.options && schema.options.length > 0 && (
                                <span style={{
                                  fontFamily: 'var(--onest)', fontSize: 10,
                                  color: 'var(--t3)',
                                }}>
                                  {schema.options.length} options
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* actions */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(schema)}
                              style={{
                                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
                                padding: '5px 10px', border: '1px solid var(--border2)',
                                borderRadius: 4, background: 'transparent',
                                color: 'var(--t2)', cursor: 'pointer', transition: 'all .12s',
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
                          {canDelete && (
                            <button
                              onClick={() => setDeleteId(schema.id)}
                              style={{
                                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
                                padding: '5px 10px', border: '1px solid var(--border2)',
                                borderRadius: 4, background: 'transparent',
                                color: 'var(--t3)', cursor: 'pointer', transition: 'all .12s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--redBorder)'
                                e.currentTarget.style.color = 'var(--red)'
                                e.currentTarget.style.background = 'var(--redDim)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border2)'
                                e.currentTarget.style.color = 'var(--t3)'
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* options preview */}
                      {schema.options && schema.options.length > 0 && (
                        <div style={{
                          borderTop: '1px solid var(--border)',
                          padding: '8px 14px',
                          display: 'flex', flexWrap: 'wrap' as const, gap: 4,
                        }}>
                          {schema.options.map(opt => (
                            <span key={opt.en} style={{
                              fontFamily: 'var(--onest)', fontSize: 10,
                              padding: '2px 8px', borderRadius: 3,
                              background: 'var(--bg3)', border: '1px solid var(--border)',
                              color: 'var(--t2)',
                            }}>
                              {opt.en}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{
            background: 'var(--bg)', borderRadius: 10,
            border: '1px solid var(--border)',
            width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto' as const,
            animation: 'modalIn .2s ease',
          }}>
            <style>{`
              @keyframes modalIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
              @keyframes spin { to { transform:rotate(360deg) } }
            `}</style>

            {/* modal header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800,
                  color: 'var(--t1)', letterSpacing: '-.01em',
                }}>
                  {editId ? 'Edit Field' : 'New Custom Field'}
                </div>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                  This field will appear on all {draft.entityTarget} records
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--border2)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* modal body */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>

                {/* label EN */}
                <div>
                  <Label required>Label (English)</Label>
                  <Input
                    value={draft.labelEn}
                    onChange={v => set('labelEn', v)}
                    placeholder="e.g. Weight (kg)"
                    lang="en"
                  />
                  {errors.labelEn && (
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                      {errors.labelEn}
                    </div>
                  )}
                </div>

                {/* label AR */}
                <div>
                  <Label required>Label (Arabic)</Label>
                  <Input
                    value={draft.labelAr}
                    onChange={v => set('labelAr', v)}
                    placeholder="الوزن (كجم)"
                    lang="ar"
                  />
                  {errors.labelAr && (
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                      {errors.labelAr}
                    </div>
                  )}
                </div>

                {/* field type */}
                <div>
                  <Label required>Field Type</Label>
                  <Select value={draft.fieldType} onChange={v => set('fieldType', v as FieldType)}>
                    {FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                    ))}
                  </Select>
                </div>

                {/* target */}
                <div>
                  <Label required>Applies To</Label>
                  <Select value={draft.entityTarget} onChange={v => set('entityTarget', v as FieldTarget)}>
                    {TARGETS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>

                {/* required toggle */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', userSelect: 'none' as const,
                  }}>
                    <div
                      onClick={() => set('isRequired', !draft.isRequired)}
                      style={{
                        width: 36, height: 20, borderRadius: 10, position: 'relative',
                        background: draft.isRequired ? 'var(--red)' : 'var(--s3)',
                        border: `1px solid ${draft.isRequired ? 'var(--red)' : 'var(--border2)'}`,
                        transition: 'all .2s', flexShrink: 0, cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2,
                        left: draft.isRequired ? 17 : 2,
                        width: 14, height: 14, borderRadius: '50%',
                        background: draft.isRequired ? '#fff' : 'var(--t4)',
                        transition: 'left .2s',
                      }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                        Required field
                      </div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>
                        Staff must fill this in before saving a player
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* options builder — only for select / multiselect / radio */}
              {needsOptions && (
                <div style={{
                  marginTop: 20, background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 'var(--r)',
                  padding: '14px 16px',
                }}>
                  <div style={{
                    fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700,
                    color: 'var(--t2)', marginBottom: 12, letterSpacing: '.04em',
                    textTransform: 'uppercase' as const,
                  }}>
                    Options
                  </div>

                  {/* existing options */}
                  {draft.options.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
                      {draft.options.map((opt, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: 5, padding: '7px 12px',
                        }}>
                          <span style={{ fontFamily: 'var(--onest)', fontSize: 13, flex: 1 }}>{opt.en}</span>
                          <span style={{
                            ...textStyle(opt.ar, 13),
                            color: 'var(--t3)', flex: 1, textAlign: 'right',
                          }}>
                            {opt.ar}
                          </span>
                          <button
                            onClick={() => removeOption(i)}
                            style={{
                              fontFamily: 'var(--onest)', fontSize: 12,
                              color: 'var(--t3)', background: 'transparent',
                              border: 'none', cursor: 'pointer', padding: '0 4px',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.options && (
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>
                      {errors.options}
                    </div>
                  )}

                  {/* add option row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                    <Input
                      value={optionInput.en}
                      onChange={v => setOptionInput(o => ({ ...o, en: v }))}
                      placeholder="Option in English"
                      lang="en"
                    />
                    <Input
                      value={optionInput.ar}
                      onChange={v => setOptionInput(o => ({ ...o, ar: v }))}
                      placeholder="الخيار بالعربية"
                      lang="ar"
                    />
                    <button
                      onClick={addOption}
                      disabled={!optionInput.en.trim() || !optionInput.ar.trim()}
                      style={{
                        fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                        height: 38, padding: '0 16px',
                        border: '1px solid var(--red)', borderRadius: 'var(--r)',
                        background: 'var(--red)', color: '#fff',
                        cursor: optionInput.en && optionInput.ar ? 'pointer' : 'not-allowed',
                        opacity: optionInput.en && optionInput.ar ? 1 : 0.4,
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* modal footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                  padding: '8px 18px', border: '1px solid var(--border2)',
                  borderRadius: 5, background: 'transparent',
                  color: 'var(--t2)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                  padding: '8px 22px', border: '1px solid var(--red)',
                  borderRadius: 5, background: saving ? 'var(--t3)' : 'var(--red)',
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 10,
            border: '1px solid var(--border)',
            width: '100%', maxWidth: 400,
            padding: '24px',
            animation: 'modalIn .2s ease',
          }}>
            <div style={{
              fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800,
              color: 'var(--t1)', marginBottom: 8,
            }}>
              Delete this field?
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
              This will remove the field definition and all stored values for this field across every player. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                  padding: '8px 18px', border: '1px solid var(--border2)',
                  borderRadius: 5, background: 'transparent',
                  color: 'var(--t2)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSchema(deleteId)}
                style={{
                  fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
                  padding: '8px 20px', border: '1px solid var(--red)',
                  borderRadius: 5, background: 'var(--red)',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Delete Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}