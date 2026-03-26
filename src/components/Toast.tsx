'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id:       string
  type:     ToastType
  title:    string
  message?: string
}

interface ToastContextValue {
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {}, error: () => {}, info: () => {}, warning: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
}

const COLORS: Record<ToastType, { border: string; icon: string; iconBg: string }> = {
  success: { border: 'rgba(22,163,74,.25)',  icon: 'var(--green)', iconBg: 'rgba(22,163,74,.1)'  },
  error:   { border: 'var(--redBorder)',     icon: 'var(--red)',   iconBg: 'var(--redDim)'       },
  info:    { border: 'rgba(59,130,246,.25)', icon: '#3B82F6',      iconBg: 'rgba(59,130,246,.1)' },
  warning: { border: 'rgba(245,158,11,.25)', icon: '#D97706',      iconBg: 'rgba(245,158,11,.1)' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts(t => [...t.slice(-4), { id, type, title, message }])
    timers.current[id] = setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const value: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    info:    (t, m) => add('info',    t, m),
    warning: (t, m) => add('warning', t, m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const c = COLORS[toast.type]
          return (
            <div
              key={toast.id}
              onClick={() => dismiss(toast.id)}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              style={{
                pointerEvents: 'all',
                position: 'relative',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                background: 'var(--bg)',
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,.1)',
                minWidth: 280, maxWidth: 360,
                animation: 'toastIn .2s ease',
                cursor: 'pointer',
                transition: 'transform .15s',
                overflow: 'hidden',
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: c.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--onest)', fontSize: 11, fontWeight: 800,
                color: c.icon, flexShrink: 0,
              }}>
                {ICONS[toast.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--onest)', fontSize: 13, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3 }}>
                  {toast.title}
                </div>
                {toast.message && (
                  <div style={{ fontFamily: 'var(--onest)', fontSize: 12, color: 'var(--t3)', marginTop: 2, lineHeight: 1.4 }}>
                    {toast.message}
                  </div>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0 }}>✕</button>
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                height: 2, borderRadius: '0 0 8px 8px',
                background: c.icon,
                animation: 'toastProgress 4s linear forwards',
              }} />
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastIn { from { opacity:0;transform:translateX(20px) } to { opacity:1;transform:translateX(0) } }
        @keyframes toastProgress { from { width:100% } to { width:0% } }
      `}</style>
    </ToastContext.Provider>
  )
}
