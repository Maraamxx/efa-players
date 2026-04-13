'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch'

export default function HomePage() {
  const [count, setCount] = useState({ players: 0, fields: 0 })

  useEffect(() => {
    Promise.all([
      apiFetch('/api/players?page=1&pageSize=1').then(r => r.json()),
      apiFetch('/api/field-schemas').then(r => r.json()),
    ]).then(([p, f]) => {
      setCount({ players: p.total ?? 0, fields: f.length ?? 0 })
    }).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--onest)' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 56, display: 'flex', alignItems: 'center', padding: '0 40px',
        background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <img src="/efa-logo.png" alt="EFA" style={{ height: 32, width: 32, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--bebas)', fontWeight: 700, fontSize: 15, letterSpacing: '.18em', color: 'var(--t1)' }}>EFA PLAYERS</span>
            <span style={{ fontFamily: 'var(--onest)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)' }}>PLAYER MANAGEMENT</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { label: 'Players', href: '/players' },
            { label: 'Fields',  href: '/fields'  },
            { label: 'Audit',   href: '/audit'   },
          ].map(n => (
            <Link key={n.label} href={n.href} style={{
              fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 500,
              color: 'var(--t3)', padding: '6px 14px', borderRadius: 5,
              textDecoration: 'none', transition: 'all .15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--t1)'
                e.currentTarget.style.background = 'var(--bg3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--t3)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link href="/players" style={{
          fontFamily: 'var(--onest)', fontSize: 12, fontWeight: 700,
          padding: '8px 20px', borderRadius: 5,
          background: 'var(--t1)', color: '#fff',
          textDecoration: 'none', marginLeft: 8, transition: 'background .15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--t1)')}
        >
          Enter System →
        </Link>
      </nav>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 8px var(--red) }
          50% { box-shadow: 0 0 18px var(--red), 0 0 32px rgba(200,16,46,.15) }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes float {
          0%,100% { transform:translateY(0) }
          50%      { transform:translateY(-8px) }
        }
        .anim-1 { opacity:0; animation:fadeUp .6s ease .1s forwards }
        .anim-2 { opacity:0; animation:fadeUp .7s ease .2s forwards }
        .anim-3 { opacity:0; animation:fadeUp .7s ease .3s forwards }
        .anim-4 { opacity:0; animation:fadeUp .7s ease .4s forwards }
        .anim-5 { opacity:0; animation:fadeUp .7s ease .5s forwards }
        .anim-6 { opacity:0; animation:fadeUp .7s ease .6s forwards }
        .feature:hover { background: #fafafa }
        .feature:hover .feat-bar { transform: scaleX(1) }
        .feat-bar {
          position:absolute;top:0;left:0;right:0;height:2px;
          background:var(--red);transform:scaleX(0);transform-origin:left;
          transition:transform .3s ease;
        }
        .wf-step:hover .wf-num { color:var(--red) }
      `}</style>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        paddingTop: 56, overflow: 'hidden',
      }}>
        {/* LEFT */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '80px 60px', position: 'relative', zIndex: 2,
        }}>
          <div className="anim-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--red)', marginBottom: 24,
          }}>
            <div style={{ width: 24, height: 1, background: 'var(--red)' }} />
            Egyptian Football Association
          </div>

          <h1 className="anim-2" style={{
            fontSize: 'clamp(52px,5.5vw,80px)', fontWeight: 900,
            lineHeight: .92, letterSpacing: '-.035em',
            color: 'var(--t1)', marginBottom: 0,
          }}>
            PLAYER<br />
            <span style={{
              color: 'transparent',
              WebkitTextStroke: '2px var(--t1)',
            }}>
              DATA
              <span style={{ WebkitTextStroke: '2px var(--red)', color: 'transparent' }}>.</span>
            </span>
            <br />
            COMMAND.
          </h1>

          <div className="anim-3" style={{
            fontFamily: 'var(--arabic)', fontSize: 20, fontWeight: 700,
            color: 'var(--t3)', direction: 'rtl', textAlign: 'left',
            marginTop: 14,
          }}>
            سجل اللاعبين — الاتحاد المصري لكرة القدم
          </div>

          <p className="anim-4" style={{
            fontSize: 16, color: 'var(--t2)', lineHeight: 1.7,
            maxWidth: 440, marginTop: 28,
          }}>
            A centralised intelligence system for managing every player in Egyptian football.
            Complete profiles, match records, dynamic analytics — in Arabic and English.
          </p>

          <div className="anim-5" style={{ display: 'flex', gap: 12, marginTop: 40, alignItems: 'center' }}>
            <Link href="/players" style={{
              fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700,
              padding: '13px 28px', borderRadius: 6,
              background: 'var(--red)', color: '#fff',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all .2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--redL)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,16,46,.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--red)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Open Player Registry <span style={{ fontSize: 16 }}>→</span>
            </Link>
            <Link href="/fields" style={{
              fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
              color: 'var(--t2)', padding: '13px 24px', borderRadius: 6,
              border: '1px solid var(--border2)', background: 'transparent',
              textDecoration: 'none', transition: 'all .2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--t2)'
                e.currentTarget.style.color = 'var(--t1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border2)'
                e.currentTarget.style.color = 'var(--t2)'
              }}
            >
              Field Manager
            </Link>
          </div>

          <div className="anim-6" style={{
            display: 'flex', gap: 32, marginTop: 56, paddingTop: 32,
            borderTop: '1px solid var(--border)',
          }}>
            {[
              { num: count.players, suffix: '+', label: 'Players registered' },
              { num: count.fields,  suffix: '',  label: 'Custom fields defined' },
              { num: 100, suffix: '%', label: 'Bilingual coverage' },
            ].map(s => (
              <div key={s.label}>
                <div style={{
                  fontSize: 32, fontWeight: 900, letterSpacing: '-.03em',
                  color: 'var(--t1)', lineHeight: 1,
                }}>
                  {s.num}<span style={{ color: 'var(--red)' }}>{s.suffix}</span>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--t3)',
                  letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 4,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — dark panel */}
        <div style={{ background: '#0A0A0A', position: 'relative', overflow: 'hidden' }}>
          {/* grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          {/* slash */}
          <div style={{
            position: 'absolute', top: '-10%', right: '28%',
            width: 2, height: '130%',
            background: 'linear-gradient(180deg,transparent,var(--red),transparent)',
            transform: 'rotate(12deg)', opacity: .25,
          }} />

          {/* player card */}
          <div className="anim-4" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'calc(100% - 80px)', maxWidth: 360,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 12, padding: 22,
          }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 8,
                background: '#1a1a1a', border: '1px solid rgba(255,255,255,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--onest)', fontSize: 18, fontWeight: 900,
                color: 'rgba(255,255,255,.25)', flexShrink: 0,
              }}>MI</div>
              <div>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  Mohamed Ibrahim
                </div>
                <div style={{ fontFamily: 'var(--arabic)', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 2, direction: 'rtl', textAlign: 'left' }}>
                  محمد إبراهيم
                </div>
              </div>
            </div>
            {/* attrs */}
            <div style={{
              display: 'flex', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 5, overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { l: 'Position', v: 'MID', c: 'var(--red)' },
                { l: 'Age',      v: '2007', c: '#fff' },
                { l: 'Height',   v: '178cm', c: '#fff' },
                { l: 'Status',   v: 'Active', c: '#4ADE80' },
              ].map((a, i) => (
                <div key={i} style={{
                  flex: 1, padding: '8px 10px',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,.08)' : 'none',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 3 }}>
                    {a.l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: a.c }}>{a.v}</div>
                </div>
              ))}
            </div>
            {/* form strip */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
              {['W','W','L','D','W','W'].map((r, i) => (
                <div key={i} style={{
                  flex: 1, height: 26, borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 800,
                  background: r==='W' ? 'rgba(74,222,128,.1)' : r==='L' ? 'rgba(200,16,46,.1)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${r==='W' ? 'rgba(74,222,128,.2)' : r==='L' ? 'rgba(200,16,46,.2)' : 'rgba(255,255,255,.08)'}`,
                  color: r==='W' ? '#4ADE80' : r==='L' ? '#FF6B7A' : 'rgba(255,255,255,.3)',
                }}>{r}</div>
              ))}
            </div>
            {/* bars */}
            {[
              { label: 'Goals',   val: 11,    pct: 73, color: 'var(--red)' },
              { label: 'Assists', val: 7,     pct: 55, color: '#666' },
              { label: 'Minutes', val: 1842,  pct: 85, color: '#444' },
            ].map(b => (
              <div key={b.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)' }}>{b.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{b.val.toLocaleString()}</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 1 }}>
                  <div style={{ width: `${b.pct}%`, height: '100%', borderRadius: 1, background: b.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* floating badges */}
          {[
            { label: 'New players', val: '+3', sub: 'This week', style: { top: 100, right: 24, animation: 'float 4s ease-in-out infinite' } },
            { label: 'Audit events', val: '284', sub: 'All logged', style: { bottom: 120, left: 24, animation: 'float 4s ease-in-out 1.5s infinite' } },
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute',
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 8, padding: '10px 14px',
              backdropFilter: 'blur(8px)',
              ...b.style,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 4 }}>
                {b.label}
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{b.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* METRICS BAR */}
      <div style={{
        background: '#0A0A0A', padding: '48px 60px',
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
      }}>
        {[
          { num: `${count.players}+`, label: 'Registered Players' },
          { num: '100%',  label: 'Bilingual Coverage' },
          { num: '8',     label: 'Field Types Available' },
          { num: '0',     label: 'Untracked Changes' },
        ].map((m, i) => (
          <div key={i} style={{
            padding: '24px 32px', textAlign: 'center',
            borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 44, fontWeight: 900, letterSpacing: '-.04em', color: '#fff', lineHeight: 1 }}>
              {m.num.replace(/[+%]/, '')}<span style={{ color: 'var(--red)' }}>{m.num.match(/[+%]/)?.[0] ?? ''}</span>
            </div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginTop: 8 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section style={{ padding: '100px 60px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16,
        }}>
          <div style={{ width: 24, height: 1, background: 'var(--red)' }} />
          System capabilities
        </div>
        <h2 style={{
          fontFamily: 'var(--onest)', fontSize: 'clamp(28px,3vw,42px)',
          fontWeight: 900, letterSpacing: '-.025em', color: 'var(--t1)',
          lineHeight: 1.05, maxWidth: 520, marginBottom: 52,
        }}>
          Everything a football federation needs in one place
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 1, background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
        }}>
          {[
            { icon: '◉', title: 'Complete Player Profiles', desc: 'Name, birthdate, nationalities, club history, contracts, physical stats, and guardian contacts — all structured.', tag: 'Core data' },
            { icon: '▶', title: 'Match Records & Video', desc: 'Log every match with full stats and attach videos up to 8GB. Streams via HLS for smooth in-browser playback.', tag: 'Media' },
            { icon: '⊞', title: 'Dynamic Custom Fields', desc: 'Create any field type — text, number, date, dropdown, radio, file — bilingual. Appears on every player automatically.', tag: 'Flexible' },
            { icon: '◎', title: 'Performance Analysis', desc: 'Auto-computed goals, assists, appearances, and minutes. Custom scouting fields and analysis videos per player.', tag: 'Analytics' },
            { icon: '⟳', title: 'Full Audit Trail', desc: 'Every change — who made it, what changed, when — is permanently recorded. Nothing is ever lost or modified.', tag: 'Compliance' },
            { icon: '◈', title: 'Roles & Permissions', desc: 'Create custom roles with fine-grained permissions. Control exactly who can view, edit, or manage each section.', tag: 'Access control' },
          ].map((f, i) => (
            <div key={i} className="feature" style={{
              background: 'var(--bg)', padding: '32px 28px',
              transition: 'background .2s', cursor: 'default', position: 'relative',
            }}>
              <div className="feat-bar" />
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 18, transition: 'all .2s',
              }}>
                {f.icon}
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--t1)', marginBottom: 8 }}>
                {f.title}
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', lineHeight: 1.65 }}>
                {f.desc}
              </div>
              <span style={{
                display: 'inline-block', marginTop: 14,
                fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
                letterSpacing: '.06em', textTransform: 'uppercase',
                color: 'var(--red)', padding: '3px 8px', borderRadius: 3,
                background: 'var(--redDim)', border: '1px solid rgba(200,16,46,.15)',
              }}>
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section style={{ padding: '80px 60px', borderTop: '1px solid var(--border)' }}>
        <h2 style={{
          fontFamily: 'var(--onest)', fontSize: 'clamp(26px,2.5vw,36px)',
          fontWeight: 900, letterSpacing: '-.025em', color: 'var(--t1)',
          marginBottom: 48, maxWidth: 480, lineHeight: 1.1,
        }}>
          From registration to analysis in four steps
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { n: '01', title: 'Register player', desc: 'Fill in the 6-step wizard — personal info, football data, nationalities, guardian contact, and initial matches.' },
            { n: '02', title: 'Log matches',     desc: 'Add match records with opponent, competition, stats, and attach full-length match videos.' },
            { n: '03', title: 'Analyse',          desc: 'View auto-computed career stats, form strips, and custom scouting fields from your technical staff.' },
            { n: '04', title: 'Audit everything', desc: 'Every edit, deletion, and view is logged with timestamp, user, and full before/after diff.' },
          ].map((s, i) => (
            <div key={i} className="wf-step" style={{
              padding: '24px 28px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              position: 'relative',
            }}>
              {i < 3 && (
                <div style={{ position: 'absolute', top: 24, right: -8, fontSize: 13, color: 'var(--t4)', zIndex: 1 }}>→</div>
              )}
              <div className="wf-num" style={{
                fontFamily: 'var(--onest)', fontSize: 52, fontWeight: 900,
                color: '#e8e8e8', letterSpacing: '-.04em', lineHeight: 1, marginBottom: 12,
                transition: 'color .2s',
              }}>
                {s.n}
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '72px 60px', background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--onest)', fontSize: 'clamp(26px,2.5vw,36px)', fontWeight: 900, letterSpacing: '-.025em', color: 'var(--t1)', lineHeight: 1.1 }}>
            Ready to manage Egyptian football?
          </h2>
          <p style={{ fontFamily: 'var(--onest)', fontSize: 15, color: 'var(--t3)', marginTop: 10, maxWidth: 440, lineHeight: 1.6 }}>
            The full player database is live. Start adding players, define your custom fields, and configure roles for your team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <Link href="/players" style={{
            fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 700,
            padding: '14px 32px', borderRadius: 6,
            background: 'var(--red)', color: '#fff', textDecoration: 'none',
            transition: 'all .2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--redL)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--red)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            Open Player Registry →
          </Link>
          <Link href="/fields" style={{
            fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 600,
            padding: '14px 24px', borderRadius: 6,
            border: '1px solid var(--border2)', color: 'var(--t2)',
            textDecoration: 'none', transition: 'all .2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--t2)'
              e.currentTarget.style.color = 'var(--t1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--t2)'
            }}
          >
            Field Manager
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '22px 60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/efa-logo.png" alt="EFA" style={{ height: 28, width: 28, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--bebas)', fontSize: 13, letterSpacing: '.18em', color: 'var(--t1)' }}>EFA REGISTRY</span>
            <span style={{ fontFamily: 'var(--onest)', fontSize: 9, letterSpacing: '.12em', color: 'var(--t3)' }}>PLAYER MANAGEMENT</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--arabic)', fontSize: 14, color: 'var(--t4)' }}>
          الاتحاد المصري لكرة القدم
        </div>
        <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t4)' }}>
          © 2024 Egyptian Football Association
        </div>
      </footer>
    </div>
  )
}