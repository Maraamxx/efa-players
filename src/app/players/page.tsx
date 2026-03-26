'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Player, Club, PaginatedResponse, Position, PlayerStatus } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { useCan } from '@/lib/auth'

const POS_CSS: Record<Position, React.CSSProperties> = {
  GK:  { background: 'rgba(234,179,8,.10)',  color: '#854d0e', borderColor: 'rgba(234,179,8,.35)' },
  DEF: { background: 'rgba(59,130,246,.09)', color: '#1d4ed8', borderColor: 'rgba(59,130,246,.30)' },
  MID: { background: 'rgba(16,185,129,.09)', color: '#065f46', borderColor: 'rgba(16,185,129,.30)' },
  FWD: { background: 'rgba(249,115,22,.09)', color: '#9a3412', borderColor: 'rgba(249,115,22,.35)' },
}

const STATUS_CSS: Record<PlayerStatus, React.CSSProperties> = {
  active:    { background: 'rgba(22,163,74,.09)',  color: '#15803d', borderColor: 'rgba(22,163,74,.30)'  },
  inactive:  { background: 'rgba(0,0,0,.04)',      color: '#999',    borderColor: 'rgba(0,0,0,.12)'      },
  suspended: { background: 'rgba(200,16,46,.08)',  color: '#C8102E', borderColor: 'rgba(200,16,46,.25)'  },
}

const FLAG = (code: string) => `https://flagcdn.com/20x15/${code.toLowerCase()}.png`

function useDebounce<T>(value: T, delay = 300): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

export default function PlayersPage() {
  const router = useRouter()
  const canCreate = useCan('players', 'create')
  const [players, setPlayers] = useState<Player[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [clubs,   setClubs]   = useState<Club[]>([])

  const [search,   setSearch]   = useState('')
  const [position, setPosition] = useState('')
  const [status,   setStatus]   = useState('')
  const [clubId,   setClubId]   = useState('')

  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  const dSearch = useDebounce(search)
  const PAGE_SIZE = 20

  useEffect(() => {
    fetch('/api/clubs').then(r => r.json()).then(setClubs)
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({
      page: String(page), pageSize: String(PAGE_SIZE),
      ...(dSearch   && { search: dSearch }),
      ...(position  && { position }),
      ...(status    && { status }),
      ...(clubId    && { clubId }),
    })
    fetch(`/api/players?${p}`)
      .then(r => r.json())
      .then((res: PaginatedResponse<Player>) => {
        setPlayers(res.data)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [page, dSearch, position, status, clubId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [dSearch, position, status, clubId])

  const clubName = (id: string | null) =>
    clubs.find(c => c.id === id)?.name.en ?? '—'

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = !!(search || position || status || clubId)
  const filterCount = [search, position, status, clubId].filter(Boolean).length

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  // keyboard shortcuts: N = new player, / = focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') {
        if (canCreate) router.push('/players/new')
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [canCreate, router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <AppNav />

      {/* PAGE HEADER */}
      <div className="page-header" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{
            fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.16em',
            color: 'var(--t3)', marginBottom: 4,
          }}>
            EFA PLAYER REGISTRY
          </div>
          <h1 style={{
            fontFamily: 'var(--onest)', fontSize: 26, fontWeight: 800,
            letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1,
          }}>
            All Players
          </h1>
          <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            {total} registered player{total !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Link href="/players/new" style={{
            fontFamily: 'var(--onest)', fontSize: 13, letterSpacing: '.14em',
            padding: '9px 22px', background: 'var(--red)', color: '#fff',
            border: '1px solid var(--red)', borderRadius: 5,
            textDecoration: 'none', display: 'inline-block', transition: 'opacity .15s',
          }}>
            + ADD PLAYER
          </Link>
        )}
      </div>

      <div className="page-body" style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* FILTERS */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', padding: '12px 16px',
          display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16,
          alignItems: 'center',
        }}>
          {/* search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--t3)', fontSize: 13, pointerEvents: 'none',
            }}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              data-search
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 28, paddingRight: 36,
                height: 34, fontSize: 13, fontFamily: 'var(--onest)',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 5, color: 'var(--t1)', outline: 'none',
              }}
            />
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600,
              color: 'var(--t4)', pointerEvents: 'none',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '1px 5px', letterSpacing: 0,
            }}>/</span>
          </div>

          {([
            ['position', position, setPosition, [['','All Positions'],['GK','Goalkeeper'],['DEF','Defender'],['MID','Midfielder'],['FWD','Forward']]],
            ['status',   status,   setStatus,   [['','All Statuses'],['active','Active'],['inactive','Inactive'],['suspended','Suspended']]],
          ] as const).map(([key, val, setter, opts]: any) => (
            <select
              key={key}
              value={val}
              onChange={(e: any) => setter(e.target.value)}
              style={{
                height: 34, fontSize: 13, fontFamily: 'var(--onest)',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 5, color: val ? 'var(--t1)' : 'var(--t3)',
                padding: '0 10px', outline: 'none', cursor: 'pointer',
                flex: '1 1 140px',
              }}
            >
              {opts.map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          <select
            value={clubId}
            onChange={e => setClubId(e.target.value)}
            style={{
              height: 34, fontSize: 13, fontFamily: 'var(--onest)',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 5, color: clubId ? 'var(--t1)' : 'var(--t3)',
              padding: '0 10px', outline: 'none', cursor: 'pointer',
              flex: '1 1 140px',
            }}
          >
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name.en}</option>)}
          </select>

          {hasFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                background: 'var(--red)', color: '#fff',
                borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{filterCount}</span>
              <button
                onClick={() => { setSearch(''); setPosition(''); setStatus(''); setClubId('') }}
                style={{
                  fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.1em',
                  color: 'var(--red)', background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: 0,
                }}
              >
                CLEAR
              </button>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', overflow: 'hidden',
        }}>
          <div className="table-scroll">
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <th style={{ padding: '10px 16px', width: 38 }} />
                {['Player','Age Group','Position','Club','Nationality','Status',''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: 'var(--onest)', fontSize: 11,
                    letterSpacing: '.14em', color: 'var(--t3)',
                    fontWeight: 400,
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', width: 38 }} />
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--s2)' }} />
                        <div>
                          <div style={{ height: 12, width: 120, background: 'var(--s2)', borderRadius: 3, marginBottom: 5 }} />
                          <div style={{ height: 10, width: 80, background: 'var(--s3)', borderRadius: 3 }} />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div style={{ height: 12, width: 60, background: 'var(--s2)', borderRadius: 3 }} />
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px' }} />
                  </tr>
                ))
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>
                      {hasFilters ? 'No players match your filters' : 'No players registered yet'}
                    </div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)', marginBottom: hasFilters ? 16 : 0 }}>
                      {hasFilters ? 'Try adjusting your search or filters' : 'Add your first player to get started'}
                    </div>
                    {hasFilters && (
                      <button
                        onClick={() => { setSearch(''); setPosition(''); setStatus(''); setClubId('') }}
                        style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 18px', border: '1px solid var(--red)', borderRadius: 5, background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                      >
                        Clear all filters
                      </button>
                    )}
                    {!hasFilters && canCreate && (
                      <a href="/players/new" style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 18px', border: '1px solid var(--red)', borderRadius: 5, background: 'var(--red)', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginTop: 12 }}>
                        + Add first player
                      </a>
                    )}
                  </td>
                </tr>
              ) : players.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/players/${p.id}`)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background .1s',
                    cursor: 'pointer',
                    background: compareIds.has(p.id) ? 'rgba(200,16,46,.03)' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = compareIds.has(p.id) ? 'rgba(200,16,46,.06)' : 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = compareIds.has(p.id) ? 'rgba(200,16,46,.03)' : 'transparent')}
                >
                  {/* Compare checkbox */}
                  <td style={{ padding: '10px 16px', width: 38 }} onClick={e => { e.stopPropagation(); toggleCompare(p.id) }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 3,
                      border: `1.5px solid ${compareIds.has(p.id) ? 'var(--red)' : 'var(--border2)'}`,
                      background: compareIds.has(p.id) ? 'var(--red)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s', cursor: 'pointer', flexShrink: 0,
                    }}>
                      {compareIds.has(p.id) && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>
                  </td>

                  {/* Player */}
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 6,
                        background: 'var(--s2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--onest)', fontSize: 14, color: 'var(--t3)',
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {p.photoUrl
                          ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : p.name.en.charAt(0)
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>
                          {p.name.en}
                        </div>
                        <div style={{
                          fontFamily: 'var(--amiri)', fontSize: 13,
                          color: 'var(--t3)', marginTop: 1,
                        }}>
                          {p.name.ar}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Age group */}
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontFamily: 'var(--onest)', fontSize: 13,
                      letterSpacing: '.06em', color: 'var(--t2)',
                    }}>
                      {p.ageGroup}
                    </span>
                  </td>

                  {/* Position */}
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.1em',
                      padding: '3px 8px', borderRadius: 3,
                      border: '1px solid',
                      ...POS_CSS[p.position],
                    }}>
                      {p.position}
                    </span>
                  </td>

                  {/* Club */}
                  <td style={{ padding: '10px 16px', color: 'var(--t2)', fontSize: 13 }}>
                    {clubName(p.currentClubId)}
                  </td>

                  {/* Nationality */}
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {p.nationalities.map(n => (
                        <img
                          key={n.countryCode}
                          src={FLAG(n.countryCode)}
                          alt={n.countryCode}
                          title={n.countryCode}
                          style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.1em',
                      padding: '3px 8px', borderRadius: 3,
                      border: '1px solid',
                      ...STATUS_CSS[p.status],
                    }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <span className="row-arrow" style={{
                      fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.1em',
                      color: 'var(--t3)', display: 'inline-block',
                      transition: 'color .15s, transform .15s',
                    }}>
                      →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>{/* /table-scroll */}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div style={{
              borderTop: '1px solid var(--border)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg3)',
            }}>
              <span style={{ fontFamily: 'var(--onest)', fontSize: 11, letterSpacing: '.1em', color: 'var(--t3)' }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} OF {total} PLAYERS
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.1em',
                    padding: '5px 12px', border: '1px solid var(--border)',
                    borderRadius: 4, background: 'transparent', color: 'var(--t2)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                  }}
                >
                  ← PREV
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '…')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((n, i) => n === '…' ? (
                    <span key={`e${i}`} style={{ padding: '5px 6px', color: 'var(--t3)', fontFamily: 'var(--onest)' }}>…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      style={{
                        fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.1em',
                        padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid',
                        borderColor: page === n ? 'var(--red)' : 'var(--border)',
                        background: page === n ? 'var(--redDim)' : 'transparent',
                        color: page === n ? 'var(--red)' : 'var(--t2)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    fontFamily: 'var(--onest)', fontSize: 12, letterSpacing: '.1em',
                    padding: '5px 12px', border: '1px solid var(--border)',
                    borderRadius: 4, background: 'transparent', color: 'var(--t2)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
                  }}
                >
                  NEXT →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMPARE BAR */}
      {compareIds.size >= 2 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--bg)', borderTop: '1px solid var(--border)',
          padding: '12px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
          animation: 'fadeIn .2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
              COMPARING {compareIds.size}
            </span>
            {Array.from(compareIds).map(cid => {
              const cp = players.find(x => x.id === cid)
              return cp ? (
                <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px 4px 10px' }}>
                  <span style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{cp.name.en}</span>
                  <span
                    onClick={() => toggleCompare(cid)}
                    style={{ cursor: 'pointer', color: 'var(--t3)', fontSize: 12, lineHeight: 1, padding: '0 2px' }}
                  >✕</span>
                </div>
              ) : null
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCompareIds(new Set())}
              style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600, padding: '7px 14px', border: '1px solid var(--border2)', borderRadius: 5, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}
            >Clear</button>
            <Link
              href={`/players/compare?ids=${Array.from(compareIds).join(',')}`}
              style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700, padding: '7px 18px', border: '1px solid var(--red)', borderRadius: 5, background: 'var(--red)', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
            >Compare Players →</Link>
          </div>
        </div>
      )}
    </div>
  )
}