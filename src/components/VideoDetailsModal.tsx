'use client'

import { useEffect, useState } from 'react'
import type { MediaAsset } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'
import { VIDEO_TAGS } from '@/lib/constants'

interface Props {
  asset: MediaAsset
  mode: 'create' | 'edit'
  onClose: () => void
  onSaved: (asset: MediaAsset) => void
}

export function VideoDetailsModal({ asset, mode, onClose, onSaved }: Props) {
  const [title,       setTitle]       = useState(asset.title ?? asset.originalFilename?.replace(/\.[^/.]+$/, '') ?? '')
  const [tag,         setTag]         = useState<string>(asset.tag ?? '')
  const [description, setDescription] = useState(asset.description ?? '')
  const [isFeatured,  setIsFeatured]  = useState<boolean>(asset.isFeatured ?? false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    if (!title.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    const res = await apiFetch(`/api/media/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        tag: tag || null,
        description: description.trim() || null,
        isFeatured,
      }),
    })
    if (!res.ok) {
      setError('Failed to save video details')
      setSaving(false)
      return
    }
    const updated = await res.json() as MediaAsset
    setSaving(false)
    onSaved(updated)
  }

  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-sheet" style={{ width: '100%', maxWidth: 560, background: 'var(--bg)', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>
        <div className="modal-drag-handle" style={{ display: 'none', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
        </div>

        {/* header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 3 }}>
              {mode === 'create' ? 'New video' : 'Edit video'}
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>
              Video details
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        {/* body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' as const }}>

          {/* filename note */}
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
            <span style={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const }}>File · </span>
            {asset.originalFilename}
          </div>

          {/* name */}
          <div>
            <div style={labelStyle}>
              Name <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); if (error) setError(null) }}
              placeholder="e.g. Left-foot volley vs Zamalek"
              autoFocus
              style={inputStyle(!!error && !title.trim())}
            />
          </div>

          {/* tag */}
          <div>
            <div style={labelStyle}>Tag</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VIDEO_TAGS.map(t => {
                const active = tag === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTag(active ? '' : t.value)}
                    style={{
                      fontFamily: 'var(--onest)',
                      fontSize: 11,
                      fontWeight: active ? 700 : 600,
                      padding: '5px 12px',
                      borderRadius: 4,
                      border: `1px solid ${active ? t.border : 'var(--border2)'}`,
                      background: active ? t.bg : 'transparent',
                      color: active ? t.color : 'var(--t3)',
                      cursor: 'pointer',
                      transition: 'all .12s',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* description */}
          <div>
            <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Description</span>
              <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' as const, color: description.length > 450 ? 'var(--red)' : 'var(--t4)' }}>{description.length}/500</span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Short context for scouts / coaches — what to look for in this clip…"
              style={{ ...inputStyle(false), height: 'auto' as const, padding: '8px 12px', resize: 'vertical' as const }}
            />
          </div>

          {/* featured */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: isFeatured ? 'var(--redDim)' : 'var(--bg3)',
            border: `1px solid ${isFeatured ? 'var(--redBorder)' : 'var(--border)'}`,
            borderRadius: 7,
            transition: 'all .15s',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700, color: isFeatured ? 'var(--red)' : 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={isFeatured ? 'var(--red)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Pin to top of match
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>
                Featured clips sit first in the list so scouts see them immediately.
              </div>
            </div>
            <div
              onClick={() => setIsFeatured(v => !v)}
              style={{
                width: 38, height: 22, borderRadius: 11, position: 'relative',
                background: isFeatured ? 'var(--red)' : 'var(--s3)',
                border: `1px solid ${isFeatured ? 'var(--red)' : 'var(--border2)'}`,
                transition: 'all .2s', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: isFeatured ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left .2s',
                boxShadow: '0 1px 2px rgba(0,0,0,.2)',
              }} />
            </div>
          </div>

          {error && (
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--red)' }}>{error}</div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--bg)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 42, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border2)', borderRadius: 7, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            style={{
              flex: 2, height: 42,
              fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700,
              border: 'none', borderRadius: 7,
              background: saving || !title.trim() ? 'var(--t3)' : 'var(--red)',
              color: '#fff',
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Save & add' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--onest)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--t3)',
  marginBottom: 7,
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: 40,
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--border2)'}`,
    borderRadius: 6,
    background: 'var(--bg)',
    fontFamily: 'var(--onest)',
    fontSize: 13,
    color: 'var(--t1)',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box',
  }
}
