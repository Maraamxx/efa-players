'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { MediaAsset, VideoNote } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'

// ── helpers ───────────────────────────────────────────────────────────────────

export function fmtTime(secs: number): string {
  if (!isFinite(secs)) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2]

// ── VideoPlayer ───────────────────────────────────────────────────────────────

interface Props {
  asset: MediaAsset
  onNoteAdded?: (note: VideoNote) => void
  onNoteDeleted?: (noteId: string) => void
  onNoteEdited?: (note: VideoNote) => void
  currentUser?: string
}

export function VideoPlayer({ asset, onNoteAdded, onNoteDeleted, onNoteEdited, currentUser = 'Staff' }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [speed,        setSpeed]        = useState(1)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [showQuality,  setShowQuality]  = useState(false)
  const [quality,      setQuality]      = useState('Original')
  const [noteText,     setNoteText]     = useState('')
  const [activeNote,   setActiveNote]   = useState<string | null>(null)
  const [hoveredTs,    setHoveredTs]    = useState<number | null>(null)
  const [notes,        setNotes]        = useState<VideoNote[]>(asset.notes ?? [])
  const [savingNote,   setSavingNote]   = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingText,   setEditingText]   = useState('')

  useEffect(() => { setNotes(asset.notes ?? []) }, [asset.notes])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime  = () => {
      setCurrentTime(v.currentTime)
      const active = notes
        .filter(n => Math.abs(n.timestamp - v.currentTime) < 2)
        .sort((a, b) => Math.abs(a.timestamp - v.currentTime) - Math.abs(b.timestamp - v.currentTime))[0]
      setActiveNote(active?.id ?? null)
    }
    const onLoaded = () => setDuration(v.duration)
    const onFS     = () => setFullscreen(!!document.fullscreenElement)

    v.addEventListener('play',            onPlay)
    v.addEventListener('pause',           onPause)
    v.addEventListener('timeupdate',      onTime)
    v.addEventListener('loadedmetadata',  onLoaded)
    document.addEventListener('fullscreenchange', onFS)
    return () => {
      v.removeEventListener('play',           onPlay)
      v.removeEventListener('pause',          onPause)
      v.removeEventListener('timeupdate',     onTime)
      v.removeEventListener('loadedmetadata', onLoaded)
      document.removeEventListener('fullscreenchange', onFS)
    }
  }, [notes])

  const resetControlsTimer = useCallback(() => {
    clearTimeout(controlsTimer.current)
    if (playing) controlsTimer.current = setTimeout(() => {}, 3000)
  }, [playing])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
  }

  const skip = (secs: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + secs))
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    const track = progressRef.current
    if (!v || !track || !duration) return
    const rect = track.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * duration
  }

  const changeSpeed = (s: number) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
  }

  const changeVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const vol  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(vol)
    setMuted(vol === 0)
    if (videoRef.current) { videoRef.current.volume = vol; videoRef.current.muted = false }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const next = !muted
    setMuted(next)
    videoRef.current.muted = next
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const saveNote = async () => {
    if (!noteText.trim() || savingNote) return
    setSavingNote(true)
    const res = await apiFetch(`/api/media/${asset.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp:  Math.floor(currentTime),
        text:       noteText.trim(),
        authorName: currentUser,
      }),
    })
    const note = await res.json()
    const next = [...notes, note].sort((a, b) => a.timestamp - b.timestamp)
    setNotes(next)
    onNoteAdded?.(note)
    setNoteText('')
    setSavingNote(false)
  }

  const deleteNote = async (noteId: string) => {
    const res = await apiFetch(`/api/media/${asset.id}/notes/${noteId}`, { method: 'DELETE' })
    if (!res.ok) return
    setNotes(n => n.filter(x => x.id !== noteId))
    onNoteDeleted?.(noteId)
  }

  const startEditNote = (note: VideoNote) => {
    setEditingNoteId(note.id)
    setEditingText(note.text)
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingText('')
  }

  const saveEditNote = async () => {
    if (!editingNoteId) return
    const trimmed = editingText.trim()
    if (!trimmed) return
    const res = await apiFetch(`/api/media/${asset.id}/notes/${editingNoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    })
    if (!res.ok) return
    const updated = await res.json() as VideoNote
    setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    onNoteEdited?.(updated)
    cancelEditNote()
  }

  const isOwnNote = (note: VideoNote) => note.authorName === currentUser

  const jumpToNote = (note: VideoNote) => {
    if (videoRef.current) videoRef.current.currentTime = note.timestamp
    setActiveNote(note.id)
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="video-player-grid">

      {/* ── VIDEO + CONTROLS ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* video */}
        <div
          ref={containerRef}
          onMouseMove={resetControlsTimer}
          onClick={togglePlay}
          style={{ background: '#000', position: 'relative', cursor: 'pointer', overflow: 'hidden', aspectRatio: '16/9', maxHeight: 'min(520px, 60vh)' }}
        >
          <video
            ref={videoRef}
            src={asset.blobUrl ?? undefined}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
            preload="metadata"
          />

          {/* note markers on video overlay */}
          {duration > 0 && notes.map(note => (
            <div key={note.id}
              title={`${fmtTime(note.timestamp)} — ${note.text}`}
              onClick={e => { e.stopPropagation(); jumpToNote(note) }}
              style={{
                position: 'absolute', bottom: 48,
                left: `${(note.timestamp / duration) * 100}%`,
                transform: 'translateX(-50%)',
                width: 3, height: note.id === activeNote ? 14 : 10,
                background: 'var(--red)', borderRadius: 2,
                cursor: 'pointer', transition: 'height .15s', zIndex: 2,
              }}
            />
          ))}

          {/* play overlay when paused */}
          {!playing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '10px 0 10px 18px', borderColor: 'transparent transparent transparent #fff', marginLeft: 4 }} />
              </div>
            </div>
          )}
        </div>

        {/* controls */}
        <div style={{ background: '#111', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', minWidth: 40 }}>
              {fmtTime(currentTime)}
            </span>

            <div
              ref={progressRef}
              onClick={seek}
              onMouseMove={e => {
                if (!progressRef.current || !duration) return
                const rect = progressRef.current.getBoundingClientRect()
                setHoveredTs(((e.clientX - rect.left) / rect.width) * duration)
              }}
              onMouseLeave={() => setHoveredTs(null)}
              style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.12)', borderRadius: 2, position: 'relative', cursor: 'pointer' }}
            >
              {/* fill */}
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--red)', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px var(--red)' }} />
              </div>

              {/* note markers */}
              {duration > 0 && notes.map(note => (
                <div key={note.id}
                  onClick={e => { e.stopPropagation(); jumpToNote(note) }}
                  title={`${fmtTime(note.timestamp)}: ${note.text}`}
                  style={{
                    position: 'absolute',
                    left: `${(note.timestamp / duration) * 100}%`,
                    top: '50%', transform: 'translate(-50%,-50%)',
                    width: note.id === activeNote ? 10 : 8,
                    height: note.id === activeNote ? 10 : 8,
                    borderRadius: '50%', background: 'var(--red)',
                    border: '2px solid #fff', cursor: 'pointer', zIndex: 2,
                    transition: 'all .15s',
                    boxShadow: note.id === activeNote ? '0 0 0 3px rgba(200,16,46,.4)' : 'none',
                  }}
                />
              ))}

              {/* hover tooltip */}
              {hoveredTs !== null && duration > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${(hoveredTs / duration) * 100}%`,
                  bottom: 10, transform: 'translateX(-50%)',
                  background: '#000', color: '#fff',
                  fontSize: 10, fontFamily: 'var(--onest)', fontWeight: 700,
                  padding: '2px 6px', borderRadius: 3,
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                }}>
                  {fmtTime(hoveredTs)}
                </div>
              )}
            </div>

            <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'rgba(255,255,255,.4)', minWidth: 40, textAlign: 'right' }}>
              {fmtTime(duration)}
            </span>
          </div>

          {/* buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* back 10s */}
            <button onClick={() => skip(-10)} title="Back 10s" style={ctrlBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/>
                <text x="8" y="16" style={{ fontSize: '7px', fontWeight: 'bold', fill: 'currentColor', stroke: 'none' }}>10</text>
              </svg>
            </button>

            {/* play/pause */}
            <button onClick={togglePlay} title={playing ? 'Pause' : 'Play'} style={{ ...ctrlBtn, width: 34, height: 34, background: 'rgba(255,255,255,.1)', borderRadius: '50%', color: '#fff' }}>
              {playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              }
            </button>

            {/* fwd 10s */}
            <button onClick={() => skip(10)} title="Forward 10s" style={ctrlBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                <text x="8" y="16" style={{ fontSize: '7px', fontWeight: 'bold', fill: 'currentColor', stroke: 'none' }}>10</text>
              </svg>
            </button>

            {/* mute + volume */}
            <button onClick={toggleMute} title={muted || volume === 0 ? 'Unmute' : 'Mute'} style={ctrlBtn}>
              {muted || volume === 0
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <div className="video-volume-bar" onClick={changeVolume}
              style={{ width: 56, height: 3, background: 'rgba(255,255,255,.15)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
              <div style={{ width: `${muted ? 0 : volume * 100}%`, height: '100%', background: 'rgba(255,255,255,.6)', borderRadius: 2 }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* speed */}
            <div className="video-speed-btns" style={{ display: 'flex', gap: 3 }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => changeSpeed(s)} style={{
                  fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                  padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${speed === s ? 'var(--red)' : 'rgba(255,255,255,.1)'}`,
                  background: speed === s ? 'rgba(200,16,46,.25)' : 'rgba(255,255,255,.06)',
                  color: speed === s ? 'var(--red)' : 'rgba(255,255,255,.5)',
                  transition: 'all .15s',
                }}>
                  {s}×
                </button>
              ))}
            </div>

            {/* quality */}
            <div className="video-quality-btn" style={{ position: 'relative' }}>
              <button onClick={() => setShowQuality(q => !q)} style={{
                fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,.1)',
                background: 'rgba(255,255,255,.06)',
                color: 'rgba(255,255,255,.6)', transition: 'all .15s',
              }}>
                {quality} ▾
              </button>
              {showQuality && (
                <div style={{ position: 'absolute', bottom: '120%', right: 0, background: '#1a1a1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, overflow: 'hidden', minWidth: 80, zIndex: 10 }}>
                  {['Original', '1080p', '720p', '480p', '360p'].map(q => (
                    <div key={q}
                      onClick={() => { setQuality(q); setShowQuality(false) }}
                      onMouseEnter={e => { if (quality !== q) e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
                      onMouseLeave={e => { if (quality !== q) e.currentTarget.style.background = 'transparent' }}
                      style={{
                        padding: '7px 12px', cursor: 'pointer',
                        fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
                        color: quality === q ? 'var(--red)' : 'rgba(255,255,255,.7)',
                        background: quality === q ? 'rgba(200,16,46,.12)' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >{q}</div>
                  ))}
                </div>
              )}
            </div>

            {/* fullscreen */}
            <button onClick={toggleFullscreen} title="Fullscreen" style={ctrlBtn}>
              {fullscreen
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              }
            </button>
          </div>
        </div>

        {/* note input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            Add note at
            <span style={{ background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 3, fontFamily: 'var(--onest)' }}>
              {fmtTime(currentTime)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNote() }}
              placeholder="Type a note and press Enter…"
              style={{ flex: 1, height: 34, border: '1px solid var(--border2)', borderRadius: 5, background: 'var(--bg2)', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', padding: '0 10px', outline: 'none', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--red)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
            />
            <button onClick={saveNote} disabled={!noteText.trim() || savingNote}
              style={{ height: 34, padding: '0 16px', borderRadius: 5, border: '1px solid var(--red)', background: !noteText.trim() ? 'var(--s2)' : 'var(--red)', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, color: !noteText.trim() ? 'var(--t4)' : '#fff', cursor: noteText.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s' }}>
              {savingNote ? '…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTES PANEL ── */}
      <div className="video-notes-panel">
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t2)' }}>Notes</span>
          {notes.length > 0 && (
            <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)' }}>
              {notes.length}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' as const, padding: 8 }}>
          {notes.length === 0 ? (
            <div style={{ padding: '28px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t3)', marginBottom: 4 }}>No notes yet</div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t4)', lineHeight: 1.6 }}>
                Play the video and type a note below to save it at the current timestamp
              </div>
            </div>
          ) : (
            [...notes].sort((a, b) => a.timestamp - b.timestamp).map(note => {
              const own = isOwnNote(note)
              const isEditing = editingNoteId === note.id
              return (
              <div key={note.id}
                onClick={() => { if (!isEditing) jumpToNote(note) }}
                onMouseEnter={e => { if (note.id !== activeNote && !isEditing) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (note.id !== activeNote && !isEditing) e.currentTarget.style.background = 'transparent' }}
                style={{
                  padding: '8px 10px', borderRadius: 6, marginBottom: 4, cursor: isEditing ? 'default' : 'pointer',
                  border: `1px solid ${note.id === activeNote ? 'var(--redBorder)' : isEditing ? 'var(--border2)' : 'transparent'}`,
                  background: note.id === activeNote ? 'var(--redDim)' : isEditing ? 'var(--bg3)' : 'transparent',
                  transition: 'all .12s', display: 'flex', gap: 8, alignItems: 'flex-start', position: 'relative',
                }}
              >
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 800, color: 'var(--red)', minWidth: 38, flexShrink: 0, paddingTop: 1 }}>
                  {fmtTime(note.timestamp)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }} onClick={e => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        rows={2}
                        autoFocus
                        style={{
                          width: '100%', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)',
                          border: '1px solid var(--border2)', borderRadius: 5, padding: '6px 8px',
                          background: 'var(--bg)', outline: 'none', resize: 'vertical' as const,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={e => { e.stopPropagation(); saveEditNote() }}
                          disabled={!editingText.trim()}
                          style={{
                            fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                            padding: '4px 10px', borderRadius: 4,
                            border: '1px solid var(--red)',
                            background: editingText.trim() ? 'var(--red)' : 'var(--s2)',
                            color: editingText.trim() ? '#fff' : 'var(--t4)',
                            cursor: editingText.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >Save</button>
                        <button
                          onClick={e => { e.stopPropagation(); cancelEditNote() }}
                          style={{
                            fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600,
                            padding: '4px 10px', borderRadius: 4,
                            border: '1px solid var(--border2)', background: 'transparent',
                            color: 'var(--t2)', cursor: 'pointer',
                          }}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', lineHeight: 1.5 }}>{note.text}</div>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{note.authorName}{own ? ' · you' : ''}</div>
                    </>
                  )}
                </div>
                {own && !isEditing && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); startEditNote(note) }}
                      title="Edit note"
                      style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3 }}
                    >✎</button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                      title="Delete note"
                      style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3 }}
                    >✕</button>
                  </div>
                )}
              </div>
              )
            })
          )}
        </div>

        {/* file info footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)', lineHeight: 1.7 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--t2)' }}>
              {asset.originalFilename}
            </div>
            <div>
              {fmtSize(asset.sizeBytes)}
              {asset.durationSeconds ? ` · ${fmtTime(asset.durationSeconds)}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 5,
  background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'rgba(255,255,255,.6)', transition: 'all .15s',
}
