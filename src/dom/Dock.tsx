import { useEffect, useRef } from 'react'
import { getLenis } from '../hooks/useLenisGsap'
import { sceneState } from '../state/sceneState'

const LINKS = [
  { label: 'the flock', href: '#flock' },
  { label: 'studio', href: '#studio' },
  { label: 'work', href: '#work' },
  { label: 'begin', href: '#begin' },
]

/** bottom capsule dock — the persistent nav, mobile-native as-is */
export function Dock() {
  const dotRef = useRef<HTMLSpanElement>(null)

  // the ice dot pulses while any formation morph is in flight
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const b = sceneState.blend
      dotRef.current?.classList.toggle('dot-pulse', b > 0.02 && b < 0.98)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    getLenis()?.scrollTo(href, { duration: 1.6 })
  }

  return (
    <nav
      aria-label="Site navigation"
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-1 rounded-full border border-hair bg-[#0B1018]/80 px-2 py-2 backdrop-blur">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => go(e, l.href)}
            className="rounded-full px-4 py-1.5 font-sans text-[13px] text-fg transition-colors hover:bg-white/5"
          >
            {l.label}
          </a>
        ))}
        <span
          ref={dotRef}
          aria-hidden
          className="mx-2 h-1.5 w-1.5 rounded-full bg-ice opacity-40"
        />
      </div>
    </nav>
  )
}
