import { useEffect, useRef, useState } from 'react'

const DURATION = 2100 // deliberate, crafted count-up rather than a flash
const ESCAPE = 6000 // hard escape regardless (Law 5)

/**
 * On-theme preloader: a solid night field with the wordmark, a filling
 * hairline, and a smooth count. The flock is already on the canvas behind
 * it as faint static; when this fades, the scatter converges into the
 * ribbon — the assembly is the real opening.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    let raf = 0
    let start = 0
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      setLeaving(true)
      onDone()
    }
    const escape = setTimeout(finish, ESCAPE)
    const tick = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / DURATION)
      const eased = t * t * (3 - 2 * t) // smoothstep
      setPct(Math.round(eased * 100))
      if (t >= 1) {
        finish()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(escape)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-night transition-opacity duration-[900ms] ease-out ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <h1 className="preloader-mark display text-fg [font-size:clamp(1.9rem,6vw,3rem)]">
          murmur
        </h1>
        <div className="mt-8 h-px w-[190px] overflow-hidden bg-hair">
          <div
            className="h-full origin-left bg-fg/40 transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <div className="mt-4 flex w-[190px] items-baseline justify-between">
          <span className="label">gathering the flock</span>
          <span className="font-sans text-xs tabular-nums text-mut" aria-hidden>
            {pct}%
          </span>
        </div>
      </div>
    </div>
  )
}
