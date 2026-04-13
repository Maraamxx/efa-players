'use client'

import { useState, useEffect } from 'react'
import { CustomSelect } from '@/components/CustomSelect'
import { useRouter } from 'next/navigation'
import type { Role } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/apiFetch'
import { useModalLock } from '@/lib/useModalLock'
import { Pagination, usePagination } from '@/components/Pagination'

interface UserWithRole {
  id:        string
  nameEn:    string
  nameAr:    string
  email:     string
  roleId:    string
  isActive:  boolean
  createdAt: string
  role?:     Role
}

const BLANK_DRAFT = { nameEn: '', nameAr: '', email: '', password: '', roleId: '', isActive: true }

export default function UsersPage() {
  const router = useRouter()
  const { can, loading: authLoading } = useAuth()
  const [users,   setUsers]   = useState<UserWithRole[]>([])
  const [roles,   setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editUser,    setEditUser]    = useState<UserWithRole | null>(null)
  const [deleteUser,  setDeleteUser]  = useState<UserWithRole | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState({ ...BLANK_DRAFT })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')
  useModalLock(showForm || !!deleteUser)

  const load = () => {
    Promise.all([
      apiFetch('/api/users').then(r => r.json()),
      apiFetch('/api/roles').then(r => r.json()),
    ]).then(([u, r]) => { setUsers(u); setRoles(r); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    if (search && !u.nameEn.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.roleId !== filterRole) return false
    if (filterActive === 'true' && !u.isActive) return false
    if (filterActive === 'false' && u.isActive) return false
    return true
  })
  const pg = usePagination(filtered, 15)
  const hasFilters = !!search || !!filterRole || !!filterActive
  useEffect(() => { if (!authLoading && !can('users', 'view')) router.replace('/players') }, [authLoading])

  const openCreate = () => {
    setDraft({ ...BLANK_DRAFT })
    setEditUser(null); setErrors({}); setShowForm(true)
  }
  const openEdit = (u: UserWithRole) => {
    setDraft({ nameEn: u.nameEn, nameAr: u.nameAr, email: u.email, password: '', roleId: u.roleId, isActive: u.isActive })
    setEditUser(u); setErrors({}); setShowForm(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.nameEn.trim()) e.nameEn = 'Required'
    if (!draft.nameAr.trim()) e.nameAr = 'Required'
    if (!draft.email.trim())  e.email  = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) e.email = 'Enter a valid email address'
    if (!draft.roleId)        e.roleId = 'Required'
    if (!editUser && !draft.password.trim()) e.password = 'Required for new users'
    if (draft.password && draft.password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      nameEn: draft.nameEn.trim(),
      nameAr: draft.nameAr.trim(),
      email:  draft.email.trim(),
      roleId: draft.roleId,
      isActive: draft.isActive,
    }
    if (draft.password.trim()) payload.password = draft.password.trim()
    if (editUser) {
      await apiFetch(`/api/users/${editUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    } else {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); load()
  }

  const deleteConfirmed = async () => {
    if (!deleteUser) return
    await apiFetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
    setDeleteUser(null); load()
  }

  const inp = (err?: string): React.CSSProperties => ({
    width: '100%', height: 36, border: `1px solid ${err ? '#C8102E' : 'var(--border2)'}`,
    borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)',
    fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none',
  })

  if (!can('users', 'view')) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (max-width: 639px) {
          .users-mobile-list   { display: block !important; }
          .users-desktop-table { display: none  !important; }
          .users-header        { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
      `}</style>
      <AppNav />

      {/* HEADER */}
      <div className="users-header" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 4 }}>Administration</div>
          <h1 style={{ fontFamily: 'var(--onest)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1, margin: 0 }}>Users</h1>
          <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4, marginBottom: 0 }}>
            {users.length} system user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        {can('users', 'create') && (
          <button onClick={openCreate} style={{ height: 36, padding: '0 16px', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add User
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div style={{ padding: '12px 24px', maxWidth: 900, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ flex: '1 1 180px', height: 36, border: '1px solid var(--border2)', borderRadius: 5, background: 'var(--bg)', fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t1)', padding: '0 10px', outline: 'none' }} />
        <div style={{ flex: '0 1 160px' }}>
          <CustomSelect value={filterRole} onChange={setFilterRole} searchable={false}
            options={[{ value: '', label: 'All Roles' }, ...roles.map(r => ({ value: r.id, label: r.name }))]} />
        </div>
        <div style={{ flex: '0 1 130px' }}>
          <CustomSelect value={filterActive} onChange={v => setFilterActive(v as any)} searchable={false}
            options={[{ value: '', label: 'All Status' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterRole(''); setFilterActive('') }}
            style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 5, background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}>
            Clear
          </button>
        )}
        <span style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ padding: '0 24px 24px', maxWidth: 900, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="users-desktop-table" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 180px 120px 80px 80px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
              {['', 'Name', 'Email', 'Role', 'Status', ''].map((h, i) => (
                <div key={i} style={{ padding: '8px 0', fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>{h}</div>
              ))}
            </div>
            {users.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)' }}>No users found.</div>
            ) : pg.paginated.map(u => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 180px 120px 80px 80px', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ padding: '10px 0' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    {u.nameEn.charAt(0)}
                  </div>
                </div>
                <div style={{ padding: '10px 8px 10px 0' }}>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.nameEn}</div>
                  <div style={{ fontFamily: 'var(--arabic)', fontSize: 12, color: 'var(--t3)', direction: 'rtl', textAlign: 'right' }}>{u.nameAr}</div>
                </div>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
                <div>
                  <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--t2)' }}>
                    {u.role?.name ?? u.roleId}
                  </span>
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: u.isActive ? 'rgba(22,163,74,.08)' : 'rgba(200,16,46,.08)', border: `1px solid ${u.isActive ? 'rgba(22,163,74,.2)' : 'rgba(200,16,46,.2)'}`, color: u.isActive ? '#16A34A' : '#C8102E' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {can('users', 'edit') && (
                    <button onClick={() => openEdit(u)} style={{ height: 28, padding: '0 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t2)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >Edit</button>
                  )}
                  {can('users', 'delete') && (
                    <button onClick={() => setDeleteUser(u)} style={{ height: 28, padding: '0 10px', background: 'transparent', border: '1px solid rgba(200,16,46,.2)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,16,46,.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >Del</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile card list */}
          <div className="users-mobile-list" style={{ display: 'none' }}>
            {users.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>No users found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pg.paginated.map(u => (
                  <div key={u.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {u.nameEn.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--onest)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{u.nameEn}</div>
                        {u.nameAr && <div style={{ fontFamily: 'var(--arabic)', fontSize: 13, color: 'var(--t3)', direction: 'rtl' as const }}>{u.nameAr}</div>}
                      </div>
                      <span style={{ fontFamily: 'var(--onest)', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: u.isActive ? 'rgba(22,163,74,.08)' : 'rgba(200,16,46,.08)', border: `1px solid ${u.isActive ? 'rgba(22,163,74,.2)' : 'rgba(200,16,46,.2)'}`, color: u.isActive ? '#16A34A' : '#C8102E', flexShrink: 0 }}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--t2)' }}>
                        {u.role?.name ?? u.roleId}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {can('users', 'edit') && (
                          <button onClick={() => openEdit(u)} style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t2)', cursor: 'pointer' }}>Edit</button>
                        )}
                        {can('users', 'delete') && (
                          <button onClick={() => setDeleteUser(u)} style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid rgba(200,16,46,.2)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', cursor: 'pointer' }}>Del</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Pagination page={pg.page} totalPages={pg.totalPages} onPageChange={pg.setPage} />
          </>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '24px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ marginTop: 'auto', marginBottom: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 460, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editUser ? 'Edit User' : 'Add User'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name EN */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Name (EN)</label>
                <input value={draft.nameEn} onChange={e => {
                  const v = e.target.value
                  if (/[\u0600-\u06FF]/.test(v)) return
                  setDraft(d => ({ ...d, nameEn: v }))
                }} style={inp(errors.nameEn)} placeholder="Full name in English" />
                {errors.nameEn && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.nameEn}</div>}
              </div>
              {/* Name AR */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Name (AR) <span style={{ color: '#C8102E' }}>*</span></label>
                <input value={draft.nameAr} onChange={e => {
                  const v = e.target.value
                  if (/[a-zA-Z]/.test(v)) return
                  setDraft(d => ({ ...d, nameAr: v }))
                }} style={{ ...inp(errors.nameAr), fontFamily: 'var(--arabic)', fontSize: 15, direction: 'rtl' as const }} placeholder="الاسم بالعربية" />
                {errors.nameAr && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.nameAr}</div>}
              </div>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Email <span style={{ color: '#C8102E' }}>*</span></label>
                <input type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} style={inp(errors.email)} placeholder="user@efa.eg" />
                {errors.email && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.email}</div>}
              </div>
              {/* Password */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Password {editUser && <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(leave blank to keep current)</span>}</label>
                <input type="password" value={draft.password} onChange={e => setDraft(d => ({ ...d, password: e.target.value }))} style={inp(errors.password)} placeholder={editUser ? '••••••••' : 'Set password'} />
                {errors.password && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.password}</div>}
              </div>
              {/* Role */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Role</label>
                <CustomSelect
                  value={draft.roleId}
                  onChange={v => setDraft(d => ({ ...d, roleId: v }))}
                  options={roles.map(r => ({ value: r.id, label: r.name }))}
                  placeholder="Select role…"
                  error={errors.roleId}
                  searchable={false}
                />
                {errors.roleId && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.roleId}</div>}
              </div>
              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isActive" checked={draft.isActive} onChange={e => setDraft(d => ({ ...d, isActive: e.target.checked }))} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#C8102E' }} />
                <label htmlFor="isActive" style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t1)', cursor: 'pointer' }}>Active</label>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ height: 34, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ height: 34, padding: '0 20px', background: '#C8102E', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '24px 16px' }} onClick={e => { if (e.target === e.currentTarget) setDeleteUser(null) }}>
          <div style={{ marginTop: 'auto', marginBottom: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 380, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Delete User</div>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', margin: 0 }}>
                Are you sure you want to delete <strong>{deleteUser.nameEn}</strong>? This cannot be undone.
              </p>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteUser(null)} style={{ height: 34, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteConfirmed} style={{ height: 34, padding: '0 16px', background: '#C8102E', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
