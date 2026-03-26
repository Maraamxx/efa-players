'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [key, setKey]         = useState(pathname)

  useEffect(() => {
    // Skip transition delay for login page (instant render after logout)
    if (pathname === '/login') {
      setKey(pathname)
      setVisible(true)
      return
    }
    setVisible(false)
    const t = setTimeout(() => {
      setKey(pathname)
      setVisible(true)
    }, 60)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => { setVisible(true) }, [])

  return (
    <div
      key={key}
      style={{
        opacity:    visible ? 1 : 0,
        transition: 'opacity .18s ease',
      }}
    >
      {children}
    </div>
  )
}
