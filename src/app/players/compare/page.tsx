'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Player, Club, League } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { FLAG, POS_FULL } from '@/lib/constants'
import { apiFetch } from '@/lib/apiFetch'

function age(bd: string) {
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

type PlayerStats = {
  totalAppearances: number
  totalGoals: number
  totalAssists: number
  totalMinutes: number
}
type PlayerData = { player: Player; stats: PlayerStats }

const labelCol = 'minmax(140px, 200px)'
const playerCol = 'minmax(180px, 1fr)'

// Extract numeric value from stat string for comparison
function numVal(v: string): number | null {
  const m = v.match(/^([\d.]+)/)
  return m ? parseFloat(m[1]) : null
}

// Determine which players have the "best" value for a stat row
function bestIndices(values: string[], higherIsBetter: boolean): Set<number> {
  const nums = values.map(numVal)
  const validNums = nums.filter((n): n is number => n !== null)
  if (validNums.length < 2) return new Set()
  const best = higherIsBetter ? Math.max(...validNums) : Math.min(...validNums)
  const indices = new Set<number>()
  nums.forEach((n, i) => { if (n === best) indices.add(i) })
  if (indices.size === validNums.length) return new Set() // all tied = no winner
  return indices
}

// higherIsBetter for each comparable stat
const COMPARABLE: Record<string, boolean> = {
  'Appearances': true,
  'Goals': true,
  'Assists': true,
  'Minutes': true,
  'Goal Contributions': true,
}

type StatRow = { label: string; value: string; section: 'info' | 'performance' }

function STATS(
  d: PlayerData,
  clubName: (id: string | null | undefined) => string,
  leagueName: (id: string | null | undefined) => string,
): StatRow[] {
  const s = d.stats
  return [
    // Info section
    { label: 'Position',     value: (d.player.positions ?? [(d.player as any).position]).filter(Boolean).join(', ') || '—', section: 'info' },
    { label: 'Age',          value: d.player.birthdate ? `${age(d.player.birthdate)} yrs` : '—', section: 'info' },
    { label: 'Club',         value: clubName(d.player.currentClubId), section: 'info' },
    { label: 'League',       value: leagueName(d.player.currentLeagueId), section: 'info' },
    { label: 'Height',       value: d.player.height ? `${d.player.height} cm` : '—', section: 'info' },
    { label: 'Pref. foot',   value: d.player.preferredFoot ?? '—', section: 'info' },
    { label: 'Status',       value: d.player.status ?? '—', section: 'info' },
    // Performance section
    { label: 'Appearances',        value: String(s.totalAppearances), section: 'performance' },
    { label: 'Goals',              value: String(s.totalGoals), section: 'performance' },
    { label: 'Assists',            value: String(s.totalAssists), section: 'performance' },
    { label: 'Minutes',            value: s.totalMinutes.toLocaleString(), section: 'performance' },
    { label: 'Goal Contributions', value: String(s.totalGoals + s.totalAssists), section: 'performance' },
  ]
}

export default function ComparePage() {
  const params = useSearchParams()
  const router = useRouter()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3)

  const [data, setData] = useState<PlayerData[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // fetch supporting data once
  useEffect(() => {
    Promise.all([
      apiFetch('/api/players?pageSize=9999').then(r => r.json()),
      apiFetch('/api/clubs').then(r => r.json()),
      apiFetch('/api/leagues').then(r => r.ok ? r.json() : []),
    ]).then(([players, clubsData, leaguesData]) => {
      setAllPlayers(players.data ?? players)
      setClubs(clubsData)
      setLeagues(leaguesData)
    })
  }, [])

  // fetch selected players + their stats whenever ids change
  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return }
    setLoading(true)
    Promise.all(
      ids.map(async id => {
        const [player, analysis] = await Promise.all([
          apiFetch(`/api/players/${id}`).then(r => r.ok ? r.json() : null),
          apiFetch(`/api/players/${id}/analysis`).then(r => r.ok ? r.json() : null),
        ])
        if (!player) return null
        const stats: PlayerStats = {
          totalAppearances: analysis?.totalAppearances ?? 0,
          totalGoals:       analysis?.totalGoals ?? 0,
          totalAssists:     analysis?.totalAssists ?? 0,
          totalMinutes:     analysis?.totalMinutes ?? 0,
        }
        return { player, stats } as PlayerData
      })
    ).then(results => {
      setData(results.filter((d): d is PlayerData => !!d))
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const clubName = (cid: string | null | undefined) =>
    clubs.find(c => c.id === cid)?.name.en ?? '—'

  const leagueName = (lid: string | null | undefined) =>
    leagues.find(l => l.id === lid)?.name?.en ?? '—'

  function addPlayer(newId: string) {
    router.push(`/players/compare?ids=${[...ids, newId].join(',')}`)
  }

  function removePlayer(removeId: string) {
    const remaining = ids.filter(id => id !== removeId)
    router.push(remaining.length ? `/players/compare?ids=${remaining.join(',')}` : '/players/compare')
  }

  const filteredPlayers = allPlayers.filter(p =>
    !ids.includes(p.id) && (
      !search ||
      (p.name?.en ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.name?.ar ?? '').includes(search)
    )
  ).slice(0, 8)

  const ROW_LABEL: React.CSSProperties = {
    padding: '10px 16px',
    fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700,
    letterSpacing: '.04em', textTransform: 'uppercase',
    color: 'var(--t3)', background: 'var(--bg3)',
    borderRight: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <AppNav />

      {/* HEADER */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: 'var(--t3)', marginBottom: 8, display: 'flex', gap: 8 }}>
          <Link href="/players" style={{ color: 'var(--t3)', textDecoration: 'none' }}>PLAYERS</Link>
          <span style={{ opacity: .3 }}>/</span>
          <span style={{ color: 'var(--t2)' }}>COMPARE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--onest)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1 }}>
              Player Comparison
            </h1>
            <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
              {data.length} player{data.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search input */}
            {ids.length < 3 && (
              <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: 300, minWidth: 200 }}>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
                    onFocus={e => { setSearchOpen(true); e.target.style.borderColor = 'var(--red)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border2)' }}
                    placeholder={`Add ${ids.length === 0 ? 'a' : 'another'} player to compare…`}
                    style={{
                      width: '100%', height: 38,
                      border: '1px solid var(--border2)', borderRadius: 'var(--r)',
                      background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 13,
                      color: 'var(--t1)', padding: '0 12px 0 34px', outline: 'none',
                      transition: 'border-color .15s',
                    }}
                  />
                </div>

                {/* dropdown */}
                {searchOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r)', marginTop: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,.1)',
                    zIndex: 20, maxHeight: 280, overflowY: 'auto',
                  }}>
                    {filteredPlayers.length === 0 ? (
                      <div style={{ padding: '14px 16px', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', textAlign: 'center' }}>
                        {search ? 'No players found' : 'Type to search players'}
                      </div>
                    ) : filteredPlayers.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => { addPlayer(p.id); setSearch(''); setSearchOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 5, flexShrink: 0,
                          background: 'var(--s2)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700,
                          color: 'var(--t3)', overflow: 'hidden',
                        }}>
                          {p.photoUrl
                            ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (p.name?.en ?? 'P').slice(0, 2).toUpperCase()
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                            {p.name?.en}
                          </div>
                          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>
                            {(p.positions ?? [(p as any).position]).filter(Boolean).join(', ') || '—'}
                            {p.currentClubId ? ` · ${clubName(p.currentClubId)}` : ''}
                            {p.birthdate ? ` · ${age(p.birthdate)} yrs` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 3, flexShrink: 0,
                          background: 'var(--redDim)', border: '1px solid var(--redBorder)',
                          color: 'var(--red)',
                        }}>+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link href="/players" style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 16px', border: '1px solid var(--border2)', borderRadius: 5, color: 'var(--t2)', textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
              ← Back to Players
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: 1200, margin: '0 auto' }}>
        {loading && ids.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          </div>
        ) : ids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>No players selected</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>Use the search above to add players to compare</div>
            <Link href="/players" style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--red)', textDecoration: 'none' }}>
              Go to Players →
            </Link>
          </div>
        ) : (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', overflowX: 'auto' }}>

            {/* Player header row */}
            <div style={{ display: 'grid', gridTemplateColumns: `${labelCol} repeat(${data.length}, ${playerCol})`, borderBottom: '2px solid var(--border)' }}>
              <div style={{ padding: '16px', background: 'var(--bg3)' }} />
              {data.map(d => (
                <div key={d.player.id} style={{ padding: '16px', borderLeft: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 6,
                      background: 'var(--s2)', border: '1px solid var(--border2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800,
                      color: 'var(--t3)', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {d.player.photoUrl
                        ? <img src={d.player.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (d.player.name?.en ?? 'P').slice(0, 2).toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/players/${d.player.id}`} style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 800, color: 'var(--t1)', textDecoration: 'none', display: 'block', lineHeight: 1.2 }}>
                        {d.player.name?.en}
                      </Link>
                      <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
                        {(d.player.positions ?? [(d.player as any).position]).filter(Boolean).join(', ') || '—'} · {d.player.birthdate ? `${age(d.player.birthdate)} yrs` : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                        {(d.player.nationalities ?? []).map(n => (
                          <img key={n.countryCode} src={FLAG(n.countryCode)} alt={n.countryCode} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removePlayer(d.player.id)}
                      title="Remove player"
                      style={{ width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--t3)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--redDim)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Single player hint */}
            {!loading && data.length === 1 && ids.length === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: `${labelCol} ${playerCol}`, background: 'rgba(200,16,46,.03)', borderBottom: '1px solid var(--border)' }}>
                <div />
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                  Use the search above to add another player and start comparing
                </div>
              </div>
            )}

            {/* Info rows */}
            {data.length > 0 && STATS(data[0], clubName, leagueName).filter(s => s.section === 'info').map(stat => (
              <div key={stat.label}
                style={{ display: 'grid', gridTemplateColumns: `${labelCol} repeat(${data.length}, ${playerCol})`, borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={ROW_LABEL}>{stat.label}</div>
                {data.map(d => {
                  const s = STATS(d, clubName, leagueName).find(x => x.label === stat.label)
                  return (
                    <div key={d.player.id} style={{ padding: '10px 16px', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 500, color: s?.value && s.value !== '—' ? 'var(--t1)' : 'var(--t3)', borderLeft: '1px solid var(--border)' }}>
                      {s?.value ?? '—'}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Performance section header */}
            {data.length > 0 && (
              <div style={{ background: 'var(--bg3)', padding: '6px 16px', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                Performance
                {data.length >= 2 && <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 500, letterSpacing: 0, textTransform: 'none' as const, color: 'var(--t4)' }}>— 👑 marks the leader</span>}
              </div>
            )}

            {/* Performance rows */}
            {data.length > 0 && STATS(data[0], clubName, leagueName).filter(s => s.section === 'performance').map(stat => {
              const allValues = data.map(d => STATS(d, clubName, leagueName).find(x => x.label === stat.label)?.value ?? '—')
              const isComparable = stat.label in COMPARABLE && data.length >= 2
              const winners = isComparable ? bestIndices(allValues, COMPARABLE[stat.label]) : new Set<number>()

              return (
              <div key={stat.label}
                style={{ display: 'grid', gridTemplateColumns: `${labelCol} repeat(${data.length}, ${playerCol})`, borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={ROW_LABEL}>{stat.label}</div>
                {data.map((d, idx) => {
                  const s = STATS(d, clubName, leagueName).find(x => x.label === stat.label)
                  const isWinner = winners.has(idx)
                  const val = s?.value ?? '—'
                  const hasValue = val !== '—' && val !== '0'
                  return (
                    <div key={d.player.id} style={{
                      padding: '10px 16px', fontFamily: 'var(--onest)', fontSize: isWinner ? 15 : 13,
                      fontWeight: isWinner ? 800 : 500,
                      color: isWinner ? 'var(--green)' : hasValue ? 'var(--t1)' : 'var(--t3)',
                      borderLeft: '1px solid var(--border)',
                      background: isWinner ? 'rgba(22,163,74,.06)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}>
                      {isWinner && <span style={{ fontSize: 13 }}>👑</span>}
                      {val}
                    </div>
                  )
                })}
              </div>
            )})}


            {/* Scouting section */}
            {data.length > 0 && (
              <>
                <div style={{ background: 'var(--bg3)', padding: '6px 16px', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>
                  Scouting
                </div>

                {/* Strengths */}
                {(() => {
                  const counts = data.map(d => (d.player.strengths ?? []).length)
                  const max = Math.max(...counts)
                  const sWinners = data.length >= 2 && max > 0 && counts.filter(c => c === max).length < data.length
                    ? new Set(counts.map((c, i) => c === max ? i : -1).filter(i => i >= 0))
                    : new Set<number>()
                  return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: `${labelCol} repeat(${data.length}, ${playerCol})`, borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ ...ROW_LABEL, alignItems: 'flex-start', paddingTop: 12 }}>Strengths</div>
                  {data.map((d, idx) => (
                    <div key={d.player.id} style={{
                      padding: '10px 16px', borderLeft: '1px solid var(--border)',
                      display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'flex-start',
                      background: sWinners.has(idx) ? 'rgba(230,197,79,.08)' : 'transparent',
                    }}>
                      {sWinners.has(idx) && <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'linear-gradient(135deg, #FFF7E0, #FFF1CC)', border: '1px solid #E6C54F', color: '#8B6914', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: '.03em' }}>🏆 Most strengths</span>}
                      {(d.player.strengths ?? []).length === 0
                        ? <span style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t4)' }}>—</span>
                        : (d.player.strengths ?? []).map(s => (
                          <span key={s} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 3, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.2)', color: 'var(--green)' }}>{s}</span>
                        ))
                      }
                    </div>
                  ))}
                </div>
                  )
                })()}

                {/* Weaknesses */}
                {(() => {
                  const counts = data.map(d => (d.player.weaknesses ?? []).length)
                  const min = Math.min(...counts)
                  const wWinners = data.length >= 2 && counts.some(c => c > 0) && counts.filter(c => c === min).length < data.length
                    ? new Set(counts.map((c, i) => c === min ? i : -1).filter(i => i >= 0))
                    : new Set<number>()
                  return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: `${labelCol} repeat(${data.length}, ${playerCol})`, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ ...ROW_LABEL, alignItems: 'flex-start', paddingTop: 12 }}>Weaknesses</div>
                  {data.map((d, idx) => (
                    <div key={d.player.id} style={{
                      padding: '10px 16px', borderLeft: '1px solid var(--border)',
                      display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'flex-start',
                      background: wWinners.has(idx) ? 'rgba(230,197,79,.08)' : 'transparent',
                    }}>
                      {wWinners.has(idx) && <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'linear-gradient(135deg, #FFF7E0, #FFF1CC)', border: '1px solid #E6C54F', color: '#8B6914', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: '.03em' }}>🛡 Fewest weaknesses</span>}
                      {(d.player.weaknesses ?? []).length === 0
                        ? <span style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t4)' }}>—</span>
                        : (d.player.weaknesses ?? []).map(w => (
                          <span key={w} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 3, background: 'var(--redDim)', border: '1px solid var(--redBorder)', color: 'var(--red)' }}>{w}</span>
                        ))
                      }
                    </div>
                  ))}
                </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
