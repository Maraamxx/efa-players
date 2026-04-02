'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AuditEntry, AuditAction, AuditEntityType } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { useCan, useAuth } from '@/lib/auth'
import { CustomSelect } from '@/components/CustomSelect'
import { Pagination, usePagination } from '@/components/Pagination'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtIp(ip: string) {
  if (ip === '::1' || ip === '127.0.0.1') return 'localhost'
  return ip
}

// Fields that should be hidden from audit display (noise / internal)
const HIDDEN_FIELDS = new Set(['updatedAt', 'createdAt', 'id', 'photoUrl', 'photoFile'])

// Fields that contain complex data we should summarize, not dump as JSON
const SUMMARY_FIELDS: Record<string, (v: unknown) => string> = {
  nationalities: (v) => {
    if (!Array.isArray(v)) return '—'
    return v.map((n: any) => n.countryCode ?? '?').join(', ') || '—'
  },
  clubHistory: (v) => {
    if (!Array.isArray(v)) return '—'
    if (v.length === 0) return 'No history'
    return `${v.length} club${v.length !== 1 ? 's' : ''}`
  },
  analysisStats: (v) => {
    if (!v || typeof v !== 'object') return '—'
    const s = v as Record<string, number>
    const parts: string[] = []
    if (s.totalAppearances != null) parts.push(`${s.totalAppearances} apps`)
    if (s.totalGoals != null)       parts.push(`${s.totalGoals} goals`)
    if (s.totalAssists != null)     parts.push(`${s.totalAssists} assists`)
    if (s.totalMinutes != null)     parts.push(`${s.totalMinutes} mins`)
    return parts.length ? parts.join(', ') : '—'
  },
  analysisFieldValues: (v) => {
    if (!Array.isArray(v)) return '—'
    return `${v.length} field${v.length !== 1 ? 's' : ''} set`
  },
  dynamicFieldValues: (v) => {
    if (!Array.isArray(v)) return '—'
    const filled = v.filter((fv: any) => fv.value != null && fv.value !== '')
    return `${filled.length} field${filled.length !== 1 ? 's' : ''} set`
  },
  strengths: (v) => Array.isArray(v) ? (v.length ? v.join(', ') : 'None') : '—',
  weaknesses: (v) => Array.isArray(v) ? (v.length ? v.join(', ') : 'None') : '—',
  photoUrl: () => 'Photo uploaded',
}

// Render a value as a readable string for inline summaries
function valStr(v: unknown, field?: string): string {
  if (v === null || v === undefined) return '—'
  // Use summary formatter if available
  if (field && SUMMARY_FIELDS[field]) return SUMMARY_FIELDS[field](v)
  // Base64 / long data URLs
  if (typeof v === 'string' && v.startsWith('data:')) return 'File uploaded'
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    if ('en' in o && o.en) return String(o.en)        // BilingualString
    if (Array.isArray(v)) return `${v.length} item${v.length !== 1 ? 's' : ''}`
    const s = JSON.stringify(v)
    return s.length > 40 ? s.slice(0, 40) + '…' : s
  }
  const s = String(v)
  return s.length > 50 ? s.slice(0, 50) + '…' : s
}

// Human-readable field name
function fieldLabel(k: string) {
  const MAP: Record<string, string> = {
    name: 'name', position: 'position', status: 'status',
    birthdate: 'date of birth', nationality: 'nationality',
    currentClubId: 'club', currentLeagueId: 'league',
    preferredFoot: 'preferred foot',
    height: 'height', weight: 'weight',
    contractStart: 'contract start', contractEnd: 'contract end',
    fatherName: 'guardian name', fatherPhone: 'guardian phone', fatherEmail: 'guardian email',
    dynamicFieldValues: 'custom fields', entityLabel: 'label',
    entityTarget: 'target', fieldType: 'field type',
    analysisStats: 'performance stats', analysisFieldValues: 'analysis fields',
    nationalities: 'nationalities', clubHistory: 'club history',
    strengths: 'strengths', weaknesses: 'weaknesses',
    photoUrl: 'photo', ageGroup: 'age group',
    idNumber: 'national ID', contractExpiry: 'contract expiry',
  }
  return MAP[k] ?? k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

// Primary bold label — what happened
function primaryLabel(entry: AuditEntry): string {
  const type = ENTITY_LABEL[entry.entityType]
  if (entry.action === 'CREATE') return entry.entityLabel
  if (entry.action === 'DELETE') return entry.entityLabel

  const changed = entry.diff.changed.filter(k => !HIDDEN_FIELDS.has(k))
  if (changed.length === 0) return `${type} ${entry.entityLabel}`
  const names = changed.slice(0, 3).map(fieldLabel).join(', ')
  const extra  = changed.length > 3 ? ` +${changed.length - 3}` : ''
  return `${type} ${entry.entityLabel} · ${names} updated`
}

// Subtitle line — the actual values
function buildSubtitle(entry: AuditEntry): string {
  const type = ENTITY_LABEL[entry.entityType]

  if (entry.action === 'CREATE') return `New ${type.toLowerCase()} added to the system`
  if (entry.action === 'DELETE') return `${type} permanently removed from the system`

  const changed = entry.diff.changed.filter(k => !HIDDEN_FIELDS.has(k))

  if (changed.length === 0) return entry.entityLabel

  if (changed.length === 1) {
    const k      = changed[0]
    const before = valStr(entry.diff.before?.[k], k)
    const after  = valStr(entry.diff.after?.[k], k)
    return `${before} → ${after}`
  }

  // multiple fields — summarize what changed
  return `${changed.length} fields changed`
}

const ACTION_STYLE: Record<AuditAction, { label: string; bg: string; color: string; border: string }> = {
  CREATE: { label: 'Created', bg: 'rgba(22,163,74,.08)',  color: '#16A34A', border: 'rgba(22,163,74,.2)'  },
  UPDATE: { label: 'Updated', bg: 'rgba(59,130,246,.08)', color: '#2563EB', border: 'rgba(59,130,246,.2)' },
  DELETE: { label: 'Deleted', bg: 'rgba(200,16,46,.08)',  color: '#C8102E', border: 'rgba(200,16,46,.25)' },
}

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  player:       'Player',
  match:        'Match',
  field_schema: 'Custom Field',
  media:        'Video',
  video_note:   'Video Note',
  club:         'Club',
  league:       'League',
  user:         'User',
  role:         'Role',
}

const ENTITY_ICON: Record<AuditEntityType, string> = {
  player:       '👤',
  match:        '⚽',
  field_schema: '⊞',
  media:        '▶',
  video_note:   '💬',
  club:         '🏟',
  league:       '🏆',
  user:         '🧑‍💼',
  role:         '🔐',
}

// ── diff row ──────────────────────────────────────────────────────────────────

function DiffRow({ field, before, after }: { field: string; before: unknown; after: unknown }) {
  // Skip hidden/noisy fields
  if (HIDDEN_FIELDS.has(field)) return null

  const fmt = (v: unknown) => {
    if (v === null || v === undefined) return <span style={{ color: 'var(--t4)' }}>—</span>
    // Use summary formatter if available
    if (SUMMARY_FIELDS[field]) return <span>{SUMMARY_FIELDS[field](v)}</span>
    // Base64 / data URLs
    if (typeof v === 'string' && v.startsWith('data:')) return <span style={{ color: 'var(--t3)' }}>File uploaded</span>
    if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>
      if ('en' in o || 'ar' in o) {
        return (
          <span>
            {o.en ? <span style={{ marginRight: 8 }}>{String(o.en)}</span> : null}
            {o.ar ? <span style={{ fontFamily: 'var(--amiri)', fontSize: 14, direction: 'rtl' }}>{String(o.ar)}</span> : null}
          </span>
        )
      }
      if (Array.isArray(v)) return <span style={{ color: 'var(--t3)' }}>{v.length} item{v.length !== 1 ? 's' : ''}</span>
      const s = JSON.stringify(v)
      return <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)' }}>{s.length > 80 ? s.slice(0, 80) + '…' : s}</span>
    }
    return <span>{String(v)}</span>
  }

  const changed = JSON.stringify(before) !== JSON.stringify(after)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <div style={{ padding: '7px 10px', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', borderRight: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {changed && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, display: 'inline-block' }} />}
        {fieldLabel(field)}
      </div>
      <div style={{ padding: '7px 10px', color: 'var(--t2)', borderRight: '1px solid var(--border)', background: changed ? 'rgba(239,68,68,.05)' : 'transparent', fontFamily: 'var(--onest)', textDecoration: changed ? 'line-through' : 'none', textDecorationColor: 'rgba(239,68,68,.4)' }}>
        {fmt(before)}
      </div>
      <div style={{ padding: '7px 10px', color: 'var(--t1)', background: changed ? 'rgba(22,163,74,.05)' : 'transparent', fontFamily: 'var(--onest)', fontWeight: changed ? 500 : 400 }}>
        {fmt(after)}
      </div>
    </div>
  )
}

// ── audit card ────────────────────────────────────────────────────────────────

function AuditCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)
  const action    = ACTION_STYLE[entry.action]
  const canExpand = entry.diff.changed.length > 0 || !!entry.diff.before || !!entry.diff.after
  const primary   = primaryLabel(entry)
  const subtitle  = buildSubtitle(entry)

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden', transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* main row — stacks on mobile */}
      <div
        onClick={() => { if (canExpand) setExpanded(e => !e) }}
        style={{ cursor: canExpand ? 'pointer' : 'default', padding: '10px 14px' }}
      >
        {/* top line: icon + badge + timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{ENTITY_ICON[entry.entityType]}</span>

          <span style={{
            fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 3,
            background: action.bg, border: `1px solid ${action.border}`,
            color: action.color, letterSpacing: '.04em', flexShrink: 0,
          }}>
            {action.label}
          </span>

          {/* spacer */}
          <div style={{ flex: 1 }} />

          {/* timestamp — right aligned */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
              {timeAgo(entry.timestamp)}
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 9, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
              {fmtTs(entry.timestamp)}
            </div>
          </div>

          {canExpand && (
            <div style={{ color: 'var(--t4)', fontSize: 12, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</div>
          )}
        </div>

        {/* bottom line: content + user */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {primary}
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </div>
          </div>

          {/* user — hidden on very small screens via CSS */}
          <div className="audit-user-col" style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' }}>{entry.userName}</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{fmtIp(entry.ipAddress)}</div>
          </div>
        </div>
      </div>

      {/* expanded diff */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 10px', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: 'var(--t3)', textTransform: 'uppercase' }}>Field</div>
            <div style={{ padding: '6px 10px', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: '#EF4444', textTransform: 'uppercase', borderLeft: '1px solid var(--border)' }}>Before</div>
            <div style={{ padding: '6px 10px', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: '#16A34A', textTransform: 'uppercase', borderLeft: '1px solid var(--border)' }}>After</div>
          </div>

          {entry.action === 'CREATE' && entry.diff.after &&
            Object.entries(entry.diff.after)
              .filter(([k]) => !HIDDEN_FIELDS.has(k))
              .map(([field, val]) => <DiffRow key={field} field={field} before={null} after={val} />)
          }
          {entry.action === 'DELETE' && entry.diff.before &&
            Object.entries(entry.diff.before)
              .filter(([k]) => !HIDDEN_FIELDS.has(k))
              .map(([field, val]) => <DiffRow key={field} field={field} before={val} after={null} />)
          }
          {entry.action === 'UPDATE' && entry.diff.changed.length > 0 &&
            entry.diff.changed
              .filter(k => !HIDDEN_FIELDS.has(k))
              .map(field => (
                <DiffRow
                  key={field} field={field}
                  before={(entry.diff.before ?? {})[field]}
                  after={(entry.diff.after  ?? {})[field]}
                />
              ))
          }

          <div style={{ padding: '6px 10px', fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t4)', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
            Entity ID: {entry.entityId}
          </div>
        </div>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const canViewAudit = useCan('audit', 'view')
  const [entries,      setEntries]      = useState<AuditEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filterType,   setFilterType]   = useState<AuditEntityType | 'all'>('all')
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [auditPage,    setAuditPage]    = useState(1)
  const AUDIT_PAGE_SIZE = 30

  useEffect(() => {
    if (!authLoading && !canViewAudit) { router.replace('/players'); return }
    if (!authLoading && canViewAudit) {
      fetch('/api/audit?limit=500')
        .then(r => r.json())
        .then(data => { setEntries(data); setLoading(false) })
    }
  }, [authLoading])

  if (!canViewAudit) return null

  const filtered = entries.filter(e => {
    if (filterType   !== 'all' && e.entityType !== filterType)   return false
    if (filterAction !== 'all' && e.action     !== filterAction) return false
    if (search && !e.entityLabel.toLowerCase().includes(search.toLowerCase()) &&
                  !e.userName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const auditTotalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PAGE_SIZE))
  const safeAuditPage = Math.min(auditPage, auditTotalPages)
  const paginatedFiltered = filtered.slice((safeAuditPage - 1) * AUDIT_PAGE_SIZE, safeAuditPage * AUDIT_PAGE_SIZE)

  const grouped = paginatedFiltered.reduce<Record<string, AuditEntry[]>>((acc, e) => {
    const date = new Date(e.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(e)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <AppNav />

      {/* HEADER */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 4 }}>System</div>
        <h1 style={{ fontFamily: 'var(--onest)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1, margin: 0 }}>Audit Log</h1>
        <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4, marginBottom: 0 }}>
          {entries.length} event{entries.length !== 1 ? 's' : ''} recorded — immutable, append-only
        </p>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* FILTERS */}
        <div style={{
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 14px',
  display: 'flex', gap: 8, alignItems: 'center',
  flexWrap: 'wrap', marginBottom: 20,
}}>
  <input
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Search by name or user…"
    style={{
      flex: 1, minWidth: 160, height: 34,
      border: '1px solid var(--border2)', borderRadius: 5,
      background: 'var(--bg2)', fontFamily: 'var(--onest)',
      fontSize: 12, color: 'var(--t1)', padding: '0 10px', outline: 'none',
    }}
  />

  {/* action filter — scrollable row on mobile */}
  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0 }}>
    {(['all', 'CREATE', 'UPDATE', 'DELETE'] as const).map(a => {
      const style  = a !== 'all' ? ACTION_STYLE[a as AuditAction] : null
      const active = filterAction === a
      return (
        <button key={a} onClick={() => setFilterAction(a)} style={{
          fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
          padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
          border: `1px solid ${active ? (style?.border ?? 'var(--border2)') : 'var(--border)'}`,
          background: active ? (style?.bg ?? 'var(--bg3)') : 'transparent',
          color: active ? (style?.color ?? 'var(--t1)') : 'var(--t3)',
          transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {a === 'all' ? 'All' : a === 'CREATE' ? 'Created' : a === 'UPDATE' ? 'Updated' : 'Deleted'}
        </button>
      )
    })}
  </div>

  <div style={{ flexShrink: 0, minWidth: 140 }}>
    <CustomSelect value={filterType} onChange={v => setFilterType(v as AuditEntityType | 'all')} searchable={false}
      options={[{ value: 'all', label: 'All types' }, ...(Object.entries(ENTITY_LABEL) as [AuditEntityType, string][]).map(([v, l]) => ({ value: v, label: l }))]}
    />
  </div>

  <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
    {filtered.length} result{filtered.length !== 1 ? 's' : ''}
  </span>
</div>

        {/* ENTRIES */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>No audit events yet</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t4)' }}>
              Events are recorded automatically when you create, edit, or delete anything in the system
            </div>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([date, dayEntries]) => (
              <div key={date} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{date}</span>
                  <span style={{ fontWeight: 400 }}>{dayEntries.length} event{dayEntries.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dayEntries.map(entry => <AuditCard key={entry.id} entry={entry} />)}
                </div>
              </div>
            ))}
            <Pagination page={safeAuditPage} totalPages={auditTotalPages} onPageChange={setAuditPage} />
          </>
        )}
      </div>
    </div>
  )
}
