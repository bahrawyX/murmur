/**
 * Imperative bridge between the flock (inside the Canvas) and the scroll
 * orchestration (outside it). The Flock component fills these in on mount.
 */
export const flockBridge: {
  /** snapshot current instance positions into the CAPTURE formation slot */
  capture?: () => void
  /** re-sample the WORD formation (called after document.fonts.ready) */
  rebuildWord?: () => void
  /** recompute the FRAME anchor from the work card's projected bounds */
  refreshAnchors?: () => void
} = {}
