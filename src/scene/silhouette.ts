/**
 * The shape pipeline (Change §2): every representational formation is a
 * silhouette DRAWN on a 512² canvas with explicit 2D strokes/fills, then
 * sampled into weighted-random dot targets (denser where brighter). This
 * replaces the parametric 3D lofts that produced mushy shapes.
 */

const S = 512
const C = S / 2

/** draw one six-fold snowflake arm pointing up, stamped 6× at 60° (Change §3) */
export function drawSnowflake(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const spineLen = 200
  const branches: Array<[number, number]> = [
    [0.38, 0.42],
    [0.6, 0.4],
    [0.8, 0.34],
  ]

  const drawArm = () => {
    // main spine, tapering 6 → 2px (drawn as two overlaid widths)
    ctx.lineWidth = 5
    line(ctx, 0, 0, 0, -spineLen)
    ctx.lineWidth = 2.5
    line(ctx, 0, -spineLen * 0.5, 0, -spineLen)

    for (const [at, frac] of branches) {
      const y = -spineLen * at
      const rem = spineLen * (1 - at)
      const bl = rem * frac
      for (const sign of [-1, 1] as const) {
        // 60° to the spine (spine points up = -Y)
        const dx = Math.sin((Math.PI / 3) * sign)
        const dy = -Math.cos(Math.PI / 3)
        const ex = dx * bl
        const ey = y + dy * bl
        ctx.lineWidth = 3
        line(ctx, 0, y, ex, ey)
        // one sub-tick near the branch end
        const tx = dx * bl * 0.65
        const ty = y + dy * bl * 0.65
        const sub = bl * 0.32
        ctx.lineWidth = 1.6
        line(
          ctx,
          tx,
          ty,
          tx + Math.sin((Math.PI / 3) * sign + (Math.PI / 3) * sign) * sub,
          ty - Math.cos(Math.PI / 3) * sub,
        )
      }
    }
  }

  ctx.save()
  ctx.translate(C, C)
  // hexagonal heart at the origin
  ctx.lineWidth = 3
  hexagon(ctx, 14)
  for (let k = 0; k < 6; k++) {
    ctx.save()
    ctx.rotate((k * Math.PI) / 3)
    drawArm()
    ctx.restore()
  }
  ctx.restore()
}

/** draw a rose-curve flower r(θ)=R·cos(5θ), FILLED, + inner layer + heart (§4) */
export function drawFlower(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = '#fff'

  const rose = (R: number, rot: number) => {
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate(rot)
    ctx.beginPath()
    const STEP = 0.004
    for (let a = 0; a <= Math.PI * 2 + STEP; a += STEP) {
      const r = R * Math.cos(5 * a)
      const x = r * Math.cos(a)
      const y = r * Math.sin(a)
      if (a === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.fill()
    ctx.restore()
  }

  rose(190, 0)
  rose(190 * 0.55, Math.PI / 5) // inner petal layer, rotated 36°
  // filled center disc — the glowing heart
  ctx.beginPath()
  ctx.arc(C, C, 34, 0, Math.PI * 2)
  ctx.fill()
}

/** draw the word "craft" in Newsreader italic (§2 — same pipeline) */
export function drawWord(text: string) {
  return (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#fff'
    ctx.font = 'italic 300 190px "Newsreader", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, C, C + 12)
  }
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function hexagon(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
}

/**
 * A drawn silhouette, pre-scanned into lit-pixel arrays with per-pixel
 * brightness and normalized radius, ready for weighted sampling.
 */
export class Silhouette {
  private readonly xs: Float32Array
  private readonly ys: Float32Array
  private readonly rs: Float32Array // normalized radius 0..1
  private readonly bs: Float32Array // brightness 0..1
  private readonly n: number
  private readonly scale: number
  private readonly cum: Float32Array // scratch cumulative-weight buffer

  constructor(draw: (ctx: CanvasRenderingContext2D) => void, scale: number) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = S
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    draw(ctx)
    const data = ctx.getImageData(0, 0, S, S).data
    const xs: number[] = []
    const ys: number[] = []
    const rs: number[] = []
    const bs: number[] = []
    let maxR = 1e-6
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const b = data[(py * S + px) * 4] // red channel (white on black)
        if (b > 24) {
          const nx = (px - C) / C
          const ny = -(py - C) / C
          const r = Math.hypot(nx, ny)
          xs.push(nx)
          ys.push(ny)
          rs.push(r)
          bs.push(b / 255)
          if (r > maxR) maxR = r
        }
      }
    }
    for (let k = 0; k < rs.length; k++) rs[k] /= maxR
    this.xs = Float32Array.from(xs)
    this.ys = Float32Array.from(ys)
    this.rs = Float32Array.from(rs)
    this.bs = Float32Array.from(bs)
    this.n = xs.length
    this.scale = scale
    this.cum = new Float32Array(this.n)
  }

  /**
   * Pick `count` lit pixels, weighted by brightness × a radial preference.
   * radialBias > 0 favors the rim (tips), < 0 favors the center (heart),
   * 0 = brightness only. Calls `cb(worldX, worldY, rNorm, i)` for each.
   */
  sample(
    count: number,
    radialBias: number,
    rnd: () => number,
    cb: (x: number, y: number, r: number, i: number) => void,
  ) {
    const { xs, ys, rs, bs, cum, n, scale } = this
    let acc = 0
    for (let k = 0; k < n; k++) {
      const rn = rs[k]
      const rf =
        radialBias >= 0
          ? Math.pow(rn + 0.02, radialBias)
          : Math.pow(1 - rn + 0.02, -radialBias)
      acc += bs[k] * rf
      cum[k] = acc
    }
    for (let i = 0; i < count; i++) {
      const target = rnd() * acc
      let lo = 0
      let hi = n - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cum[mid] < target) lo = mid + 1
        else hi = mid
      }
      cb(xs[lo] * scale, ys[lo] * scale, rs[lo], i)
    }
  }
}
