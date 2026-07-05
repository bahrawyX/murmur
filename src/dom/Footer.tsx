import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { sceneState } from '../state/sceneState'
import { Reveal } from './Reveal'

const LINKS = [
  { label: 'email', href: 'mailto:hello@murmur.studio' },
  { label: 'instagram', href: 'https://instagram.com' },
  { label: 'linkedin', href: 'https://linkedin.com' },
]

function useCairoTime() {
  const fmt = () =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Cairo',
    }).format(new Date())
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

/** CH.5 — the vortex funnels around the CTA; hovering it tightens the spiral */
export function Footer() {
  const time = useCairoTime()

  // CTA hover: petals breathe outward 6% and the flower's heart brightens
  const breathe = (v: number) =>
    gsap.to(sceneState, { breathe: v, duration: 0.6, ease: 'power2.out' })

  return (
    <footer
      id="begin"
      className="relative flex min-h-[100svh] flex-col items-center justify-center gap-10 px-6 text-center"
    >
      <Reveal>
        <h2 className="display text-fg [font-size:clamp(2.2rem,5vw,4rem)]">
          Shall we <em>move together</em>?
        </h2>
      </Reveal>
      <a
        id="cta-begin"
        href="mailto:hello@murmur.studio"
        onMouseEnter={() => breathe(1)}
        onMouseLeave={() => breathe(0)}
        className="pointer-events-auto rounded-full border border-ice px-8 py-3 font-sans text-[15px] text-ice transition-colors duration-300 hover:bg-ice hover:text-night"
      >
        begin a project
      </a>
      <div className="flex items-center gap-8">
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className="line-link pointer-events-auto text-sm text-mut transition-colors hover:text-fg"
          >
            {l.label}
          </a>
        ))}
      </div>
      <p className="label absolute bottom-24">
        murmur studio · cairo · {time}
      </p>
    </footer>
  )
}
