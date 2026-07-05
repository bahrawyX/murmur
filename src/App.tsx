import { useCallback, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Scene } from './scene/Scene'
import { flockBridge } from './scene/flockBridge'
import { sceneState, F } from './state/sceneState'
import { useLenisGsap, getLenis } from './hooks/useLenisGsap'
import { buildOrchestration } from './scroll/masterTimeline'
import { Preloader } from './dom/Preloader'
import { Dock } from './dom/Dock'
import { ChapterLine } from './dom/ChapterLine'
import { Hero } from './dom/Hero'
import { Studio } from './dom/Studio'
import { Work } from './dom/Work'
import { Craft } from './dom/Craft'
import { Footer } from './dom/Footer'
import { SrArticle } from './dom/SrArticle'

gsap.registerPlugin(ScrollTrigger)

type Phase = 'loading' | 'ready'

export default function App() {
  useLenisGsap()
  const [phase, setPhase] = useState<Phase>('loading')
  const [glLost, setGlLost] = useState(false)

  /* preloader exit → the scattered static converges into the ribbon.
     The assembly IS the opening; scroll unlocks as it completes. */
  const startAssembly = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.to(sceneState, {
      blend: 1,
      duration: reduce ? 0.5 : 1.6,
      ease: 'power3.inOut',
      onComplete: () => {
        sceneState.formationA = F.RIBBON
        sceneState.formationB = F.RIBBON
        sceneState.blend = 0
        getLenis()?.start()
        setPhase('ready')
      },
    })
  }, [])

  /* scroll orchestration builds once the page is interactive (Law 3) */
  useEffect(() => {
    if (phase !== 'ready') return
    const cleanup = buildOrchestration()
    requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      ScrollTrigger.update()
    })
    document.fonts.ready.then(() => {
      flockBridge.rebuildWord?.()
      ScrollTrigger.refresh()
    })
    return cleanup
  }, [phase])

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0">
        <Scene
          onContextLost={() => setGlLost(true)}
          onContextRestored={() => setGlLost(false)}
        />
      </div>

      {/* pointer-events pass through to the canvas except on real controls */}
      <main id="main" className="pointer-events-none relative z-10">
        <Hero />
        <Studio />
        <Work />
        <Craft />
        <Footer />
      </main>

      <ChapterLine />
      <Dock />
      <SrArticle />

      {phase === 'loading' && <Preloader onDone={startAssembly} />}

      {glLost && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night">
          <p className="label">the flock scattered — please reload the page</p>
        </div>
      )}
    </>
  )
}
