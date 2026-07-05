import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Stars } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { sceneState, CAM, FOV } from '../state/sceneState'
import { Flock } from './Flock'

/**
 * A skydome of very dark cold blues with two soft glows drifting slowly —
 * gives the void depth and quiet life without ever getting bright enough to
 * trip the bloom threshold. Rendered behind everything, unlit, no fog.
 */
function Backdrop() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vDir;
          void main() {
            vec3 night = vec3(0.019, 0.027, 0.047);
            vec2 p = vDir.xy;
            // two soft cold glows drifting on slow, out-of-phase orbits
            vec2 c1 = vec2(sin(uTime * 0.045) * 0.35 - 0.28, cos(uTime * 0.037) * 0.18 + 0.24);
            vec2 c2 = vec2(cos(uTime * 0.032) * 0.30 + 0.34, sin(uTime * 0.041) * 0.20 - 0.30);
            float g1 = smoothstep(0.95, 0.0, distance(p, c1));
            float g2 = smoothstep(1.05, 0.0, distance(p, c2));
            // a faint breathing lift so it never sits perfectly still
            float pulse = 0.85 + 0.15 * sin(uTime * 0.12);
            vec3 col = night
              + vec3(0.055, 0.10, 0.15) * g1 * g1 * 0.55 * pulse
              + vec3(0.035, 0.07, 0.11) * g2 * g2 * 0.5;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )
  useFrame((_, dt) => {
    material.uniforms.uTime.value += Math.min(dt, 1 / 20)
  })
  return (
    <mesh scale={42} renderOrder={-1} frustumCulled={false} material={material}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}

/** the star field, slowly turning — parallax life far behind the flock */
function StarField() {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const d = Math.min(dt, 1 / 20)
    g.rotation.y += d * 0.006
    g.rotation.x += d * 0.002
  })
  return (
    <group ref={ref}>
      <Stars radius={70} depth={30} count={650} factor={2.4} saturation={0} fade speed={0.6} />
    </group>
  )
}

/** camera follows sceneState.cam — the master timeline never touches the camera directly */
function CameraRig() {
  const camera = useThree((s) => s.camera)
  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.9, Math.min(dt, 1 / 20) * 60)
    const c = sceneState.cam
    camera.position.x += (c.x - camera.position.x) * k
    camera.position.y += (c.y - camera.position.y) * k
    camera.position.z += (c.z - camera.position.z) * k
    camera.lookAt(0, 0, 0)
  })
  return null
}

function useFlockCount() {
  const pick = () =>
    window.innerWidth < 640 ? 3000 : window.innerWidth < 1024 ? 5000 : 10000
  const [count, setCount] = useState(pick)
  useEffect(() => {
    const onResize = () => setCount(pick())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return count
}

export function Scene({
  onContextLost,
  onContextRestored,
}: {
  onContextLost: () => void
  onContextRestored: () => void
}) {
  const count = useFlockCount()
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 1.75))
  const initialCam = useMemo(
    () => new THREE.Vector3(CAM.heroStart.x, CAM.heroStart.y, CAM.heroStart.z),
    [],
  )

  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: FOV, position: initialCam, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        const el = gl.domElement
        el.addEventListener('webglcontextlost', (e) => {
          e.preventDefault() // Law 5 — never trap the user
          onContextLost()
        })
        el.addEventListener('webglcontextrestored', () => onContextRestored())
      }}
    >
      <color attach="background" args={['#05070C']} />
      <fog attach="fog" args={['#05070C', 9, 20]} />
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.35))} />
      <Backdrop />
      <StarField />
      <CameraRig />
      <Flock key={count} count={count} />
      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.85} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
