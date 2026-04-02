'use client'

import { useState, useEffect } from 'react'
import type { Club, League } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { apiFetch } from '@/lib/apiFetch'
import { useAuth } from '@/lib/auth'
import { useModalLock } from '@/lib/useModalLock'
import { CustomSelect } from '@/components/CustomSelect'

const COUNTRIES = [
  { code: 'EG', name: 'Egypt' },       { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },         { code: 'QA', name: 'Qatar' },
  { code: 'MA', name: 'Morocco' },     { code: 'DZ', name: 'Algeria' },
  { code: 'TN', name: 'Tunisia' },     { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },       { code: 'CM', name: 'Cameroon' },
  { code: 'SN', name: 'Senegal' },     { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'SD', name: 'Sudan' },       { code: 'LY', name: 'Libya' },
  { code: 'JO', name: 'Jordan' },      { code: 'IQ', name: 'Iraq' },
  { code: 'KW', name: 'Kuwait' },      { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },        { code: 'LB', name: 'Lebanon' },
  { code: 'GB', name: 'England' },     { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },     { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },       { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'TR', name: 'Turkey' },
  { code: 'BR', name: 'Brazil' },      { code: 'AR', name: 'Argentina' },
  { code: 'US', name: 'United States' },{ code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },       { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' },
]
const countryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code
const FLAG = (code: string) => `https://flagcdn.com/20x15/${code.toLowerCase()}.png`

export default function ClubsPage() {
  const { can } = useAuth()
  const [clubs,       setClubs]       = useState<Club[]>([])
  const [leagues,     setLeagues]     = useState<League[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editClub,    setEditClub]    = useState<Club | null>(null)
  const [deleteClub,  setDeleteClub]  = useState<Club | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [draft,       setDraft]       = useState({ nameEn: '', nameAr: '', leagueId: '', country: 'EG' })
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  useModalLock(showForm || !!deleteClub)

  const load = () => {
    Promise.all([
      fetch('/api/clubs').then(r => r.json()),
      fetch('/api/leagues').then(r => r.json()),
    ]).then(([c, l]) => { setClubs(c); setLeagues(l); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setDraft({ nameEn: '', nameAr: '', leagueId: '', country: 'EG' })
    setEditClub(null); setErrors({}); setShowForm(true)
  }
  const openEdit = (club: Club) => {
    setDraft({ nameEn: club.name.en, nameAr: club.name.ar, leagueId: club.leagueId, country: club.country })
    setEditClub(club); setErrors({}); setShowForm(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.nameEn.trim()) e.nameEn = 'Required'
    if (!draft.nameAr.trim()) e.nameAr = 'Required'
    if (!draft.leagueId)      e.leagueId = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      name: { en: draft.nameEn.trim(), ar: draft.nameAr.trim() },
      leagueId: draft.leagueId, country: draft.country,
      logoUrl: null, isActive: true,
    }
    if (editClub) {
      await apiFetch(`/api/clubs/${editClub.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    } else {
      await apiFetch('/api/clubs', { method: 'POST', body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); load()
  }

  const deleteConfirmed = async () => {
    if (!deleteClub) return
    await apiFetch(`/api/clubs/${deleteClub.id}`, { method: 'DELETE' })
    setDeleteClub(null); load()
  }

  const leagueName = (id: string) => leagues.find(l => l.id === id)?.name.en ?? '—'

  const inp = (err?: string): React.CSSProperties => ({
    width: '100%', height: 40,
    border: `1px solid ${err ? '#C8102E' : 'var(--border2)'}`,
    borderRadius: 'var(--r)', background: 'var(--bg)',
    fontFamily: 'var(--onest)', fontSize: 13,
    color: 'var(--t1)', padding: '0 12px', outline: 'none',
    boxSizing: 'border-box',
  })

  const lbl: React.CSSProperties = {
    fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600,
    letterSpacing: '.06em', textTransform: 'uppercase',
    color: 'var(--t3)', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin     { to   { transform:rotate(360deg) } }

        /* hide league column on mobile */
        @media (max-width: 640px) {
          .clubs-col-league { display: none !important; }
          .clubs-col-country { display: none !important; }
        }
        @media (max-width: 480px) {
          .clubs-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .clubs-header-btn { align-self: flex-start; }
        }
      `}</style>

      <AppNav />

      {/* HEADER */}
      <div className="clubs-header" style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 2 }}>Management</div>
          <h1 style={{ fontFamily: 'var(--onest)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1, margin: 0 }}>Clubs</h1>
          <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 3, marginBottom: 0 }}>{clubs.length} clubs registered</p>
        </div>
        {can('clubs', 'create') && (
          <button className="clubs-header-btn" onClick={openCreate} style={{
            fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600,
            padding: '9px 20px', border: '1px solid #C8102E',
            borderRadius: 6, background: '#C8102E', color: '#fff', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            + Add Club
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: '16px 20px', maxWidth: 960, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}>
            <div style={{ width: 24, height: 24, border: '2px solid #C8102E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          </div>
        ) : clubs.length === 0 ? (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 700, color: 'var(--t3)', marginBottom: 10 }}>No clubs yet</div>
            {can('clubs', 'create') && (
              <button onClick={openCreate} style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '8px 20px', border: '1px solid #C8102E', borderRadius: 5, background: '#C8102E', color: '#fff', cursor: 'pointer' }}>
                Add first club
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {/* mobile card list — shown under 640px */}
            <div style={{ display: 'none' }} className="clubs-mobile-list">
              {clubs.map(club => (
                <div key={club.id} style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img
                    src={`https://flagcdn.com/20x15/${club.country.toLowerCase()}.png`}
                    alt={club.country}
                    style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name.en}</div>
                    <div style={{ fontFamily: 'var(--amiri)', fontSize: 13, color: 'var(--t3)', direction: 'rtl', textAlign: 'left', marginTop: 1 }}>{club.name.ar}</div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{leagueName(club.leagueId)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    {can('clubs', 'edit') && (
                      <button onClick={() => openEdit(club)} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Edit</button>
                    )}
                    {can('clubs', 'delete') && (
                      <button onClick={() => setDeleteClub(club)} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid rgba(200,16,46,.3)', borderRadius: 4, background: 'rgba(200,16,46,.06)', color: '#C8102E', cursor: 'pointer' }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* desktop table — hidden under 640px via CSS */}
            <div className="clubs-desktop-table">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    <th style={th}>Club</th>
                    <th style={th}>Arabic Name</th>
                    <th style={{ ...th }} className="clubs-col-league">League</th>
                    <th style={{ ...th }} className="clubs-col-country">Country</th>
                    <th style={{ ...th, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(club => (
                    <tr key={club.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--onest)', fontWeight: 700, color: 'var(--t1)' }}>{club.name.en}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--amiri)', fontSize: 15, color: 'var(--t2)', direction: 'rtl', textAlign: 'left' }}>{club.name.ar}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--onest)', color: 'var(--t2)' }} className="clubs-col-league">{leagueName(club.leagueId)}</td>
                      <td style={{ padding: '12px 16px' }} className="clubs-col-country">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <img src={`https://flagcdn.com/20x15/${club.country.toLowerCase()}.png`} alt={club.country} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />
                          <span style={{ fontFamily: 'var(--onest)', color: 'var(--t2)', fontSize: 12 }}>{club.country}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {can('clubs', 'edit') && (
                            <button onClick={() => openEdit(club)} style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Edit</button>
                          )}
                          {can('clubs', 'delete') && (
                            <button onClick={() => setDeleteClub(club)}
                              style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--border2)', borderRadius: 4, background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,16,46,.4)'; e.currentTarget.style.color = '#C8102E'; e.currentTarget.style.background = 'rgba(200,16,46,.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent' }}
                            >Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '24px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div style={{ marginTop: 'auto', marginBottom: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', width: '100%', maxWidth: 520, animation: 'modalIn .2s ease' }} onClick={e => e.stopPropagation()}>
              {/* drag handle for mobile */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
              </div>

              <div style={{ padding: '14px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>
                  {editClub ? 'Edit Club' : 'Add Club'}
                </div>
                <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Club Name (English) *</label>
                  <input value={draft.nameEn}
                    onChange={e => { const v = e.target.value; if (/[\u0600-\u06FF]/.test(v)) return; setDraft(d => ({ ...d, nameEn: v })) }}
                    placeholder="e.g. Al Ahly"
                    style={inp(errors.nameEn)}
                  />
                  {errors.nameEn && <div style={{ fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.nameEn}</div>}
                </div>
                <div>
                  <label style={lbl}>Club Name (Arabic) *</label>
                  <input value={draft.nameAr}
                    onChange={e => { const v = e.target.value; if (/[a-zA-Z]/.test(v)) return; setDraft(d => ({ ...d, nameAr: v })) }}
                    placeholder="الأهلي"
                    style={{ ...inp(errors.nameAr), fontFamily: 'var(--amiri)', fontSize: 16, direction: 'rtl' }}
                  />
                  {errors.nameAr && <div style={{ fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.nameAr}</div>}
                </div>
                <div>
                  <label style={lbl}>League *</label>
                  <CustomSelect
                    value={draft.leagueId}
                    onChange={v => {
                      const league = leagues.find(l => l.id === v)
                      setDraft(d => ({ ...d, leagueId: v, country: league?.country ?? d.country }))
                    }}
                    options={leagues.map(l => ({ value: l.id, label: `${l.name.en} (${countryName(l.country)})`, flag: FLAG(l.country) }))}
                    placeholder="Select league…"
                    error={errors.leagueId}
                  />
                  {errors.leagueId && <div style={{ fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.leagueId}</div>}
                </div>
                <div>
                  <label style={lbl}>Country</label>
                  <div style={{ ...inp(), display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t2)', height: 40 }}>
                    {draft.country && <img src={FLAG(draft.country)} alt={draft.country} style={{ borderRadius: 2, boxShadow: '0 0 0 1px var(--border)' }} />}
                    {countryName(draft.country)}
                    <span style={{ fontFamily: 'var(--onest)', fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>Auto from league</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 20px 24px', display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '11px', border: '1px solid var(--border2)', borderRadius: 6, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ flex: 2, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, padding: '11px', border: '1px solid #C8102E', borderRadius: 6, background: saving ? 'var(--t3)' : '#C8102E', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : editClub ? 'Save Changes' : 'Add Club'}
                </button>
              </div>
            </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteClub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '24px 16px' }} onClick={e => { if (e.target === e.currentTarget) setDeleteClub(null) }}>
          <div style={{ marginTop: 'auto', marginBottom: 'auto', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', width: '100%', maxWidth: 400, padding: 22, animation: 'modalIn .2s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>Delete {deleteClub.name.en}?</div>
            <div style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
              This will remove the club. Players currently assigned to this club will lose their club assignment.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteClub(null)} style={{ flex: 1, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '10px', border: '1px solid var(--border2)', borderRadius: 5, background: 'transparent', color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteConfirmed} style={{ flex: 1, fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, padding: '10px', border: '1px solid #C8102E', borderRadius: 5, background: '#C8102E', color: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* responsive helpers */}
      <style>{`
        @media (max-width: 639px) {
          .clubs-mobile-list  { display: block !important; }
          .clubs-desktop-table { display: none !important; }
        }
      `}</style>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left',
  fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700,
  letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)',
}