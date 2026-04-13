'use client'

import { getStore, saveStore } from './clientStore'

function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
function notFound() { return res({ message: 'Not found' }, 404) }

function getUser(headers?: HeadersInit) {
  const h = new Headers(headers)
  return { id: h.get('x-user-id') ?? 'user-1', name: h.get('x-user-name') ?? 'System Admin' }
}

function audit(
  store: ReturnType<typeof getStore>,
  action: string, entityType: string, entityId: string, entityLabel: string,
  user: { id: string; name: string },
  before: any, after: any,
) {
  const changed: string[] = []
  if (before && after) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    keys.forEach(k => { if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k) })
  }
  store.auditLog = [{
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action, entityType, entityId, entityLabel,
    userId: user.id, userName: user.name,
    diff: { before, after, changed },
    timestamp: new Date().toISOString(),
    ipAddress: 'client',
  }, ...store.auditLog].slice(0, 1000)
}

export async function clientFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const u = new URL(url, 'http://localhost')
  const path = u.pathname.replace(/^\/api\//, '').split('/').filter(Boolean)
  const route = '/' + path.join('/')
  const method = (options.method ?? 'GET').toUpperCase()
  const store = getStore()
  const user = getUser(options.headers)

  // ── GET ──
  if (method === 'GET') {
    if (route === '/clubs') return res(store.clubs)
    if (route === '/leagues') return res(store.leagues)

    if (path[0] === 'clubs' && path.length === 2) {
      const c = store.clubs.find(c => c.id === path[1])
      return c ? res(c) : notFound()
    }
    if (path[0] === 'leagues' && path.length === 2) {
      const l = store.leagues.find(l => l.id === path[1])
      return l ? res(l) : notFound()
    }

    if (route === '/players') {
      const page     = Number(u.searchParams.get('page') ?? 1)
      const pageSize = Number(u.searchParams.get('pageSize') ?? 20)
      const search   = (u.searchParams.get('search') ?? '').toLowerCase()
      const position = u.searchParams.get('position') ?? ''
      const status   = u.searchParams.get('status') ?? ''
      const clubId   = u.searchParams.get('clubId') ?? ''
      let filtered = store.players.filter(p => {
        if (search && !p.name.en.toLowerCase().includes(search) && !p.name.ar.includes(search)) return false
        if (position && !(p.positions ?? [(p as any).position]).includes(position as any)) return false
        if (status && p.status !== status) return false
        if (clubId && p.currentClubId !== clubId) return false
        return true
      })
      const total = filtered.length
      const data = filtered.slice((page - 1) * pageSize, page * pageSize)
      return res({ data, total, page, pageSize })
    }

    if (path[0] === 'players' && path.length === 2) {
      const p = store.players.find(p => p.id === path[1])
      return p ? res(p) : notFound()
    }

    if (path[0] === 'players' && path[2] === 'matches') {
      const data = store.matches
        .filter(m => m.playerId === path[1])
        .sort((a, b) => b.matchDate.localeCompare(a.matchDate))
      return res({ data, total: data.length, page: 1, pageSize: data.length })
    }

    if (path[0] === 'players' && path[2] === 'analysis') {
      const pm = store.matches.filter(m => m.playerId === path[1])
      const pl = store.players.find(p => p.id === path[1]) as any
      const overrides = (pl?.analysisStats ?? {}) as Record<string, number>
      // Appearances are admin-entered, not computed from match count.
      const computed = {
        totalGoals: pm.reduce((s, m) => s + m.goalsScored, 0),
        totalAssists: pm.reduce((s, m) => s + m.assists, 0),
        totalMinutes: pm.reduce((s, m) => s + m.minutesPlayed, 0),
      }
      return res({
        playerId: path[1],
        totalAppearances: overrides.totalAppearances ?? 0,
        ...computed, ...overrides, _computed: computed,
        dynamicFieldValues: (pl?.analysisFieldValues as any[]) ?? [], videos: [],
      })
    }

    if (route === '/field-schemas') {
      const target = u.searchParams.get('target')
      const data = target ? store.schemas.filter(s => s.entityTarget === target) : store.schemas
      return res(data.sort((a, b) => a.sortOrder - b.sortOrder))
    }

    if (route === '/media') {
      const entityType = u.searchParams.get('entityType')
      const entityId = u.searchParams.get('entityId')
      let data = store.media
      if (entityType) data = data.filter(m => m.entityType === entityType)
      if (entityId) data = data.filter(m => m.entityId === entityId)
      return res(data)
    }

    if (route === '/audit') {
      const entityType = u.searchParams.get('entityType')
      const action = u.searchParams.get('action')
      const userId = u.searchParams.get('userId')
      const limit = Number(u.searchParams.get('limit') ?? 100)
      let data = store.auditLog
      if (entityType) data = data.filter((e: any) => e.entityType === entityType)
      if (action) data = data.filter((e: any) => e.action === action)
      if (userId) data = data.filter((e: any) => e.userId === userId)
      return res(data.slice(0, limit))
    }

    if (route === '/auth/me') {
      const userId = u.searchParams.get('userId')
      const usr = store.users.find(u => u.id === userId)
      if (!usr) return res({ error: 'Not found' }, 401)
      const role = store.roles.find(r => r.id === usr.roleId)
      const { password: _, ...safe } = usr
      return res({ ...safe, role })
    }

    if (route === '/roles') return res(store.roles)
    if (path[0] === 'roles' && path.length === 2) {
      const r = store.roles.find(r => r.id === path[1])
      return r ? res(r) : notFound()
    }

    if (route === '/users') {
      return res(store.users.map(u => {
        const { password: _, ...safe } = u
        return { ...safe, role: store.roles.find(r => r.id === u.roleId) }
      }))
    }

    return notFound()
  }

  // ── POST ──
  if (method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {}

    if (route === '/players') {
      const p = { ...body, id: `player-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      store.players = [p, ...store.players]
      audit(store, 'CREATE', 'player', p.id, p.name?.en ?? 'Player', user, null, p)
      saveStore(); return res(p, 201)
    }

    if (path[0] === 'players' && path[2] === 'matches') {
      const m = { ...body, id: `match-${Date.now()}`, playerId: path[1], videos: [], createdAt: new Date().toISOString() }
      store.matches = [m, ...store.matches]
      const pl = store.players.find(p => p.id === path[1])
      audit(store, 'CREATE', 'match', m.id, `${pl?.name?.en ?? 'Player'} — ${m.matchName ?? m.matchDate}`, user, null, m)
      saveStore(); return res(m, 201)
    }

    if (route === '/clubs') {
      const c = { ...body, id: `club-${Date.now()}` }
      store.clubs = [...store.clubs, c]
      audit(store, 'CREATE', 'club', c.id, c.name?.en ?? 'Club', user, null, c)
      saveStore(); return res(c, 201)
    }

    if (route === '/leagues') {
      const l = { ...body, id: `league-${Date.now()}` }
      store.leagues = [...store.leagues, l]
      audit(store, 'CREATE', 'league', l.id, l.name?.en ?? 'League', user, null, l)
      saveStore(); return res(l, 201)
    }

    if (route === '/field-schemas') {
      const s = { ...body, id: `fs-${Date.now()}`, createdAt: new Date().toISOString() }
      store.schemas = [...store.schemas, s]
      audit(store, 'CREATE', 'field_schema', s.id, s.label?.en ?? 'Field', user, null, s)
      saveStore(); return res(s, 201)
    }

    if (route === '/field-schemas/reorder') {
      const { ids } = body as { ids: string[] }
      ids.forEach((id, index) => {
        store.schemas = store.schemas.map(s => s.id === id ? { ...s, sortOrder: index } : s)
      })
      saveStore(); return res({ success: true })
    }

    if (route === '/media') {
      const asset = { ...body, id: `media-${Date.now()}`, uploadedAt: new Date().toISOString(), notes: [] }
      store.media = [...store.media, asset]
      audit(store, 'CREATE', 'media', asset.id, asset.originalFilename ?? 'Media', user, null, { id: asset.id, filename: asset.originalFilename })
      saveStore(); return res(asset, 201)
    }

    if (path[0] === 'media' && path[2] === 'notes') {
      const note = { ...body, id: `note-${Date.now()}`, assetId: path[1], createdAt: new Date().toISOString() }
      store.media = store.media.map(m => m.id === path[1] ? { ...m, notes: [...m.notes, note] } : m)
      saveStore(); return res(note, 201)
    }

    if (route === '/auth/login') {
      const { email, password } = body
      const found = store.users.find(u => u.email === email && u.password === password && u.isActive)
      if (!found) return res({ error: 'Invalid credentials' }, 401)
      const role = store.roles.find(r => r.id === found.roleId)
      const { password: _, ...safe } = found
      return res({ ...safe, role })
    }

    if (route === '/roles') {
      const r = { ...body, id: `role-${Date.now()}`, isSystem: false, createdAt: new Date().toISOString() }
      store.roles = [...store.roles, r]
      audit(store, 'CREATE', 'role', r.id, r.name, user, null, r)
      saveStore(); return res(r, 201)
    }

    if (route === '/users') {
      const u = { ...body, id: `user-${Date.now()}`, createdAt: new Date().toISOString() }
      store.users = [...store.users, u]
      const { password: _, ...safe } = u
      audit(store, 'CREATE', 'user', u.id, u.nameEn, user, null, safe)
      saveStore(); return res(safe, 201)
    }

    return notFound()
  }

  // ── PATCH ──
  if (method === 'PATCH') {
    const body = options.body ? JSON.parse(options.body as string) : {}

    if (path[0] === 'players' && path.length === 2) {
      const before = store.players.find(p => p.id === path[1])
      const extraFields: Record<string, unknown> = {}
      if (before && body.currentClubId !== undefined && body.currentClubId !== before.currentClubId && before.currentClubId) {
        const today = new Date().toISOString().slice(0, 10)
        const existing = ((before as any).clubHistory ?? []) as any[]
        const prevClub = store.clubs.find(c => c.id === before.currentClubId)
        const newClub = store.clubs.find(c => c.id === body.currentClubId)
        extraFields.clubHistory = [
          { clubId: body.currentClubId, clubName: newClub?.name?.en ?? body.currentClubId, from: today, to: null, isCurrent: true },
          { clubId: before.currentClubId, clubName: prevClub?.name?.en ?? before.currentClubId, from: existing[0]?.to ?? today, to: today, isCurrent: false },
          ...existing.map((h: any) => ({ ...h, isCurrent: false })),
        ]
      }
      store.players = store.players.map(p => p.id === path[1] ? { ...p, ...body, ...extraFields, updatedAt: new Date().toISOString() } : p)
      const after = store.players.find(p => p.id === path[1])
      if (before && after) audit(store, 'UPDATE', 'player', path[1], after.name?.en ?? 'Player', user, null, null)
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'field-schemas' && path.length === 2) {
      store.schemas = store.schemas.map(s => s.id === path[1] ? { ...s, ...body } : s)
      const after = store.schemas.find(s => s.id === path[1])
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'players' && path[2] === 'matches' && path[3]) {
      store.matches = store.matches.map(m => m.id === path[3] ? { ...m, ...body, updatedAt: new Date().toISOString() } : m)
      const after = store.matches.find(m => m.id === path[3])
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'media' && path[2] === 'notes' && path[3]) {
      const asset = store.media.find(m => m.id === path[1])
      const existing = asset?.notes.find(n => n.id === path[3])
      if (!existing) return notFound()
      if (existing.authorName !== user.name) {
        return res({ error: 'You can only edit your own notes' }, 403)
      }
      const updated = { ...existing, text: typeof body.text === 'string' ? body.text : existing.text }
      store.media = store.media.map(m =>
        m.id === path[1] ? { ...m, notes: m.notes.map(n => n.id === path[3] ? updated : n) } : m
      )
      saveStore(); return res(updated)
    }

    if (path[0] === 'clubs' && path.length === 2) {
      store.clubs = store.clubs.map(c => c.id === path[1] ? { ...c, ...body } : c)
      const after = store.clubs.find(c => c.id === path[1])
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'leagues' && path.length === 2) {
      store.leagues = store.leagues.map(l => l.id === path[1] ? { ...l, ...body } : l)
      const after = store.leagues.find(l => l.id === path[1])
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'roles' && path.length === 2) {
      store.roles = store.roles.map(r => r.id === path[1] ? { ...r, ...body } : r)
      const after = store.roles.find(r => r.id === path[1])
      saveStore(); return after ? res(after) : notFound()
    }

    if (path[0] === 'users' && path.length === 2) {
      store.users = store.users.map(u => u.id === path[1] ? { ...u, ...body } : u)
      const after = store.users.find(u => u.id === path[1])
      if (!after) return notFound()
      const { password: _, ...safe } = after
      saveStore(); return res(safe)
    }

    if (path[0] === 'players' && path[2] === 'analysis') {
      // analysis stats patch — store overrides on the player record
      store.players = store.players.map(p =>
        p.id === path[1] ? { ...p, analysisStats: { ...((p as any).analysisStats ?? {}), ...body }, updatedAt: new Date().toISOString() } : p
      )
      saveStore()
      const pm = store.matches.filter(m => m.playerId === path[1])
      const pl = store.players.find(p => p.id === path[1]) as any
      const overrides = (pl?.analysisStats ?? {}) as Record<string, number>
      const computed = {
        totalGoals: pm.reduce((s, m) => s + m.goalsScored, 0),
        totalAssists: pm.reduce((s, m) => s + m.assists, 0),
        totalMinutes: pm.reduce((s, m) => s + m.minutesPlayed, 0),
      }
      return res({
        playerId: path[1],
        totalAppearances: overrides.totalAppearances ?? 0,
        ...computed, ...overrides, _computed: computed,
        dynamicFieldValues: (pl?.analysisFieldValues as any[]) ?? [], videos: [],
      })
    }

    return notFound()
  }

  // ── DELETE ──
  if (method === 'DELETE') {
    if (path[0] === 'players' && path.length === 2) {
      const target = store.players.find(p => p.id === path[1])
      store.players = store.players.filter(p => p.id !== path[1])
      if (target) audit(store, 'DELETE', 'player', path[1], target.name?.en ?? 'Player', user, null, null)
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'field-schemas' && path.length === 2) {
      store.schemas = store.schemas.filter(s => s.id !== path[1])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'media' && path.length === 2) {
      store.media = store.media.filter(m => m.id !== path[1])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'players' && path[2] === 'matches' && path[3]) {
      store.matches = store.matches.filter(m => m.id !== path[3])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'clubs' && path.length === 2) {
      store.clubs = store.clubs.filter(c => c.id !== path[1])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'leagues' && path.length === 2) {
      store.leagues = store.leagues.filter(l => l.id !== path[1])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'media' && path[2] === 'notes' && path[3]) {
      const asset = store.media.find(m => m.id === path[1])
      const existing = asset?.notes.find(n => n.id === path[3])
      if (existing && existing.authorName !== user.name) {
        return res({ error: 'You can only delete your own notes' }, 403)
      }
      store.media = store.media.map(m => m.id === path[1] ? { ...m, notes: m.notes.filter(n => n.id !== path[3]) } : m)
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'roles' && path.length === 2) {
      const target = store.roles.find(r => r.id === path[1])
      if (target?.isSystem) return res({ error: 'Cannot delete system role' }, 403)
      store.roles = store.roles.filter(r => r.id !== path[1])
      saveStore(); return res({ success: true })
    }

    if (path[0] === 'users' && path.length === 2) {
      store.users = store.users.filter(u => u.id !== path[1])
      saveStore(); return res({ success: true })
    }

    return notFound()
  }

  return notFound()
}
