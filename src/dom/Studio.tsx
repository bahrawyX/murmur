import { Reveal } from './Reveal'

/* the three copy beats — faded up by the studio-beat triggers as the
   snowflake grows (see scroll/masterTimeline.ts) */
const BEATS = [
  'We start every project closed — all questions, no answers.',
  'Research is pressure. Somewhere in the middle, it gives.',
  'What ships is the open thing: obvious in hindsight, impossible to fold back.',
]

/**
 * CH.2 — the flock knits into a snowflake, growing from its hexagonal heart
 * outward as you scroll. The section is taller than a viewport so the growth
 * scrub has room; the copy column stays pinned while the flake crystallizes.
 */
export function Studio() {
  return (
    <section id="studio" className="relative min-h-[170svh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-end px-6 md:px-16">
        <div className="max-w-[40ch] space-y-7">
          <Reveal>
            <p className="label">chapter two · the studio</p>
          </Reveal>
          {BEATS.map((text, k) => (
            <p
              key={text.slice(0, 16)}
              data-studio-beat={k}
              className="text-fg/90 opacity-0"
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
