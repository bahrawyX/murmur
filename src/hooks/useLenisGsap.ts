import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { sceneState } from '../state/sceneState'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function getLenis() {
  return lenis
}

/**
 * Lenis ↔ GSAP wiring, per the laws: lenis drives ScrollTrigger.update,
 * gsap's ticker drives lenis, lagSmoothing off. Scroll starts stopped —
 * App calls lenis.start() once the opening assembly begins.
 */
export function useLenisGsap() {
  useEffect(() => {
    lenis = new Lenis()
    lenis.stop()

    const onScroll = () => ScrollTrigger.update()
    const onVelocity = (e: { velocity: number }) => {
      // fast scrolling agitates the flock; clamped, decays in the frame loop
      sceneState.turbVel = Math.max(
        sceneState.turbVel,
        Math.min(Math.abs(e.velocity) * 0.015, 1.2),
      )
    }
    lenis.on('scroll', onScroll)
    lenis.on('scroll', onVelocity)

    const tick = (time: number) => lenis?.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis?.destroy()
      lenis = null
    }
  }, [])
}
