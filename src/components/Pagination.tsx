'use client'

import { useMemo, useState } from 'react'

interface Props {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const items: (number | '...')[] = [1]
    if (page > 3) items.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) items.push(i)
    if (page < totalPages - 2) items.push('...')
    if (totalPages > 1) items.push(totalPages)
    return items
  }, [page, totalPages])

  if (totalPages <= 1) return null

  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 5,
    border: '1px solid var(--border2)', background: 'transparent',
    fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 600,
    color: disabled ? 'var(--t4)' : 'var(--t2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .12s',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '16px 0' }}>
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)} style={btn(page === 1)}>‹</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t4)', width: 32, textAlign: 'center' }}>…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} style={{
            ...btn(false),
            background: p === page ? 'var(--red)' : 'transparent',
            borderColor: p === page ? 'var(--red)' : 'var(--border2)',
            color: p === page ? '#fff' : 'var(--t2)',
            fontWeight: p === page ? 700 : 500,
          }}>{p}</button>
        )
      )}
      <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} style={btn(page === totalPages)}>›</button>
    </div>
  )
}

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = items.slice((safePage - 1) * pageSize, safePage * pageSize)
  return { page: safePage, setPage, totalPages, paginated, total: items.length }
}
