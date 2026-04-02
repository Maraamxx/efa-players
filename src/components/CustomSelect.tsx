'use client'

import { useState, useEffect, useRef } from 'react'

export interface SelectOption {
  value: string
  label: string
  flag?: string
  sublabel?: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  searchable?: boolean
}

export function CustomSelect({ value, onChange, options, placeholder = 'Select…', error, searchable = true }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.sublabel?.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          width: '100%', height: 40, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', cursor: 'pointer',
          border: `1px solid ${error ? '#C8102E' : open ? 'var(--red)' : 'var(--border2)'}`,
          borderRadius: 'var(--r)', background: 'var(--bg)',
          fontFamily: 'var(--onest)', fontSize: 13, color: selected ? 'var(--t1)' : 'var(--t3)',
          boxShadow: open ? '0 0 0 3px var(--redDim)' : 'none',
          transition: 'border-color .15s',
        }}
      >
        {selected?.flag && <img src={selected.flag} alt="" style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)', flexShrink: 0, width: 20, height: 15, objectFit: 'cover' }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <span style={{ color: 'var(--t4)', fontSize: 10, flexShrink: 0, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4,
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 240, display: 'flex', flexDirection: 'column',
        }}>
          {searchable && options.length > 5 && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: '100%', height: 32, border: '1px solid var(--border2)', borderRadius: 4,
                  background: 'var(--bg2)', fontFamily: 'var(--onest)', fontSize: 12,
                  color: 'var(--t1)', padding: '0 8px', outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>No results</div>
            ) : filtered.map(o => (
              <div
                key={o.value}
                onMouseDown={() => { onChange(o.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer',
                  background: o.value === value ? 'var(--redDim)' : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
              >
                {o.flag && <img src={o.flag} alt="" style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)', flexShrink: 0, width: 20, height: 15, objectFit: 'cover' }} />}
                <span style={{ fontFamily: 'var(--onest)', fontSize: 13, color: o.value === value ? 'var(--red)' : 'var(--t1)', fontWeight: o.value === value ? 600 : 400, flex: 1 }}>
                  {o.label}
                </span>
                {o.sublabel && <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>{o.sublabel}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
