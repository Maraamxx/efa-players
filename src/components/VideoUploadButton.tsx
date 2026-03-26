'use client'

import { useRef, useState } from 'react'
import type { MediaAsset } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'

interface Props {
  entityType: 'match' | 'analysis'
  entityId: string
  onUploaded: (asset: MediaAsset) => void
}

export function VideoUploadButton({ entityType, entityId, onUploaded }: Props) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(0)

    // simulate progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(interval); return 90 }
        return p + Math.random() * 15
      })
    }, 120)

    // real blob URL the browser can actually play
    const blobUrl = URL.createObjectURL(file)

    // extract duration
    const durationSeconds = await new Promise<number | null>(resolve => {
      const v   = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => resolve(Math.floor(v.duration))
      v.onerror          = () => resolve(null)
      v.src = blobUrl
    })

    clearInterval(interval)
    setProgress(95)

    const res = await apiFetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, originalFilename: file.name, sizeBytes: file.size, durationSeconds, blobUrl }),
    })
    const asset = await res.json()

    setProgress(100)
    setTimeout(() => { setUploading(false); setProgress(0) }, 400)
    onUploaded(asset)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />

      {uploading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 120, height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--red)', borderRadius: 2, transition: 'width .1s ease' }} />
          </div>
          <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>{Math.round(progress)}%</span>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--redDim)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'transparent' }}
          style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '5px 12px', border: '1px solid var(--border2)', borderRadius: 5, background: 'transparent', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload video
        </button>
      )}
    </>
  )
}
