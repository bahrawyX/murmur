/**
 * Trig-based ambient drift — cheap enough for 10k dots per frame.
 * Two out-of-phase oscillators per axis, decorrelated by a per-dot seed
 * and per-dot frequencies. No simplex, no allocations, 6 trig calls/dot.
 */
export interface Vec3Like {
  x: number
  y: number
  z: number
}

const PHASE_Y = 2.0943951 // 120°
const PHASE_Z = 4.1887902 // 240°

export function trigDrift(
  seed: number,
  f1: number,
  f2: number,
  t: number,
  out: Vec3Like,
) {
  const p = t * f1 + seed * 6.28318
  const q = t * f2 + seed * 10.7
  out.x = 0.6 * Math.sin(p) + 0.4 * Math.cos(q)
  out.y = 0.6 * Math.sin(p + PHASE_Y) + 0.4 * Math.cos(q + PHASE_Y)
  out.z = 0.6 * Math.sin(p + PHASE_Z) + 0.4 * Math.cos(q + PHASE_Z)
}
