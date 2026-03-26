'use client'

export function Skeleton({
  width = '100%', height = 16, borderRadius = 4,
}: {
  width?: string | number
  height?: number
  borderRadius?: number
}) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, var(--bg3) 25%, var(--s2) 50%, var(--bg3) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

export function PlayerCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg)', borderBottom: '1px solid var(--border)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <Skeleton width={34} height={34} borderRadius={6} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={44} height={20} borderRadius={3} />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Skeleton width={80} height={80} borderRadius={8} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="30%" height={26} />
            <Skeleton width="20%" height={16} />
            <Skeleton width="50%" height={36} borderRadius={6} />
          </div>
        </div>
      </div>
      <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[140, 200, 160, 100, 120].map((h, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <Skeleton width="40%" height={12} />
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: Math.max(2, Math.floor(h / 30)) }, (_, j) => (
                <div key={j} style={{ display: 'flex', gap: 12 }}>
                  <Skeleton width={100} height={11} />
                  <Skeleton width="50%" height={11} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes shimmer {
        0%   { background-position: 200% 0 }
        100% { background-position: -200% 0 }
      }
    `}</style>
  )
}
