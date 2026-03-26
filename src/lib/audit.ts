import { store } from './store'
import type { AuditAction, AuditEntityType, AuditEntry } from '@/types/domain'
import type { CurrentUser } from './userContext'

export function writeAuditLog({
  action,
  entityType,
  entityId,
  entityLabel,
  user,
  before,
  after,
  ip,
}: {
  action:      AuditAction
  entityType:  AuditEntityType
  entityId:    string
  entityLabel: string
  user:        CurrentUser
  before:      Record<string, unknown> | null
  after:       Record<string, unknown> | null
  ip:          string
}) {
  const changed = computeChanged(before, after)

  const entry: AuditEntry = {
    id:          `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    entityType,
    entityId,
    entityLabel,
    userId:      user.id,
    userName:    user.name,
    diff:        { before, after, changed },
    timestamp:   new Date().toISOString(),
    ipAddress:   ip,
  }

  store.auditLog = [entry, ...store.auditLog]
  return entry
}

function computeChanged(
  before: Record<string, unknown> | null,
  after:  Record<string, unknown> | null,
): string[] {
  if (!before || !after) return []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed: string[] = []
  keys.forEach(k => {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k)
  })
  return changed
}

const REDACTED = ['idNumber', 'passportNumber', 'fatherPhone', 'passwordHash']

export function sanitize(obj: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj) return null
  const copy = { ...obj }
  REDACTED.forEach(k => { if (k in copy) copy[k] = '••••••••' })
  return copy
}
