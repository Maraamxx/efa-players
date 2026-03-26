'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export function AppNav() {
  const pathname = usePathname()
  const { user, logout, can } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NAV_ITEMS = [
    { label: 'Players', href: '/players', show: true },
    { label: 'Clubs',   href: '/clubs',   show: can('clubs',   'view') },
    { label: 'Leagues', href: '/leagues', show: can('leagues', 'view') },
    { label: 'Users',   href: '/users',   show: can('users',   'view') },
    { label: 'Roles',   href: '/roles',   show: can('roles',   'view') },
    { label: 'Audit',   href: '/audit',   show: can('audit',   'view') },
  ].filter(n => n.show)

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--onest)', fontSize: 13, fontWeight: active ? 600 : 500,
    color: active ? 'var(--t1)' : 'var(--t3)', padding: '5px 14px',
    textDecoration: 'none', borderBottom: `2px solid ${active ? 'var(--red)' : 'transparent'}`,
    transition: 'color .12s, border-color .12s', lineHeight: '40px',
  })

  return (
    <nav style={{ position: 'relative', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link href="/players" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 8 }}>
          <img src="/efa-logo.png" alt="EFA" style={{ height: 32, width: 32, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontWeight: 500, fontFamily: 'var(--bebas)', fontSize: 15, letterSpacing: '.10em', color: 'var(--t1)' }}>EFA PLAYERS</span>
            {/* <span style={{ fontFamily: 'var(--onest)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)' }}>PLAYER MANAGEMENT</span> */}
          </div>
        </Link>

        {/* desktop links */}
        <div className="nav-links">
          {NAV_ITEMS.map(n => {
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href))
            return (
              <Link key={n.label} href={n.href} style={linkStyle(active)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--t2)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--t3)' }}
              >{n.label}</Link>
            )
          })}
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', padding: '3px 10px 3px 4px', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--bg)', minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user.nameEn.charAt(0)}
            </div>
            <span className="nav-user-name" style={{ fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nameEn}</span>
            <span className="nav-user-role" style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t3)', whiteSpace: 'nowrap' as const }}>· {user.role.name}</span>
            <button onClick={logout} style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, color: 'var(--t3)', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 2, padding: '2px 4px', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#C8102E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >Sign out</button>
          </div>
        )}

        {/* hamburger — only visible on mobile via CSS */}
        <button
          className="nav-mobile-btn"
          onClick={() => setMobileOpen(o => !o)}
          style={{ width: 36, height: 36, background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, marginLeft: 8, flexShrink: 0 }}
        >
          <span style={{ width: 16, height: 2, background: 'var(--t2)', borderRadius: 1, transition: 'all .2s', transform: mobileOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }} />
          <span style={{ width: 16, height: 2, background: 'var(--t2)', borderRadius: 1, opacity: mobileOpen ? 0 : 1, transition: 'opacity .2s' }} />
          <span style={{ width: 16, height: 2, background: 'var(--t2)', borderRadius: 1, transition: 'all .2s', transform: mobileOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }} />
        </button>
      </div>

      {/* mobile dropdown */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          {NAV_ITEMS.map(n => {
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href))
            return (
              <Link key={n.label} href={n.href}
                onClick={() => setMobileOpen(false)}
                style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: active ? 700 : 500, color: active ? 'var(--red)' : 'var(--t1)', padding: '11px 24px', textDecoration: 'none', borderLeft: `3px solid ${active ? 'var(--red)' : 'transparent'}` }}
              >{n.label}</Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
