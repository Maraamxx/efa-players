import { NextRequest, NextResponse } from 'next/server'
import { store, persistStore } from '@/lib/store'
import { writeAuditLog, sanitize } from '@/lib/audit'
import { getUserFromRequest } from '@/lib/userContext'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}
function notFound() {
  return NextResponse.json({ message: 'Not found' }, { status: 404 })
}
function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const url   = req.nextUrl
  const route = '/' + path.join('/')

  if (route === '/clubs')   return json(store.clubs)
  if (route === '/leagues') return json(store.leagues)

  if (path[0] === 'clubs' && path.length === 2) {
    const c = store.clubs.find(c => c.id === path[1])
    return c ? json(c) : notFound()
  }
  if (path[0] === 'leagues' && path.length === 2) {
    const l = store.leagues.find(l => l.id === path[1])
    return l ? json(l) : notFound()
  }

  if (route === '/players') {
    const page     = Number(url.searchParams.get('page')     ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
    const search   = url.searchParams.get('search')?.toLowerCase() ?? ''
    const position = url.searchParams.get('position') ?? ''
    const status   = url.searchParams.get('status')   ?? ''
    const clubId   = url.searchParams.get('clubId')   ?? ''

    let filtered = store.players.filter(p => {
      if (search   && !p.name.en.toLowerCase().includes(search) && !p.name.ar.includes(search)) return false
      if (position && !(p.positions ?? [(p as any).position]).includes(position as any)) return false
      if (status   && p.status      !== status)   return false
      if (clubId   && p.currentClubId !== clubId) return false
      return true
    })
    const total = filtered.length
    const data  = filtered.slice((page - 1) * pageSize, page * pageSize)
    return json({ data, total, page, pageSize })
  }

  if (path[0] === 'players' && path.length === 2) {
    const p = store.players.find(p => p.id === path[1])
    return p ? json(p) : notFound()
  }

  if (path[0] === 'players' && path[2] === 'matches') {
    const data = store.matches
      .filter(m => m.playerId === path[1])
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate))
    return json({ data, total: data.length, page: 1, pageSize: data.length })
  }

  if (path[0] === 'players' && path[2] === 'analysis') {
    const pm = store.matches.filter(m => m.playerId === path[1])
    const pl = store.players.find(p => p.id === path[1]) as unknown as Record<string, unknown> | undefined
    const overrides = (pl?.analysisStats ?? {}) as Record<string, number>
    const computed = {
      totalAppearances: pm.length,
      totalGoals:       pm.reduce((s, m) => s + m.goalsScored, 0),
      totalAssists:     pm.reduce((s, m) => s + m.assists, 0),
      totalMinutes:     pm.reduce((s, m) => s + m.minutesPlayed, 0),
    }
    return json({
      playerId:         path[1],
      ...computed,
      ...overrides,
      _computed: computed,
      dynamicFieldValues: (pl?.analysisFieldValues as unknown[]) ?? [],
      videos: [],
    })
  }

  if (route === '/field-schemas') {
    const target = url.searchParams.get('target')
    const data   = target
      ? store.schemas.filter(s => s.entityTarget === target)
      : store.schemas
    return json(data.sort((a, b) => a.sortOrder - b.sortOrder))
  }

  if (route === '/media') {
    const entityType = url.searchParams.get('entityType')
    const entityId   = url.searchParams.get('entityId')
    let data = store.media
    if (entityType) data = data.filter(m => m.entityType === entityType)
    if (entityId)   data = data.filter(m => m.entityId   === entityId)
    return json(data)
  }

  if (route === '/audit') {
    const entityType = url.searchParams.get('entityType')
    const action     = url.searchParams.get('action')
    const userId     = url.searchParams.get('userId')
    const limit      = Number(url.searchParams.get('limit') ?? 100)
    let data = store.auditLog
    if (entityType) data = data.filter(e => e.entityType === entityType)
    if (action)     data = data.filter(e => e.action     === action)
    if (userId)     data = data.filter(e => e.userId     === userId)
    return json(data.slice(0, limit))
  }

  // GET /api/auth/me?userId=xxx
  if (route === '/auth/me') {
    const userId = url.searchParams.get('userId')
    const user   = store.users.find(u => u.id === userId)
    if (!user) return json({ error: 'Not found' }, 401)
    const role = store.roles.find(r => r.id === user.roleId)
    const { password: _, ...safeUser } = user
    return json({ ...safeUser, role })
  }

  // GET /api/roles
  if (route === '/roles') return json(store.roles)

  // GET /api/roles/:id
  if (path[0] === 'roles' && path.length === 2) {
    const r = store.roles.find(r => r.id === path[1])
    return r ? json(r) : notFound()
  }

  // GET /api/users
  if (route === '/users') {
    return json(store.users.map(u => {
      const { password: _, ...safe } = u
      return { ...safe, role: store.roles.find(r => r.id === u.roleId) }
    }))
  }

  return notFound()
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const res = await _POST(req, ctx)
  persistStore()
  return res
}

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const route = '/' + path.join('/')
  const body  = await req.json()
  const user  = getUserFromRequest(req)
  const ip    = getIp(req)

  if (route === '/players') {
    const newPlayer = {
      ...body,
      id:        `player-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.players = [newPlayer, ...store.players]
    writeAuditLog({
      action: 'CREATE', entityType: 'player',
      entityId: newPlayer.id,
      entityLabel: newPlayer.name?.en ?? 'Unknown player',
      user, before: null, after: sanitize(newPlayer), ip,
    })
    return json(newPlayer, 201)
  }

  if (path[0] === 'players' && path[2] === 'matches') {
    const player = store.players.find(p => p.id === path[1])
    const newMatch = {
      ...body,
      id:        `match-${Date.now()}`,
      playerId:  path[1],
      videos:    [],
      createdAt: new Date().toISOString(),
    }
    store.matches = [newMatch, ...store.matches]
    writeAuditLog({
      action: 'CREATE', entityType: 'match',
      entityId: newMatch.id,
      entityLabel: `${player?.name?.en ?? 'Unknown'} — ${newMatch.matchName ?? newMatch.matchDate}`,
      user, before: null, after: sanitize(newMatch), ip,
    })
    return json(newMatch, 201)
  }

  if (route === '/clubs') {
    const club = { ...body, id: `club-${Date.now()}` }
    store.clubs = [...store.clubs, club]
    writeAuditLog({ action: 'CREATE', entityType: 'club', entityId: club.id, entityLabel: club.name?.en ?? 'Club', user, before: null, after: club, ip })
    return json(club, 201)
  }

  if (route === '/leagues') {
    const league = { ...body, id: `league-${Date.now()}` }
    store.leagues = [...store.leagues, league]
    writeAuditLog({ action: 'CREATE', entityType: 'league', entityId: league.id, entityLabel: league.name?.en ?? 'League', user, before: null, after: league, ip })
    return json(league, 201)
  }

  if (route === '/field-schemas') {
    const schema = {
      ...body,
      id:        `fs-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    store.schemas = [...store.schemas, schema]
    writeAuditLog({
      action: 'CREATE', entityType: 'field_schema',
      entityId: schema.id,
      entityLabel: schema.label?.en ?? 'Unknown field',
      user, before: null, after: schema, ip,
    })
    return json(schema, 201)
  }

  if (route === '/field-schemas/reorder') {
    const { ids } = body as { ids: string[] }
    ids.forEach((id, index) => {
      store.schemas = store.schemas.map(s => s.id === id ? { ...s, sortOrder: index } : s)
    })
    return json({ success: true })
  }

  if (route === '/media') {
    const asset = {
      ...body,
      id:         `media-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      notes:      [],
    }
    store.media = [...store.media, asset]
    writeAuditLog({
      action: 'CREATE', entityType: 'media',
      entityId: asset.id,
      entityLabel: `${asset.originalFilename} — ${mediaContext(asset)}`,
      user, before: null,
      after: { id: asset.id, filename: asset.originalFilename, entityType: asset.entityType, entityId: asset.entityId },
      ip,
    })
    return json(asset, 201)
  }

  if (path[0] === 'media' && path[2] === 'notes') {
    const asset = store.media.find(m => m.id === path[1])
    const note = {
      ...body,
      id:        `note-${Date.now()}`,
      assetId:   path[1],
      createdAt: new Date().toISOString(),
    }
    store.media = store.media.map(m =>
      m.id === path[1] ? { ...m, notes: [...m.notes, note] } : m
    )
    const updated = store.media.find(m => m.id === path[1])
    writeAuditLog({
      action: 'CREATE', entityType: 'video_note',
      entityId: note.id,
      entityLabel: asset
        ? `Note at ${fmt(note.timestamp)} · "${asset.originalFilename}" · ${mediaContext(asset)}`
        : `Note at ${fmt(note.timestamp)}`,
      user, before: null, after: note, ip,
    })
    return updated ? json(note, 201) : notFound()
  }

  // POST /api/auth/login
  if (route === '/auth/login') {
    const { email, password } = body
    const foundUser = store.users.find(u => u.email === email && u.password === password && u.isActive)
    if (!foundUser) return json({ error: 'Invalid credentials' }, 401)
    const role = store.roles.find(r => r.id === foundUser.roleId)
    const { password: _, ...safeUser } = foundUser
    return json({ ...safeUser, role })
  }

  // POST /api/roles
  if (route === '/roles') {
    const role = { ...body, id: `role-${Date.now()}`, isSystem: false, createdAt: new Date().toISOString() }
    store.roles = [...store.roles, role]
    writeAuditLog({ action: 'CREATE', entityType: 'role', entityId: role.id, entityLabel: role.name, user, before: null, after: role, ip })
    return json(role, 201)
  }

  // POST /api/users
  if (route === '/users') {
    const newUser = { ...body, id: `user-${Date.now()}`, createdAt: new Date().toISOString() }
    store.users = [...store.users, newUser]
    const { password: _, ...safe } = newUser
    writeAuditLog({ action: 'CREATE', entityType: 'user', entityId: newUser.id, entityLabel: newUser.nameEn, user, before: null, after: safe, ip })
    return json(safe, 201)
  }

  return notFound()
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const res = await _PATCH(req, ctx)
  persistStore()
  return res
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const body = await req.json()
  const user = getUserFromRequest(req)
  const ip   = getIp(req)

  if (path[0] === 'players' && path.length === 2) {
    const before = store.players.find(p => p.id === path[1])

    // Auto-add club history entries when club changes
    const extraFields: Record<string, unknown> = {}
    if (
      before &&
      body.currentClubId !== undefined &&
      body.currentClubId !== before.currentClubId &&
      before.currentClubId
    ) {
      const today = new Date().toISOString().slice(0, 10)
      const existingHistory = ((before as unknown as Record<string, unknown[]>).clubHistory ?? []) as any[]

      // Close the previous club entry (end its "to" date)
      const prevClub = store.clubs.find(c => c.id === before.currentClubId)
      const prevEntry = {
        clubId:    before.currentClubId,
        clubName:  prevClub?.name?.en ?? before.currentClubId,
        from:      existingHistory.length > 0 ? (existingHistory[0]?.to ?? today) : today,
        to:        today,
        isCurrent: false,
      }

      // Add the new (current) club entry
      const newClub = store.clubs.find(c => c.id === body.currentClubId)
      const newEntry = {
        clubId:    body.currentClubId,
        clubName:  newClub?.name?.en ?? body.currentClubId,
        from:      today,
        to:        null,
        isCurrent: true,
      }

      // Remove any existing "isCurrent" flags from old entries
      const cleanedHistory = existingHistory.map((h: any) => ({ ...h, isCurrent: false }))

      extraFields.clubHistory = [newEntry, prevEntry, ...cleanedHistory]
    }

    store.players = store.players.map(p =>
      p.id === path[1]
        ? { ...p, ...body, ...extraFields, updatedAt: new Date().toISOString() }
        : p,
    )
    const after = store.players.find(p => p.id === path[1])
    if (before && after) {
      // Resolve club/league IDs to names in audit diff
      const resolveIds = (obj: Record<string, unknown>) => {
        const out = { ...obj }
        if (typeof out.currentClubId === 'string') {
          const club = store.clubs.find(c => c.id === out.currentClubId)
          if (club) out.currentClubId = club.name?.en ?? out.currentClubId
        }
        if (typeof out.currentLeagueId === 'string') {
          const league = store.leagues.find(l => l.id === out.currentLeagueId)
          if (league) out.currentLeagueId = league.name?.en ?? out.currentLeagueId
        }
        return out
      }
      writeAuditLog({
        action: 'UPDATE', entityType: 'player',
        entityId: path[1],
        entityLabel: after.name?.en ?? 'Unknown player',
        user,
        before: resolveIds(sanitize(before as unknown as Record<string, unknown>) ?? {}),
        after:  resolveIds(sanitize(after  as unknown as Record<string, unknown>) ?? {}),
        ip,
      })
    }
    return after ? json(after) : notFound()
  }

  if (path[0] === 'field-schemas' && path.length === 2) {
    const before = store.schemas.find(s => s.id === path[1])
    store.schemas = store.schemas.map(s =>
      s.id === path[1] ? { ...s, ...body } : s,
    )
    const after = store.schemas.find(s => s.id === path[1])
    if (before && after) {
      writeAuditLog({
        action: 'UPDATE', entityType: 'field_schema',
        entityId: path[1],
        entityLabel: after.label?.en ?? 'Unknown field',
        user,
        before: before as unknown as Record<string, unknown>,
        after:  after  as unknown as Record<string, unknown>,
        ip,
      })
    }
    return after ? json(after) : notFound()
  }

  if (path[0] === 'players' && path[2] === 'matches' && path[3]) {
    const before = store.matches.find(m => m.id === path[3])
    store.matches = store.matches.map(m =>
      m.id === path[3] ? { ...m, ...body, updatedAt: new Date().toISOString() } : m
    )
    const after = store.matches.find(m => m.id === path[3])
    if (before && after) {
      const player = store.players.find(p => p.id === path[1])
      writeAuditLog({
        action: 'UPDATE', entityType: 'match',
        entityId: path[3],
        entityLabel: `${player?.name?.en ?? 'Player'} — ${(after as any).matchName ?? (after as any).matchDate}`,
        user, before: sanitize(before as unknown as Record<string, unknown>), after: sanitize(after as unknown as Record<string, unknown>), ip,
      })
    }
    return after ? json(after) : notFound()
  }

  if (path[0] === 'clubs' && path.length === 2) {
    const before = store.clubs.find(c => c.id === path[1])
    store.clubs = store.clubs.map(c => c.id === path[1] ? { ...c, ...body } : c)
    const after = store.clubs.find(c => c.id === path[1])
    if (before && after) writeAuditLog({ action: 'UPDATE', entityType: 'club', entityId: path[1], entityLabel: after.name?.en ?? 'Club', user, before: before as unknown as Record<string, unknown>, after: after as unknown as Record<string, unknown>, ip })
    return after ? json(after) : notFound()
  }

  if (path[0] === 'leagues' && path.length === 2) {
    const before = store.leagues.find(l => l.id === path[1])
    store.leagues = store.leagues.map(l => l.id === path[1] ? { ...l, ...body } : l)
    const after = store.leagues.find(l => l.id === path[1])
    if (before && after) writeAuditLog({ action: 'UPDATE', entityType: 'league', entityId: path[1], entityLabel: after.name?.en ?? 'League', user, before: before as unknown as Record<string, unknown>, after: after as unknown as Record<string, unknown>, ip })
    return after ? json(after) : notFound()
  }

  // PATCH /api/roles/:id
  if (path[0] === 'roles' && path.length === 2) {
    const before = store.roles.find(r => r.id === path[1])
    store.roles = store.roles.map(r => r.id === path[1] ? { ...r, ...body } : r)
    const after = store.roles.find(r => r.id === path[1])
    if (before && after) writeAuditLog({ action: 'UPDATE', entityType: 'role', entityId: path[1], entityLabel: after.name, user, before: before as unknown as Record<string, unknown>, after: after as unknown as Record<string, unknown>, ip })
    return after ? json(after) : notFound()
  }

  // PATCH /api/users/:id
  if (path[0] === 'users' && path.length === 2) {
    const before = store.users.find(u => u.id === path[1])
    store.users = store.users.map(u => u.id === path[1] ? { ...u, ...body } : u)
    const after = store.users.find(u => u.id === path[1])
    if (before && after) {
      const { password: _b, ...safeBefore } = before
      const { password: _a, ...safeAfter } = after
      writeAuditLog({ action: 'UPDATE', entityType: 'user', entityId: path[1], entityLabel: after.nameEn, user, before: safeBefore as unknown as Record<string, unknown>, after: safeAfter as unknown as Record<string, unknown>, ip })
    }
    if (!after) return notFound()
    const { password: _, ...safe } = after
    return json(safe)
  }

  return notFound()
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const res = await _DELETE(req, ctx)
  persistStore()
  return res
}

async function _DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const user = getUserFromRequest(req)
  const ip   = getIp(req)

  if (path[0] === 'players' && path.length === 2) {
    const target = store.players.find(p => p.id === path[1])
    store.players = store.players.filter(p => p.id !== path[1])
    if (target) {
      writeAuditLog({
        action: 'DELETE', entityType: 'player',
        entityId: path[1],
        entityLabel: target.name?.en ?? 'Unknown player',
        user,
        before: sanitize(target as unknown as Record<string, unknown>),
        after: null, ip,
      })
    }
    return json({ success: true })
  }

  if (path[0] === 'field-schemas' && path.length === 2) {
    const target = store.schemas.find(s => s.id === path[1])
    store.schemas = store.schemas.filter(s => s.id !== path[1])
    if (target) {
      writeAuditLog({
        action: 'DELETE', entityType: 'field_schema',
        entityId: path[1],
        entityLabel: target.label?.en ?? 'Unknown field',
        user,
        before: target as unknown as Record<string, unknown>,
        after: null, ip,
      })
    }
    return json({ success: true })
  }

  if (path[0] === 'media' && path.length === 2) {
    const target = store.media.find(m => m.id === path[1])
    store.media = store.media.filter(m => m.id !== path[1])
    if (target) {
      writeAuditLog({
        action: 'DELETE', entityType: 'media',
        entityId: path[1],
        entityLabel: `${target.originalFilename} — ${mediaContext(target)}`,
        user,
        before: { id: target.id, filename: target.originalFilename },
        after: null, ip,
      })
    }
    return json({ success: true })
  }

  if (path[0] === 'players' && path[2] === 'matches' && path[3]) {
    const target = store.matches.find(m => m.id === path[3])
    store.matches = store.matches.filter(m => m.id !== path[3])
    if (target) {
      const player = store.players.find(p => p.id === path[1])
      writeAuditLog({
        action: 'DELETE', entityType: 'match',
        entityId: path[3],
        entityLabel: `${player?.name?.en ?? 'Player'} — ${target.matchName ?? target.matchDate}`,
        user, before: sanitize(target as unknown as Record<string, unknown>), after: null, ip,
      })
    }
    return json({ success: true })
  }

  if (path[0] === 'clubs' && path.length === 2) {
    const target = store.clubs.find(c => c.id === path[1])
    store.clubs = store.clubs.filter(c => c.id !== path[1])
    if (target) writeAuditLog({ action: 'DELETE', entityType: 'club', entityId: path[1], entityLabel: target.name?.en ?? 'Club', user, before: target as unknown as Record<string, unknown>, after: null, ip })
    return json({ success: true })
  }

  if (path[0] === 'leagues' && path.length === 2) {
    const target = store.leagues.find(l => l.id === path[1])
    store.leagues = store.leagues.filter(l => l.id !== path[1])
    if (target) writeAuditLog({ action: 'DELETE', entityType: 'league', entityId: path[1], entityLabel: target.name?.en ?? 'League', user, before: target as unknown as Record<string, unknown>, after: null, ip })
    return json({ success: true })
  }

  if (path[0] === 'media' && path[2] === 'notes' && path[3]) {
    const asset = store.media.find(m => m.id === path[1])
    const note  = asset?.notes.find(n => n.id === path[3])
    store.media = store.media.map(m =>
      m.id === path[1]
        ? { ...m, notes: m.notes.filter(n => n.id !== path[3]) }
        : m,
    )
    if (note) {
      writeAuditLog({
        action: 'DELETE', entityType: 'video_note',
        entityId: path[3],
        entityLabel: asset
          ? `Note at ${fmt(note.timestamp)} · "${asset.originalFilename}" · ${mediaContext(asset)}`
          : `Note at ${fmt(note.timestamp)}`,
        user, before: note as unknown as Record<string, unknown>, after: null, ip,
      })
    }
    return json({ success: true })
  }

  // DELETE /api/roles/:id
  if (path[0] === 'roles' && path.length === 2) {
    const target = store.roles.find(r => r.id === path[1])
    if (target?.isSystem) return json({ error: 'Cannot delete system role' }, 403)
    store.roles = store.roles.filter(r => r.id !== path[1])
    if (target) writeAuditLog({ action: 'DELETE', entityType: 'role', entityId: path[1], entityLabel: target.name, user, before: target as unknown as Record<string, unknown>, after: null, ip })
    return json({ success: true })
  }

  // DELETE /api/users/:id
  if (path[0] === 'users' && path.length === 2) {
    const target = store.users.find(u => u.id === path[1])
    store.users = store.users.filter(u => u.id !== path[1])
    if (target) {
      const { password: _, ...safe } = target
      writeAuditLog({ action: 'DELETE', entityType: 'user', entityId: path[1], entityLabel: target.nameEn, user, before: safe as unknown as Record<string, unknown>, after: null, ip })
    }
    return json({ success: true })
  }

  return notFound()
}

// Resolve a human-readable context string for a media asset:
// e.g. "Mohamed Fathy — match vs Al-Ahly (12 Mar 2026)" or "Mohamed Fathy — analysis"
function mediaContext(asset: { entityType: string; entityId: string }): string {
  if (asset.entityType === 'analysis') {
    const player = store.players.find(p => p.id === asset.entityId)
    return player ? `${player.name.en} — analysis` : 'analysis'
  }
  if (asset.entityType === 'match') {
    const match  = store.matches.find(m => m.id === asset.entityId)
    const player = match ? store.players.find(p => p.id === match.playerId) : null
    const matchDesc = match
      ? `${match.matchName} (${new Date(match.matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`
      : 'match'
    return player ? `${player.name.en} — ${matchDesc}` : matchDesc
  }
  return asset.entityType
}

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
