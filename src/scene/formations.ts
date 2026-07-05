import { F, FOV, CAM, FORMATION_SLOTS, type FormationId } from '../state/sceneState'
import { Silhouette, drawSnowflake, drawFlower, drawWord } from './silhouette'

const TAU = Math.PI * 2

/* per-formation tilts (Change §2/3/4). Dots are billboards, so tilt only
   repositions — silhouettes stay crisp from the journey camera. */
const SNOW_TILT = (4 * Math.PI) / 180
const SNOW_COS = Math.cos(SNOW_TILT)
const SNOW_SIN = Math.sin(SNOW_TILT)
const SNOW_SPIN = 0.03 // rad/s
const FLOWER_TILT = (20 * Math.PI) / 180
const FLOWER_COS = Math.cos(FLOWER_TILT)
const FLOWER_SIN = Math.sin(FLOWER_TILT)

/** knit window: a dot finishes when blend ≥ delay + KNIT_W */
export const KNIT_W = 0.5

/** deterministic RNG so formations are stable across rebuilds */
function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** a stride coprime with `count`, near the golden ratio, for index spread */
function pickStride(count: number) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  let s = Math.floor(count * 0.618) | 1
  while (gcd(s, count) !== 1) s += 2
  return s
}

function halfHeightAt(dist: number) {
  return Math.tan(((FOV * Math.PI) / 180) / 2) * dist
}

export interface ReadCtx {
  /** snowflake slow-spin, precomputed once per frame */
  snowCos: number
  snowSin: number
  /** CTA-hover flower breathe 0..1 (sceneState.breathe) */
  breathe: number
}

/**
 * All formation target buffers for one flock, indexed by FormationId, plus a
 * per-formation knit-delay array (which dot departs when) and a flower-heart
 * mask. Colors/sizes are fixed per-dot attributes on the Points geometry
 * (built in Flock); formations ROUTE the ice/steel index ranges to glow/edge
 * regions so the bright dots always land where the shape wants them.
 */
export class FormationSet {
  readonly count: number
  readonly nIce: number
  readonly nSteel: number
  readonly slots: Float32Array[]
  readonly delays: Float32Array[]
  readonly flowerHeart: Uint8Array

  constructor(count: number, nIce: number, nSteel: number) {
    this.count = count
    this.nIce = nIce
    this.nSteel = nSteel
    this.stride = pickStride(count)
    this.slots = Array.from({ length: FORMATION_SLOTS }, () => new Float32Array(count * 3))
    this.delays = Array.from({ length: FORMATION_SLOTS }, () => new Float32Array(count))
    this.flowerHeart = new Uint8Array(count)
    this.buildRibbon()
    this.buildSnowflake()
    this.buildScatter()
    this.setFrame(2.7, 1.9)
    this.rebuildWord()
    this.buildFlower()
  }

  private readonly stride: number
  private perm(i: number) {
    return (i * this.stride + 389) % this.count
  }

  /** fill a formation's delays with the generic seeded knit stagger */
  private genericDelays(f: FormationId, seed: number) {
    const del = this.delays[f]
    const rnd = mulberry32(seed)
    for (let i = 0; i < this.count; i++) del[i] = rnd() * 0.35
  }

  /* -------------------------------------------------- parametric shapes */

  /** F0 — wide sine/curl band spanning x −7→7, the murmuration wave */
  private buildRibbon() {
    const a = this.slots[F.RIBBON]
    const rnd = mulberry32(11)
    for (let i = 0; i < this.count; i++) {
      const x = -7 + 14 * ((this.perm(i) + rnd()) / this.count)
      const y =
        Math.sin(x * 0.55) * 1.1 + Math.sin(x * 1.3 + 1.7) * 0.4 + 1.0 + (rnd() - 0.5) * 0.8
      const z = Math.sin(x * 0.8 + 0.6) * 0.9 + (rnd() - 0.5) * 1.2
      a[i * 3] = x
      a[i * 3 + 1] = y
      a[i * 3 + 2] = z
    }
    this.genericDelays(F.RIBBON, 101)
  }

  /** preloader state — faint static scattered across the whole view */
  private buildScatter() {
    const a = this.slots[F.SCATTER]
    const rnd = mulberry32(33)
    for (let i = 0; i < this.count; i++) {
      a[i * 3] = (rnd() - 0.5) * 16
      a[i * 3 + 1] = (rnd() - 0.5) * 9
      a[i * 3 + 2] = (rnd() - 0.5) * 6
    }
    this.genericDelays(F.SCATTER, 202)
  }

  /** F2 — rectangular ring, centered at origin, half-extents hw×hh */
  setFrame(hw: number, hh: number) {
    const a = this.slots[F.FRAME]
    const rnd = mulberry32(55)
    const per = 4 * (hw + hh)
    for (let i = 0; i < this.count; i++) {
      let d = ((this.perm(i) + 0.5) / this.count) * per
      let x = 0
      let y = 0
      if (d < 2 * hw) {
        x = -hw + d
        y = hh
      } else if ((d -= 2 * hw) < 2 * hh) {
        x = hw
        y = hh - d
      } else if ((d -= 2 * hh) < 2 * hw) {
        x = hw - d
        y = -hh
      } else {
        d -= 2 * hw
        x = -hw
        y = -hh + d
      }
      a[i * 3] = x + (rnd() - 0.5) * 0.24
      a[i * 3 + 1] = y + (rnd() - 0.5) * 0.24
      a[i * 3 + 2] = (rnd() - 0.5) * 0.7
    }
    this.genericDelays(F.FRAME, 303)
  }

  setFrameFromDom() {
    const el = document.querySelector<HTMLElement>('[data-work-card]')
    if (!el || el.offsetWidth === 0) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const halfH = halfHeightAt(CAM.work.z)
    const halfW = halfH * (vw / vh)
    const hw = (el.offsetWidth / vw) * halfW * 1.12
    const hh = (el.offsetHeight / vh) * halfH * 1.12
    this.setFrame(hw, hh)
  }

  /* ------------------------------------------------ drawn silhouettes */

  private haloPoint(a: Float32Array, i: number, rnd: () => number) {
    const ang = rnd() * TAU
    const r = 4.6 + rnd() * 3.0
    a[i * 3] = Math.cos(ang) * r
    a[i * 3 + 1] = Math.sin(ang) * r * 0.6
    a[i * 3 + 2] = -6 - rnd() * 7 // far behind — fog + attenuation dim it
  }

  /**
   * F1 — the EXACT snowflake. Ice dots route to branch tips (radialBias +3),
   * steel to the outer edges, white fills the arms. Knit delay = radial
   * distance, so the flake GROWS from the hexagonal heart outward (§3).
   */
  private buildSnowflake() {
    const a = this.slots[F.SNOWFLAKE]
    const del = this.delays[F.SNOWFLAKE]
    const rnd = mulberry32(2201)
    const sil = new Silhouette(drawSnowflake, 3.4)
    const { nIce, nSteel, count } = this
    const steelEnd = nIce + nSteel
    const whiteTotal = count - steelEnd
    const whiteInShape = Math.floor(whiteTotal * 0.82)

    const put = (idx: number, x: number, y: number, r: number) => {
      a[idx * 3] = x + (rnd() - 0.5) * 0.05
      a[idx * 3 + 1] = y + (rnd() - 0.5) * 0.05
      a[idx * 3 + 2] = (rnd() - 0.5) * 0.3 // ±0.15 depth
      del[idx] = r * KNIT_W // grow outward
    }

    sil.sample(nIce, 3, rnd, (x, y, r, i) => put(i, x, y, r))
    sil.sample(nSteel, 1.2, rnd, (x, y, r, i) => put(nIce + i, x, y, r))
    sil.sample(whiteInShape, 0, rnd, (x, y, r, i) => put(steelEnd + i, x, y, r))
    for (let idx = steelEnd + whiteInShape; idx < count; idx++) {
      this.haloPoint(a, idx, rnd)
      del[idx] = 0.34
    }
  }

  /**
   * F4 — the CORRECT flower (rose curve). Ice dots route to the center disc
   * (glowing heart), steel to petal edges, white fills the petals. Knit
   * delay is keyed petal-by-petal so petals assemble one after another (§4).
   * Stored flat + pre-tilt; readTarget applies the 20° face tilt + breathe.
   */
  private buildFlower() {
    const a = this.slots[F.FLOWER]
    const del = this.delays[F.FLOWER]
    const heart = this.flowerHeart
    heart.fill(0)
    const rnd = mulberry32(4401)
    const sil = new Silhouette(drawFlower, 3.0)
    const { nIce, nSteel, count } = this
    const steelEnd = nIce + nSteel
    const whiteTotal = count - steelEnd
    const whiteInShape = Math.floor(whiteTotal * 0.82)

    // petal index 0..4 from angle → sequential assembly, 0.12 offset each
    const petalDelay = (x: number, y: number) => {
      const petal = Math.floor((((Math.atan2(y, x) + Math.PI) / TAU) * 5) % 5)
      return Math.min(petal * 0.12, 0.44) + 0.06
    }
    const put = (idx: number, x: number, y: number, order: number, isHeart: boolean) => {
      a[idx * 3] = x + (rnd() - 0.5) * 0.04
      a[idx * 3 + 1] = y + (rnd() - 0.5) * 0.04
      a[idx * 3 + 2] = (rnd() - 0.5) * 0.3
      del[idx] = order
      if (isHeart) heart[idx] = 1
    }

    sil.sample(nIce, -4, rnd, (x, y, _r, i) => put(i, x, y, 0.04, true))
    sil.sample(nSteel, 2, rnd, (x, y, _r, i) => put(nIce + i, x, y, petalDelay(x, y), false))
    sil.sample(whiteInShape, 0, rnd, (x, y, _r, i) =>
      put(steelEnd + i, x, y, petalDelay(x, y), false),
    )
    for (let idx = steelEnd + whiteInShape; idx < count; idx++) {
      this.haloPoint(a, idx, rnd)
      del[idx] = 0.34
    }
  }

  /** F3 — the word "craft", now via the same drawn-silhouette pipeline (§2) */
  rebuildWord(text = 'craft') {
    const a = this.slots[F.WORD]
    const del = this.delays[F.WORD]
    const rnd = mulberry32(66)
    const sil = new Silhouette(drawWord(text), 3.7)
    const { count } = this
    const inShape = Math.floor(count * 0.84)
    // sample once, then spread across indices via perm so ice glitter is even
    const tx = new Float32Array(inShape)
    const ty = new Float32Array(inShape)
    sil.sample(inShape, 0, rnd, (x, y, _r, i) => {
      tx[i] = x
      ty[i] = y
    })
    for (let i = 0; i < count; i++) {
      const p = this.perm(i)
      if (p < inShape) {
        a[i * 3] = tx[p] + (rnd() - 0.5) * 0.05
        a[i * 3 + 1] = ty[p] + (rnd() - 0.5) * 0.05
        a[i * 3 + 2] = (rnd() - 0.5) * 0.3
      } else {
        this.haloPoint(a, i, rnd)
      }
    }
    this.genericDelays(F.WORD, 404)
  }

  /** snapshot live positions so a time-based morph can start from "now" */
  captureFrom(current: Float32Array) {
    this.slots[F.CAPTURE].set(current)
    // captured formation is only ever the source of a morph; delays unused
  }
}

/**
 * Read one dot's target for a formation into `out`, applying formation-local
 * per-frame motion: snowflake slow spin + tilt, flower face-tilt + CTA breathe.
 */
export function readTarget(
  set: FormationSet,
  f: FormationId,
  i: number,
  ctx: ReadCtx,
  out: { x: number; y: number; z: number },
) {
  const a = set.slots[f]
  const j = i * 3
  let x = a[j]
  let y = a[j + 1]
  let z = a[j + 2]
  if (f === F.SNOWFLAKE) {
    // spin in-plane, then tilt slightly about X
    const rx = x * ctx.snowCos - y * ctx.snowSin
    const ry = x * ctx.snowSin + y * ctx.snowCos
    x = rx
    y = ry * SNOW_COS - z * SNOW_SIN
    z = ry * SNOW_SIN + z * SNOW_COS
  } else if (f === F.FLOWER) {
    const heart = set.flowerHeart[i] === 1
    const s = heart ? 1 : 1 + 0.06 * ctx.breathe // petals breathe outward
    const yy = y * s
    const zz = z + (heart ? 0.5 * ctx.breathe : 0) // heart lifts toward camera
    x *= s
    y = yy * FLOWER_COS - zz * FLOWER_SIN
    z = yy * FLOWER_SIN + zz * FLOWER_COS
  }
  out.x = x
  out.y = y
  out.z = z
}
