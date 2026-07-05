import { Reveal } from './Reveal'

/** CH.4 — the flock spells "craft" center-screen; one line sits beneath it */
export function Craft() {
  return (
    <section id="craft" className="relative min-h-[100svh]">
      <div className="absolute left-1/2 top-[68%] w-full -translate-x-1/2 px-6 text-center">
        <Reveal>
          <p className="text-sm text-mut">
            Everything above this line is two thousand pieces agreeing.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
