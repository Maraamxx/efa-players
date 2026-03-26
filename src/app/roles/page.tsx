'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Role, PermissionAction, PermissionResource } from '@/types/domain'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/apiFetch'
import { useModalLock } from '@/lib/useModalLock'

// Resources and which actions apply to each
const RESOURCE_ACTIONS: Record<PermissionResource, PermissionAction[]> = {
  players: ['view', 'create', 'edit', 'delete'],
  matches: ['view', 'create', 'edit', 'delete'],
  media:   ['view', 'upload', 'delete'],
  fields:  ['view', 'create', 'edit', 'delete'],
  clubs:   ['view', 'create', 'edit', 'delete'],
  leagues: ['view', 'create', 'edit', 'delete'],
  users:   ['view', 'create', 'edit', 'delete'],
  audit:   ['view'],
  roles:   ['view', 'create', 'edit', 'delete'],
}

const ALL_RESOURCES = Object.keys(RESOURCE_ACTIONS) as PermissionResource[]
const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'upload']

function hasAction(role: Role, resource: PermissionResource, action: PermissionAction): boolean {
  return role.permissions.find(p => p.resource === resource)?.actions.includes(action) ?? false
}

// ── Permission Matrix (read-only display) ─────────────────────────────────────

function PermMatrix({ role }: { role: Role }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(70px, 100px) repeat(5, 1fr)', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* header */}
        <div style={{ background: 'var(--bg3)', padding: '5px 8px', fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: 'var(--t3)', textTransform: 'uppercase' as const, borderRight: '1px solid var(--border)' }}>Resource</div>
        {ALL_ACTIONS.map(a => (
          <div key={a} style={{ background: 'var(--bg3)', padding: '5px 0', fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--t3)', textTransform: 'uppercase' as const, textAlign: 'center' as const, borderRight: '1px solid var(--border)' }}>{a}</div>
        ))}
        {/* rows */}
        {ALL_RESOURCES.map((res, ri) => {
          const validActions = RESOURCE_ACTIONS[res]
          return [
            <div key={`${res}-label`} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg2)', padding: '5px 8px', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t2)', fontWeight: 500, borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>{res}</div>,
            ...ALL_ACTIONS.map(act => {
              const valid = validActions.includes(act)
              const granted = valid && hasAction(role, res, act)
              return (
                <div key={`${res}-${act}`} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                  {valid ? (
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: granted ? '#C8102E' : 'var(--bg3)', border: `1px solid ${granted ? '#C8102E' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {granted && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>
                  ) : (
                    <div style={{ width: 14, height: 14 }} />
                  )}
                </div>
              )
            }),
          ]
        })}
      </div>
    </div>
  )
}

// ── Editable Permission Matrix ─────────────────────────────────────────────────

function EditablePermMatrix({
  permissions,
  onChange,
}: {
  permissions: Role['permissions']
  onChange: (p: Role['permissions']) => void
}) {
  const toggle = (resource: PermissionResource, action: PermissionAction) => {
    const existing = permissions.find(p => p.resource === resource)
    const currentActions = existing?.actions ?? []
    let newActions: PermissionAction[]

    if (action === 'view') {
      // toggling view off clears all; toggling on adds view
      if (currentActions.includes('view')) {
        newActions = []
      } else {
        newActions = ['view']
      }
    } else {
      if (currentActions.includes(action)) {
        newActions = currentActions.filter(a => a !== action)
      } else {
        // auto-add 'view' if not present
        newActions = [...currentActions.filter(a => a !== action), action]
        if (!newActions.includes('view')) newActions = ['view', ...newActions]
      }
    }

    const filtered = permissions.filter(p => p.resource !== resource)
    if (newActions.length > 0) {
      onChange([...filtered, { resource, actions: newActions }])
    } else {
      onChange(filtered)
    }
  }

  const has = (resource: PermissionResource, action: PermissionAction) =>
    permissions.find(p => p.resource === resource)?.actions.includes(action) ?? false

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(70px, 100px) repeat(5, 1fr)', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--bg3)', padding: '5px 8px', fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: 'var(--t3)', textTransform: 'uppercase' as const, borderRight: '1px solid var(--border)' }}>Resource</div>
        {ALL_ACTIONS.map(a => (
          <div key={a} style={{ background: 'var(--bg3)', padding: '5px 0', fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--t3)', textTransform: 'uppercase' as const, textAlign: 'center' as const, borderRight: '1px solid var(--border)' }}>{a}</div>
        ))}
        {ALL_RESOURCES.map((res, ri) => {
          const validActions = RESOURCE_ACTIONS[res]
          return [
            <div key={`${res}-label`} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg2)', padding: '5px 8px', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t2)', fontWeight: 500, borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>{res}</div>,
            ...ALL_ACTIONS.map(act => {
              const valid = validActions.includes(act)
              const checked = valid && has(res, act)
              return (
                <div key={`${res}-${act}`} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)', cursor: valid ? 'pointer' : 'default' }}
                  onClick={() => valid && toggle(res, act)}
                >
                  {valid ? (
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: checked ? '#C8102E' : 'var(--bg3)', border: `1px solid ${checked ? '#C8102E' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .1s' }}>
                      {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>
                  ) : (
                    <div style={{ width: 14, height: 14 }} />
                  )}
                </div>
              )
            }),
          ]
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const BLANK_DRAFT = { name: '', description: '', permissions: [] as Role['permissions'] }

export default function RolesPage() {
  const router = useRouter()
  const { can, loading: authLoading } = useAuth()
  const [roles,   setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editRole,   setEditRole]   = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState({ ...BLANK_DRAFT })
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  const load = () => {
    fetch('/api/roles').then(r => r.json()).then(d => { setRoles(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!authLoading && !can('roles', 'view')) router.replace('/players') }, [authLoading])

  const openCreate = () => {
    setDraft({ ...BLANK_DRAFT, permissions: [] })
    setEditRole(null); setErrors({}); setShowForm(true)
  }
  const openEdit = (r: Role) => {
    setDraft({ name: r.name, description: r.description, permissions: JSON.parse(JSON.stringify(r.permissions)) })
    setEditRole(r); setErrors({}); setShowForm(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.name.trim()) e.name = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = { name: draft.name.trim(), description: draft.description.trim(), permissions: draft.permissions }
    if (editRole) {
      await apiFetch(`/api/roles/${editRole.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    } else {
      await apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); load()
  }

  const deleteConfirmed = async () => {
    if (!deleteRole) return
    await apiFetch(`/api/roles/${deleteRole.id}`, { method: 'DELETE' })
    setDeleteRole(null); load()
  }

  const inp = (err?: string): React.CSSProperties => ({
    width: '100%', height: 36, border: `1px solid ${err ? '#C8102E' : 'var(--border2)'}`,
    borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--onest)',
    fontSize: 13, color: 'var(--t1)', padding: '0 10px', outline: 'none',
  })

  if (!can('roles', 'view')) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (max-width: 639px) {
          .roles-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
          .roles-content { padding: 12px !important; }
          .roles-card-header { padding: 12px !important; }
          .roles-card-matrix { padding: 10px !important; }
          .roles-card-actions { margin-left: 0 !important; }
        }
      `}</style>
      <AppNav />

      {/* HEADER */}
      <div className="roles-header" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 4 }}>Administration</div>
          <h1 style={{ fontFamily: 'var(--onest)', fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', lineHeight: 1, margin: 0 }}>Roles & Permissions</h1>
          <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t3)', marginTop: 4, marginBottom: 0 }}>
            {roles.length} role{roles.length !== 1 ? 's' : ''}
          </p>
        </div>
        {can('roles', 'create') && (
          <button onClick={openCreate} style={{ height: 36, padding: '0 16px', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add Role
          </button>
        )}
      </div>

      <div className="roles-content" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {roles.map(role => (
              <div key={role.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {/* card header */}
                <div className="roles-card-header" style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--onest)', fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{role.name}</span>
                      {role.isSystem && (
                        <span style={{ fontFamily: 'var(--onest)', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', padding: '2px 7px', borderRadius: 3, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', color: '#2563EB', textTransform: 'uppercase' as const }}>System</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)' }}>{role.description}</div>
                  </div>
                  <div className="roles-card-actions" style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                    {can('roles', 'edit') && (
                      <button onClick={() => openEdit(role)} style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t2)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >Edit</button>
                    )}
                    {can('roles', 'delete') && !role.isSystem && (
                      <button onClick={() => setDeleteRole(role)} style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid rgba(200,16,46,.2)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,16,46,.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >Delete</button>
                    )}
                    {can('roles', 'delete') && role.isSystem && (
                      <button disabled title="System roles cannot be deleted" style={{ height: 28, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t4)', cursor: 'not-allowed' }}>Delete</button>
                    )}
                  </div>
                </div>
                {/* permission matrix */}
                <div className="roles-card-matrix" style={{ padding: '14px 18px' }}>
                  <PermMatrix role={role} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', minHeight: '100%', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', width: '100%', maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editRole ? 'Edit Role' : 'Create Role'}</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Role Name</label>
                  <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inp(errors.name)} placeholder="e.g. Content Manager" />
                  {errors.name && <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: '#C8102E', marginTop: 3 }}>{errors.name}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Description</label>
                  <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} style={inp()} placeholder="Brief description of this role" />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--t3)', marginBottom: 5 }}>Permissions</label>
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
                    Click a cell to toggle. Enabling any action auto-grants View. Disabling View removes all actions for that resource.
                  </div>
                  <EditablePermMatrix
                    permissions={draft.permissions}
                    onChange={p => setDraft(d => ({ ...d, permissions: p }))}
                  />
                </div>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--bg)' }}>
                <button onClick={() => setShowForm(false)} style={{ height: 34, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ height: 34, padding: '0 20px', background: '#C8102E', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
                  {saving ? 'Saving…' : editRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteRole && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 50, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }} onClick={e => { if (e.target === e.currentTarget) setDeleteRole(null) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', minHeight: '100%', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--onest)', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Delete Role</div>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', margin: 0 }}>
                Are you sure you want to delete the role <strong>{deleteRole.name}</strong>? Users assigned this role will lose their permissions.
              </p>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteRole(null)} style={{ height: 34, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, color: 'var(--t2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteConfirmed} style={{ height: 34, padding: '0 16px', background: '#C8102E', border: 'none', borderRadius: 'var(--r)', fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
