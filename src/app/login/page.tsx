'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

const PRESETS = [
  { email: 'admin@efa.eg',    password: 'admin123',   role: 'Super Admin', desc: 'Full access'        },
  { email: 'scout@efa.eg',    password: 'scout123',   role: 'Scout',       desc: 'View + add players' },
  { email: 'analyst@efa.eg',  password: 'analyst123', role: 'Analyst',     desc: 'View only'          },
]

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #C8102E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#999' }}>
          EFA PLAYERS
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const submit = async (e?: React.FormEvent, preset?: typeof PRESETS[0]) => {
    e?.preventDefault()
    const em = preset?.email    ?? email
    const pw = preset?.password ?? password
    if (!em || !pw) { setError('Enter email and password'); return }
    setSubmitting(true); setError('')
    const result = await login(em, pw)
    if (result.error) { setError(result.error); setSubmitting(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 40, border: '1px solid var(--border2)',
    borderRadius: 'var(--r)', background: 'var(--bg)',
    fontFamily: 'var(--onest)', fontSize: 13,
    color: 'var(--t1)', padding: '0 12px', outline: 'none', transition: 'border-color .15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 36 }}>
          <img src="/efa-logo.png" alt="EFA" style={{ height: 36, width: 36, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--bebas)', fontSize: 17, letterSpacing: '.18em', color: 'var(--t1)' }}>EFA PLAYERS</span>
            <span style={{ fontFamily: 'var(--onest)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)' }}>PLAYER MANAGEMENT</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--t1)', marginBottom: 4 }}>Sign in</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)' }}>Egyptian Football Association — Player Management System</div>
          </div>

          <form onSubmit={submit} style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.eg" style={inp}
                onFocus={e => (e.target.style.borderColor = '#C8102E')}
                onBlur={e => (e.target.style.borderColor = 'var(--border2)')} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp}
                onFocus={e => (e.target.style.borderColor = '#C8102E')}
                onBlur={e => (e.target.style.borderColor = 'var(--border2)')} />
            </div>

            {error && (
              <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: '#C8102E', background: 'rgba(200,16,46,.06)', border: '1px solid rgba(200,16,46,.2)', borderRadius: 5, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} style={{ width: '100%', height: 40, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, border: '1px solid #C8102E', borderRadius: 'var(--r)', background: submitting ? 'var(--t3)' : '#C8102E', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all .15s', marginTop: 4 }}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ padding: '0 20px 22px' }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              Demo accounts — click to sign in instantly
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PRESETS.map(p => (
                <button key={p.email} onClick={() => submit(undefined, p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg2)', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' as const }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,16,46,.3)'; e.currentTarget.style.background = 'rgba(200,16,46,.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>
                    {p.role.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{p.role}</div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>{p.email} · {p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
