import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  sceneState,
  F,
  CAM,
  setChapter,
  registerScrubbedWriter,
  releaseScrubbedWriter,
} from '../state/sceneState'
import { flockBridge } from '../scene/flockBridge'
import { morphTo } from './morph'

gsap.registerPlugin(ScrollTrigger)

const EPS = 1e-5

/** the three CH.2 copy beats fade up at these fractions of the growth window */
const BEAT_FRACS = [0.12, 0.42, 0.74]

const $ = (sel: string) => document.querySelector<HTMLElement>(sel)
const $$ = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel))

/**
 * Build the whole scroll orchestration. Returns a cleanup function.
 * Desktop (no reduced motion): ONE master scrubbed timeline tweens
 * sceneState — formations, camera, turbulence (Law 1). The snowflake's
 * growth and the flower's petal-by-petal assembly are inherent in the
 * per-dot knit delays, so no extra scalar is scrubbed.
 * Below 1024px / reduced motion: formations become time-based morphs.
 */
export function buildOrchestration(): () => void {
  let ctx = createContext()

  let lastW = window.innerWidth
  let timer: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    if (window.innerWidth === lastW) return
    lastW = window.innerWidth
    clearTimeout(timer)
    timer = setTimeout(() => {
      ctx.revert()
      ctx = createContext()
      ScrollTrigger.refresh()
    }, 250)
  }
  window.addEventListener('resize', onResize)

  // FRAME anchor must be re-projected before ST measures (Law 4)
  const onRefreshInit = () => flockBridge.refreshAnchors?.()
  ScrollTrigger.addEventListener('refreshInit', onRefreshInit)

  return () => {
    window.removeEventListener('resize', onResize)
    ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
    clearTimeout(timer)
    ctx.revert()
  }
}

function createContext() {
  return gsap.context(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        desktop: '(min-width: 1024px)',
        mobile: '(max-width: 1023.98px)',
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (c) => {
        const cond = c.conditions as { desktop: boolean; reduce: boolean }
        const scrubFormations = cond.desktop && !cond.reduce
        buildMaster(scrubFormations, cond.reduce)
        if (!scrubFormations) buildBoundaryMorphs(cond.reduce ? 0.3 : 1.1)
        buildStudioBeats(cond.reduce)
        buildChapterTriggers()
        return () => releaseScrubbedWriter('master')
      },
    )
  })
}

/* ------------------------------------------------------------------ */

/** CH.2 growth window — the snowflake grows across the sticky studio range */
function ch2Window(studio: HTMLElement, vh: number) {
  const start = studio.offsetTop - vh * 0.65
  const end = studio.offsetTop + studio.offsetHeight - vh * 1.1
  return { start, end: Math.max(end, start + vh * 0.6) }
}

function buildMaster(withFormations: boolean, reduce: boolean) {
  const studio = $('#studio')
  const craft = $('#craft')
  const begin = $('#begin')
  const cards = $$('[data-work-card-section]')
  if (!studio || !craft || !begin || cards.length === 0) return

  const vh = window.innerHeight
  const total = document.documentElement.scrollHeight - vh
  if (total <= 0) return

  registerScrubbedWriter('master')

  const at = (px: number) => Math.min(Math.max(px / total, 0), 1)
  const dur = (from: number, to: number) => Math.max(EPS, at(to) - at(from))

  const progressBar = $('#chapter-progress')
  const setProgress = progressBar ? gsap.quickSetter(progressBar, 'scaleX') : () => {}

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => setProgress(self.progress),
    },
  })

  const ss = sceneState
  const flake = ch2Window(studio, vh)

  /* camera — continuous path, each chapter starts where the last ended */
  tl.to(ss.cam, { ...CAM.heroEnd, duration: dur(0, studio.offsetTop - vh * 0.7) }, 0)
  tl.to(
    ss.cam,
    { ...CAM.studio, duration: dur(studio.offsetTop - vh * 0.7, studio.offsetTop) },
    at(studio.offsetTop - vh * 0.7),
  )
  tl.to(
    ss.cam,
    { ...CAM.craft, duration: dur(craft.offsetTop - vh, craft.offsetTop) },
    at(craft.offsetTop - vh),
  )
  tl.to(
    ss.cam,
    { ...CAM.begin, duration: dur(begin.offsetTop - vh, begin.offsetTop) },
    at(begin.offsetTop - vh),
  )

  /* baseline turbulence — CH.3 stays low so the frame holds still, breathing */
  if (reduce) {
    ss.turbBase = 0
  } else {
    const turbTo = (v: number, from: number, to: number) =>
      tl.to(ss, { turbBase: v, duration: dur(from, to) }, at(from))
    turbTo(0.12, flake.start, flake.end)
    turbTo(0.08, cards[0].offsetTop - vh * 0.8, cards[0].offsetTop - vh * 0.25)
    turbTo(0.08, craft.offsetTop - vh * 0.8, craft.offsetTop - vh * 0.4)
    turbTo(0.2, begin.offsetTop - vh * 0.8, begin.offsetTop - vh * 0.1)
  }

  /* formations — desktop scrubbed blend only (Law 6: never on touch) */
  if (withFormations) {
    const setF = (px: number, a: number, b: number) =>
      tl.set(ss, { formationA: a, formationB: b, blend: 0 }, at(px) + EPS)
    const blendTo = (from: number, to: number) =>
      tl.to(ss, { blend: 1, duration: dur(from, to) }, at(from) + 2 * EPS)

    // CH.2 — ribbon knits into the snowflake, GROWING outward across the chapter
    setF(flake.start - vh * 0.05, F.RIBBON, F.SNOWFLAKE)
    blendTo(flake.start, flake.end)

    // CH.3 — gather into the frame ONCE; it holds for all three slides
    setF(cards[0].offsetTop - vh * 0.85, F.SNOWFLAKE, F.FRAME)
    blendTo(cards[0].offsetTop - vh * 0.8, cards[0].offsetTop - vh * 0.25)

    // CH.4 — the flock spells "craft"
    setF(craft.offsetTop - vh * 0.85, F.FRAME, F.WORD)
    blendTo(craft.offsetTop - vh * 0.8, craft.offsetTop - vh * 0.4)

    // CH.5 — the word assembles into the flower, petal by petal
    setF(begin.offsetTop - vh * 0.85, F.WORD, F.FLOWER)
    blendTo(begin.offsetTop - vh * 0.8, begin.offsetTop - vh * 0.05)
  }
}

/* ------------------------------------------------------------------ */

/** the three CH.2 copy beats, pinned to fractions of the growth window */
function buildStudioBeats(reduce: boolean) {
  const studio = $('#studio')
  const beats = $$('[data-studio-beat]')
  if (!studio || beats.length === 0) return

  const vh = window.innerHeight
  const flake = ch2Window(studio, vh)

  beats.forEach((el, k) => {
    const fade = gsap.fromTo(
      el,
      reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: reduce ? 0.5 : 1.0,
        ease: 'expo.out',
        paused: true,
      },
    )
    ScrollTrigger.create({
      start: flake.start + BEAT_FRACS[k] * (flake.end - flake.start),
      end: '+=1',
      onEnter: () => fade.play(),
      onLeaveBack: () => fade.reverse(),
    })
  })
}

/* ------------------------------------------------------------------ */

/** time-based formation morphs on chapter boundaries — mobile + reduced motion */
function buildBoundaryMorphs(duration: number) {
  const studio = $('#studio')
  const work = $('#work')
  const craft = $('#craft')
  const begin = $('#begin')
  if (!studio || !work || !craft || !begin) return

  ScrollTrigger.create({
    trigger: studio,
    start: 'top 70%',
    onEnter: () => morphTo(F.SNOWFLAKE, duration),
    onLeaveBack: () => morphTo(F.RIBBON, duration),
  })

  // the frame forms once on entering CH.3 and holds for all three slides
  ScrollTrigger.create({
    trigger: work,
    start: 'top 65%',
    onEnter: () => morphTo(F.FRAME, duration),
    onLeaveBack: () => morphTo(F.SNOWFLAKE, duration),
  })

  ScrollTrigger.create({
    trigger: craft,
    start: 'top 70%',
    onEnter: () => morphTo(F.WORD, duration),
    onLeaveBack: () => morphTo(F.FRAME, duration),
  })

  ScrollTrigger.create({
    trigger: begin,
    start: 'top 70%',
    onEnter: () => morphTo(F.FLOWER, duration),
    onLeaveBack: () => morphTo(F.WORD, duration),
  })
}

/* ------------------------------------------------------------------ */

function buildChapterTriggers() {
  const sections = ['#flock', '#studio', '#work', '#craft', '#begin']
  sections.forEach((sel, i) => {
    const el = $(sel)
    if (!el) return
    ScrollTrigger.create({
      trigger: el,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => self.isActive && setChapter(i),
    })
  })
}

/* HMR — never leave orphaned triggers behind (Law 3) */
if (import.meta.hot) {
  import.meta.hot.dispose(() => ScrollTrigger.getAll().forEach((t) => t.kill()))
}
