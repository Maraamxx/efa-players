'use client'

import type { Player, PlayerMatch, FieldSchema, Club, League, MediaAsset, Role, SystemUser } from '@/types/domain'
import {
  players as seedPlayers,
  matches as seedMatches,
  fieldSchemas as seedSchemas,
  clubs as seedClubs,
  leagues as seedLeagues,
  roles as seedRoles,
  systemUsers as seedUsers,
} from '@/mocks/fixtures'

const STORE_KEY = 'efa_store'
const STORE_VERSION = 12

export interface StoreData {
  version: number
  players: Player[]
  matches: PlayerMatch[]
  schemas: FieldSchema[]
  clubs: Club[]
  leagues: League[]
  auditLog: any[]
  media: MediaAsset[]
  roles: Role[]
  users: SystemUser[]
}

function seed(): StoreData {
  return {
    version: STORE_VERSION,
    players: [...seedPlayers],
    matches: [...seedMatches],
    schemas: [...seedSchemas],
    clubs: [...seedClubs],
    leagues: [...seedLeagues],
    auditLog: [],
    media: [],
    roles: [...seedRoles],
    users: [...seedUsers],
  }
}

let _cache: StoreData | null = null

export function getStore(): StoreData {
  if (_cache) return _cache
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as StoreData
      if (data.version === STORE_VERSION) { _cache = data; return data }
    }
  } catch {}
  const s = seed()
  _cache = s
  saveStore(s)
  return s
}

export function saveStore(s?: StoreData) {
  const data = s ?? _cache ?? getStore()
  _cache = data
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full — trim audit log and retry
    try {
      data.auditLog = data.auditLog.slice(0, 200)
      localStorage.setItem(STORE_KEY, JSON.stringify(data))
    } catch {}
  }
}

export function resetStore() {
  _cache = null
  localStorage.removeItem(STORE_KEY)
  return getStore()
}
