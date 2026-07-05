import { useEffect, useRef, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { CHAPTERS, getChapter, subscribeChapter } from '../state/sceneState'

/**
 * Fixed top-center chapter label with a 0.4s crossfade at boundaries, plus
 * a 120px hairline whose fill mirrors master progress (set by the master
 * ScrollTrigger via #chapter-progress — DOM write, not sceneState).
 */
export function ChapterLine() {
  const chapter = useSyncExternalStore(subscribeChapter, getChapter)
  const labelRef = useRef<HTMLParagraphElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = labelRef.current
    if (!el) return
    const tween = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 })
    return () => {
      tween.kill()
    }
  }, [chapter])

  return (
    <div className="pointer-events-none fixed top-6 left-1/2 z-40 -translate-x-1/2 text-center">
      <p ref={labelRef} className="label" aria-live="polite">
        {CHAPTERS[chapter]}
      </p>
      <div className="mx-auto mt-2 h-px w-[120px] bg-hair">
        <div
          id="chapter-progress"
          className="h-full w-full origin-left bg-fg/40"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
