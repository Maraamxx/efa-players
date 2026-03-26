'use client'

import { createContext, useContext } from 'react'
import type { PermissionAction, PermissionResource, Role } from '@/types/domain'

export interface AuthUser {
  id:     string
  nameEn: string
  nameAr: string
  email:  string
  roleId: string
  role:   Role
}

interface AuthContextValue {
  user:    AuthUser | null
  loading: boolean
  login:   (email: string, password: string) => Promise<{ error?: string }>
  logout:  () => void
  can:     (resource: PermissionResource, action: PermissionAction) => boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true,
  login: async () => ({}),
  logout: () => {},
  can: () => false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useCan(resource: PermissionResource, action: PermissionAction): boolean {
  const { can } = useAuth()
  return can(resource, action)
}
