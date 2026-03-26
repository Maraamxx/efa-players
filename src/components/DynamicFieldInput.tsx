'use client'

import { useState } from 'react'
import type { FieldSchema } from '@/types/domain'

// ── local input primitives (mirrors the ones in [id]/page.tsx) ────────────────

const ARABIC_RE = /[\u0600-\u06FF]/
const LATIN_RE  = /[a-zA-Z]/

function InlineInput({
  value, onChange, placeholder, type = 'text', lang,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; lang?: 'ar' | 'en'
}) {
  const [focused, setFocused] = useState(false)
  const isAr = lang === 'ar' || (!lang && ARABIC_RE.test(value) && !LATIN_RE.test(value))
  const style: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
    borderRadius: 'var(--r)',
    background: 'var(--bg)',
    fontFamily: isAr ? 'var(--amiri)' : 'var(--onest)',
    fontSize: isAr ? 15 : 13,
    fontWeight: 500,
    color: 'var(--t1)',
    padding: '0 12px',
    height: 34,
    outline: 'none',
    direction: isAr ? 'rtl' : 'ltr',
    boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
    transition: 'border-color .15s',
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (lang === 'ar' && LATIN_RE.test(v)) return
    if (lang === 'en' && ARABIC_RE.test(v)) return
    onChange(v)
  }
  return (
    <input type={type} value={value} onChange={handleChange} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={style} />
  )
}

function InlineSelect({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', height: 34,
        border: `1px solid ${focused ? 'var(--red)' : 'var(--border2)'}`,
        borderRadius: 'var(--r)', background: 'var(--bg)',
        fontFamily: 'var(--onest)', fontSize: 13,
        color: 'var(--t1)', padding: '0 12px', outline: 'none',
        boxShadow: focused ? '0 0 0 3px var(--redDim)' : 'none',
        transition: 'border-color .15s', cursor: 'pointer',
      }}
    >
      {children}
    </select>
  )
}

// ── exported component ────────────────────────────────────────────────────────

export function DynamicFieldInput({
  schema, value, onChange,
}: { schema: FieldSchema; value: string; onChange: (v: string) => void }) {
  if (schema.fieldType === 'text') {
    return <InlineInput value={value} onChange={onChange} placeholder={`Enter ${schema.label.en.toLowerCase()}`} />
  }
  if (schema.fieldType === 'number') {
    return <InlineInput value={value} onChange={v => onChange(v.replace(/[^\d.]/g, ''))} type="number" placeholder="0" />
  }
  if (schema.fieldType === 'date') {
    return <InlineInput value={value} onChange={onChange} type="date" />
  }
  if (schema.fieldType === 'boolean') {
    const on = value === 'true'
    return (
      <div onClick={() => onChange(on ? 'false' : 'true')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', height: 34 }}>
        <div style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: on ? 'var(--red)' : 'var(--s3)',
          border: `1px solid ${on ? 'var(--red)' : 'var(--border2)'}`,
          transition: 'all .2s', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, left: on ? 17 : 2,
            width: 14, height: 14, borderRadius: '50%',
            background: on ? '#fff' : 'var(--t4)', transition: 'left .2s',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)' }}>
          {on ? 'Yes' : 'No'}
        </span>
      </div>
    )
  }
  if (schema.fieldType === 'select' && schema.options) {
    return (
      <InlineSelect value={value} onChange={onChange}>
        <option value="">Select {schema.label.en}…</option>
        {schema.options.map(o => <option key={o.en} value={o.en}>{o.en}</option>)}
      </InlineSelect>
    )
  }
  if (schema.fieldType === 'multiselect' && schema.options) {
    const selected = value.split(',').filter(Boolean)
    return (
      <div style={{
        border: '1px solid var(--border2)', borderRadius: 'var(--r)',
        background: 'var(--bg)', padding: '6px 8px',
        display: 'flex', flexWrap: 'wrap' as const, gap: 5, minHeight: 34,
      }}>
        {schema.options.map(opt => {
          const on = selected.includes(opt.en)
          return (
            <button key={opt.en}
              onClick={() => {
                const next = on ? selected.filter(v => v !== opt.en) : [...selected, opt.en]
                onChange(next.join(','))
              }}
              style={{
                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500,
                padding: '2px 9px', borderRadius: 3, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--redBorder)' : 'var(--border2)'}`,
                background: on ? 'var(--redDim)' : 'transparent',
                color: on ? 'var(--red)' : 'var(--t2)',
                transition: 'all .15s',
              }}
            >{opt.en}</button>
          )
        })}
      </div>
    )
  }
  if (schema.fieldType === 'radio' && schema.options) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        {schema.options.map(opt => {
          const on = value === opt.en
          return (
            <label key={opt.en} style={{
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              padding: '4px 10px', borderRadius: 4,
              border: `1px solid ${on ? 'var(--redBorder)' : 'var(--border2)'}`,
              background: on ? 'var(--redDim)' : 'transparent', transition: 'all .15s',
            }}>
              <input type="radio" name={schema.id} value={opt.en} checked={on}
                onChange={() => onChange(opt.en)}
                style={{ accentColor: 'var(--red)', width: 13, height: 13 }} />
              <span style={{ fontFamily: 'var(--onest)', fontSize: 12, color: on ? 'var(--red)' : 'var(--t1)', fontWeight: on ? 600 : 400 }}>
                {opt.en}
              </span>
            </label>
          )
        })}
      </div>
    )
  }
  if (schema.fieldType === 'file') {
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 34,
        padding: '0 12px', border: '1px solid var(--border2)',
        borderRadius: 'var(--r)', background: 'var(--bg)',
        cursor: 'pointer', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
      >
        <span>↑</span>
        <span style={{ color: value ? 'var(--t1)' : 'var(--t3)' }}>{value || 'Click to attach file…'}</span>
        <input type="file" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0].name) }} />
      </label>
    )
  }
  return <InlineInput value={value} onChange={onChange} />
}
