import gsap from 'gsap'
import { sceneState, F, type FormationId } from '../state/sceneState'
import { flockBridge } from '../scene/flockBridge'

/**
 * Time-based formation morph (Law 6 — small screens are state machines).
 * Snapshots the live positions into the CAPTURE slot so an interrupted
 * morph restarts from exactly where the flock is, then blends to the
 * destination. `overwrite: 'auto'` kills any in-flight blend tween.
 */
export function morphTo(f: FormationId, duration = 1.1) {
  flockBridge.capture?.()
  sceneState.formationA = F.CAPTURE
  sceneState.formationB = f
  sceneState.blend = 0
  gsap.to(sceneState, { blend: 1, duration, ease: 'power2.inOut', overwrite: 'auto' })
}
