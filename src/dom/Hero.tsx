import { Reveal } from './Reveal'

/** CH.1 — the ribbon flows across the upper half; copy sits lower-left */
export function Hero() {
  return (
    <section id="flock" className="relative min-h-[100svh]">
      <div className="absolute bottom-[16svh] left-6 md:left-14">
        <Reveal stagger>
          <p className="label mb-4">a digital studio</p>
          <h1 className="display max-w-[16ch] text-fg [font-size:clamp(2.6rem,7vw,6rem)]">
            A thousand small decisions, <em>moving as one</em>.
          </h1>
        </Reveal>
      </div>
      {/* scroll hint — a tiny downward-drifting dot trio */}
      <div
        aria-hidden
        className="absolute bottom-[8svh] right-8 flex flex-col items-center gap-1.5 md:right-14"
      >
        <span className="hint-dot" />
        <span className="hint-dot" style={{ animationDelay: '0.25s' }} />
        <span className="hint-dot" style={{ animationDelay: '0.5s' }} />
      </div>
    </section>
  )
}
