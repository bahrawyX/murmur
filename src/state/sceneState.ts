/**
 * The single shared scene state.
 *
 * LAW 1 — single writer: exactly ONE scrubbed ScrollTrigger (the master
 * timeline) may tween this object. Discrete, non-scrubbed tweens (intro
 * assembly, mobile chapter morphs, CTA hover) are also allowed. The R3F
 * frame loop only reads it (plus the turbulence decay, which it owns).
 */

export const F = {
  RIBBON: 0,
  SNOWFLAKE: 1,
  FRAME: 2,
  WORD: 3,
  FLOWER: 4,
  SCATTER: 5,
  /** snapshot of current dot positions, used by time-based morphs */
  CAPTURE: 6,
} as const

export type FormationId = (typeof F)[keyof typeof F]
export const FORMATION_SLOTS = 7

export const FOV = 45

/** Camera waypoints. Each chapter starts where the previous one ended (Law 2). */
export const CAM = {
  heroStart: { x: 0, y: 0.4, z: 11 },
  heroEnd: { x: 0.6, y: 0.2, z: 10 },
  studio: { x: 0, y: 0, z: 8 },
  work: { x: 0, y: 0, z: 8 },
  craft: { x: 0, y: 0, z: 10 },
  begin: { x: 0, y: -0.2, z: 10.5 },
} as const

export const sceneState = {
  formationA: F.SCATTER as FormationId,
  formationB: F.RIBBON as FormationId,
  /** 0 → pure formationA, 1 → pure formationB */
  blend: 0,
  /** chapter-authored baseline turbulence (master timeline writes this) */
  turbBase: 0.3,
  /** scroll-velocity spikes, decays 0.92/frame in the flock loop */
  turbVel: 0,
  /** CTA hover: 0 → 1. Petals breathe outward 6%, the flower heart brightens. */
  breathe: 0,
  cam: { x: CAM.heroStart.x, y: CAM.heroStart.y, z: CAM.heroStart.z },
}

/* ------------------------------------------------------------------ */
/* Chapter UI store (tiny external store for ChapterLine / Dock)       */
/* ------------------------------------------------------------------ */

export const CHAPTERS = [
  'chapter one · the flock',
  'chapter two · the studio',
  'chapter three · selected work',
  'chapter four · craft',
  'chapter five · begin',
] as const

let chapter = 0
const chapterSubs = new Set<() => void>()

export function setChapter(i: number) {
  if (i === chapter) return
  chapter = i
  chapterSubs.forEach((fn) => fn())
}

export function getChapter() {
  return chapter
}

export function subscribeChapter(fn: () => void) {
  chapterSubs.add(fn)
  return () => {
    chapterSubs.delete(fn)
  }
}

/* ------------------------------------------------------------------ */
/* Dev assertion — exactly one scrubbed writer on sceneState (Law 1)   */
/* ------------------------------------------------------------------ */

let scrubbedWriter: string | null = null

export function registerScrubbedWriter(id: string) {
  if (!import.meta.env.DEV) return
  if (scrubbedWriter !== null) {
    throw new Error(
      `sceneState already has a scrubbed writer ("${scrubbedWriter}") — refusing to register "${id}".`,
    )
  }
  scrubbedWriter = id
}

export function releaseScrubbedWriter(id: string) {
  if (!import.meta.env.DEV) return
  if (scrubbedWriter === id) scrubbedWriter = null
}
