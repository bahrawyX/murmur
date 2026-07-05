import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Whole-line reveal: fade up with a soft blur-out, staggered across direct
 * children when `stagger` is set. Reduced motion → plain fade.
 */
export function Reveal({
  children,
  stagger = false,
  className,
}: {
  children: ReactNode
  stagger?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = stagger ? Array.from(el.children) : el
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        reduce
          ? { opacity: 0 }
          : { opacity: 0, y: 24, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: reduce ? 0.6 : 1.0,
          ease: 'expo.out',
          stagger: stagger ? 0.12 : 0,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [stagger])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
