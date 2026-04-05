'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthContext, AuthUser } from '@/lib/auth'
import type { PermissionAction, PermissionResource } from '@/types/domain'
import { apiFetch } from '@/lib/apiFetch'

const PUBLIC_ROUTES = ['/login']
const STORAGE_KEY   = 'efa_user_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setLoading(false)
      return
    }
    apiFetch(`/api/auth/me?userId=${stored}`)
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u && !u.error) {
          setUser(u)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_ROUTES.includes(pathname)
    if (!user && !isPublic) {
      router.replace('/login')
    } else if (user && isPublic) {
      router.replace('/players')
    }
  }, [user, loading, pathname, router])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return { error: 'Invalid email or password' }
    const u = await res.json()
    localStorage.setItem(STORAGE_KEY, u.id)
    localStorage.setItem('efa_current_user', JSON.stringify({ id: u.id, name: u.nameEn }))
    setUser(u)
    return {}
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('efa_current_user')
    // Navigate first, then clear user — avoids blank screen flash
    router.replace('/login')
    // Small delay so the route change registers before user clears
    setTimeout(() => setUser(null), 0)
  }, [router])

  const can = useCallback((
    resource: PermissionResource,
    action: PermissionAction
  ): boolean => {
    if (!user?.role) return false
    const perm = user.role.permissions.find(p => p.resource === resource)
    return perm?.actions.includes(action) ?? false
  }, [user])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#fff',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid #C8102E',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }} />
        <div style={{
          fontFamily: 'var(--onest)', fontSize: 11,
          fontWeight: 600, letterSpacing: '.1em',
          textTransform: 'uppercase' as const, color: '#999',
        }}>
          EFA PLAYERS
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const isPublic = PUBLIC_ROUTES.includes(pathname)
  if (!user && !isPublic) return null

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}
