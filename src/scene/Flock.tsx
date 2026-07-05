import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { sceneState, F } from '../state/sceneState'
import { FormationSet, readTarget, KNIT_W, type ReadCtx } from './formations'
import { trigDrift } from './curl'
import { flockBridge } from './flockBridge'

/* palette baked with bloom-aware multipliers: only ice clears the 0.85
   luminance threshold, so Bloom catches the ice dots and nothing else */
const COL_WHITE = new THREE.Color('#E9EEF5').multiplyScalar(0.8)
const COL_STEEL = new THREE.Color('#8FA3B8').multiplyScalar(0.72)
const COL_ICE = new THREE.Color('#9BE8FF').multiplyScalar(1.5)

/* module-level scratch — the per-frame loop allocates ZERO objects */
const _a = { x: 0, y: 0, z: 0 }
const _b = { x: 0, y: 0, z: 0 }
const _n = { x: 0, y: 0, z: 0 }
const _ctx: ReadCtx = { snowCos: 1, snowSin: 0, breathe: 0 }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** soft radial-gradient circle sprite, generated once */
function makeSprite() {
  const s = 64
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const c = cv.getContext('2d')!
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  // tight core + soft edge → clean fine point rather than a fuzzy blob
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.32, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Flock({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const nIce = Math.round(count * 0.05)
  const nSteel = Math.round(count * 0.1)
  const set = useMemo(() => new FormationSet(count, nIce, nSteel), [count, nIce, nSteel])

  const sprite = useMemo(makeSprite, [])
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: sprite },
        uScale: { value: 14 },
        uFogNear: { value: 9 },
        uFogFar: { value: 22 },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vFog;
        uniform float uScale;
        uniform float uFogNear;
        uniform float uFogFar;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float dist = -mv.z;
          vFog = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);
          gl_PointSize = size * uScale / max(dist, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vFog;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          if (t.a < 0.02) discard;
          gl_FragColor = vec4(vColor, t.a * vFog);
        }
      `,
    })
  }, [sprite])

  // per-dot static data + geometry attributes
  const { geometry, current, seeds, f1, f2, axis, swirlK } = useMemo(() => {
    const current = new Float32Array(count * 3)
    current.set(set.slots[F.SCATTER])
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const seeds = new Float32Array(count)
    const f1 = new Float32Array(count)
    const f2 = new Float32Array(count)
    const axis = new Float32Array(count * 3)
    const swirlK = new Float32Array(count)
    const steelEnd = nIce + nSteel
    for (let i = 0; i < count; i++) {
      const s1 = (i * 0.6180339887) % 1
      const s2 = (i * 0.7548776662) % 1
      const s3 = (i * 0.5698402909) % 1
      seeds[i] = s1
      f1[i] = 0.25 + s2 * 0.5
      f2[i] = 0.18 + s3 * 0.4
      swirlK[i] = (s3 - 0.5) * 0.56
      const az = s1 * 2 - 1
      const ph = s2 * Math.PI * 2
      const rr = Math.sqrt(1 - az * az)
      axis[i * 3] = rr * Math.cos(ph)
      axis[i * 3 + 1] = rr * Math.sin(ph)
      axis[i * 3 + 2] = az
      // color classes by contiguous index range (ice/steel routed to glow
      // regions by the formation builders; spread by perm() elsewhere)
      let col = COL_WHITE
      let sz = 0.8 + s2 * 1.0 // 0.8 – 1.8, minimal fine grain
      if (i < nIce) {
        col = COL_ICE
        sz *= 1.5
      } else if (i < steelEnd) {
        col = COL_STEEL
      }
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
      sizes[i] = sz
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(current, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return { geometry, current, seeds, f1, f2, axis, swirlK }
  }, [set, count, nIce, nSteel])

  /* bridge + DOM-anchored formations */
  useEffect(() => {
    const refresh = () => set.setFrameFromDom()
    refresh()
    flockBridge.refreshAnchors = refresh
    flockBridge.rebuildWord = () => set.rebuildWord()
    flockBridge.capture = () => set.captureFrom(current)
    window.addEventListener('resize', refresh)
    return () => {
      window.removeEventListener('resize', refresh)
      delete flockBridge.refreshAnchors
      delete flockBridge.rebuildWord
      delete flockBridge.capture
    }
  }, [set, current])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state, dt) => {
    const ss = sceneState
    const d = Math.min(dt, 1 / 20)
    const t = state.clock.elapsedTime

    ss.turbVel *= Math.pow(0.92, d * 60)
    const turb = Math.min(ss.turbBase + ss.turbVel, 2)
    const driftAmp = 0.05 + turb * 0.5

    const sp = t * 0.03 // snowflake spin
    _ctx.snowCos = Math.cos(sp)
    _ctx.snowSin = Math.sin(sp)
    _ctx.breathe = ss.breathe

    const fA = ss.formationA
    const fB = ss.formationB
    const blend = ss.blend
    const knitting = blend > 0.0001 && blend < 0.9999
    const delB = set.delays[fB]
    const k = 1 - Math.pow(0.94, d * 60)

    const pts = pointsRef.current
    if (!pts) return

    for (let i = 0; i < count; i++) {
      const j = i * 3
      const cx = current[j]
      const cy = current[j + 1]
      const cz = current[j + 2]

      readTarget(set, fA, i, _ctx, _a)
      readTarget(set, fB, i, _ctx, _b)

      let tx: number
      let ty: number
      let tz: number
      if (knitting) {
        // staggered knit: per-dot delay, smoothstep travel, back.out settle,
        // perpendicular swirl that arcs the path (zero at both ends)
        const raw = clamp01((blend - delB[i]) / KNIT_W)
        const sm = raw * raw * (3 - 2 * raw)
        const u = sm - 1
        const bk = 1 + 2 * u * u * u + u * u
        const dx = _b.x - _a.x
        const dy = _b.y - _a.y
        const dz = _b.z - _a.z
        const w = swirlK[i] * sm * (1 - sm) * 4
        tx = _a.x + dx * bk + (dy * axis[j + 2] - dz * axis[j + 1]) * w
        ty = _a.y + dy * bk + (dz * axis[j] - dx * axis[j + 2]) * w
        tz = _a.z + dz * bk + (dx * axis[j + 1] - dy * axis[j]) * w
      } else {
        tx = _a.x + (_b.x - _a.x) * blend
        ty = _a.y + (_b.y - _a.y) * blend
        tz = _a.z + (_b.z - _a.z) * blend
      }

      // cheap trig drift, scaled by turbulence
      trigDrift(seeds[i], f1[i], f2[i], t, _n)
      tx += _n.x * driftAmp
      ty += _n.y * driftAmp
      tz += _n.z * driftAmp

      current[j] = cx + (tx - cx) * k
      current[j + 1] = cy + (ty - cy) * k
      current[j + 2] = cz + (tz - cz) * k
    }

    geometry.attributes.position.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}
