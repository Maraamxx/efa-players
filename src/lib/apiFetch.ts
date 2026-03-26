export function getCurrentUser() {
  if (typeof window === 'undefined') return { id: 'user-1', name: 'System Admin' }
  const stored = localStorage.getItem('efa_current_user')
  if (stored) return JSON.parse(stored)
  return { id: 'user-1', name: 'System Admin' }
}

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = getCurrentUser()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id':   user.id,
      'x-user-name': user.name,
      ...(options.headers ?? {}),
    },
  })
}
