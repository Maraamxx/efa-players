'use client'

import { useEffect, useState, useRef } from 'react'

let mswStarted = false
let mswPromise: Promise<void> | null = null

function startMSW() {
  if (mswStarted) return Promise.resolve()
  if (mswPromise) return mswPromise
  mswPromise = import('@/mocks').then(({ initMocks }) =>
    initMocks().then(() => { mswStarted = true })
  )
  return mswPromise
}

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NODE_ENV !== 'development' || mswStarted
  )

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (mswStarted) { setReady(true); return }
    startMSW().then(() => setReady(true))
  }, [])

  if (!ready) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      fontFamily: 'var(--onest)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid #C8102E',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: '.1em', textTransform: 'uppercase',
          color: '#999',
        }}>
          Starting system…
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return <>{children}</>
}