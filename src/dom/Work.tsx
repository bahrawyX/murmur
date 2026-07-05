import { Reveal } from './Reveal'

/* replace the {{WORK_XX_MP4}} tokens with real media URLs at integration */
const PROJECTS = [
  {
    title: 'Night garden',
    desc: 'An ambient companion app grown around sleep.',
    src: '{{WORK_01_MP4}}',
    hue: 'from-[#0B1626] to-[#101B2E]',
  },
  {
    title: 'Chorus',
    desc: 'Crowd-composed concert visuals, rendered live.',
    src: '{{WORK_02_MP4}}',
    hue: 'from-[#0D1220] to-[#141C30]',
  },
  {
    title: 'Field notes',
    desc: 'A mapping tool for wildlife researchers.',
    src: '{{WORK_03_MP4}}',
    hue: 'from-[#0A1420] to-[#0F1D2C]',
  },
]

/**
 * CH.3 — centered cards, one per viewport; the flock forms a living frame
 * around the active card (FRAME formation is projected from [data-work-card]).
 */
export function Work() {
  return (
    <section id="work">
      {PROJECTS.map((p) => (
        <div
          key={p.title}
          data-work-card-section
          className="flex min-h-[105svh] items-center justify-center px-6"
        >
          <figure data-work-card className="pointer-events-auto w-full max-w-[720px]">
            <div className="aspect-[16/10] overflow-hidden rounded-xl border border-hair bg-[#0B1018]">
              {p.src.startsWith('{{') ? (
                <div
                  aria-hidden
                  className={`h-full w-full bg-gradient-to-br ${p.hue}`}
                />
              ) : (
                <video
                  className="h-full w-full object-cover"
                  src={p.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              )}
            </div>
            <Reveal>
              <figcaption className="mt-5">
                <h3 className="display text-2xl text-fg">{p.title}</h3>
                <p className="mt-1 text-sm text-mut">{p.desc}</p>
              </figcaption>
            </Reveal>
          </figure>
        </div>
      ))}
    </section>
  )
}
