/**
 * Motion tokens and reduced motion (DR-084, J35, UI.md §1.5).
 *
 * The Settings choice (Auto / On / Off, DR-170) arrives in stage 7. Until then
 * the mode is Auto, which follows `prefers-reduced-motion`.
 */
import { tokens } from './theme.ts';

export type ReducedMotionSetting = 'auto' | 'on' | 'off';

let setting: ReducedMotionSetting = 'auto';

export function setReducedMotion(s: ReducedMotionSetting): void {
  setting = s;
}

export function reducedMotion(): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

const R = tokens.motion.reduced;

/** A duration with the reduced-motion cap applied. */
export function motionMs(ms: number, reduced = reducedMotion()): number {
  return reduced ? Math.min(ms, R.maxMs) : ms;
}

/** An easing with the reduced-motion rule applied (no overshoot). */
export function motionEase(ease: string, reduced = reducedMotion()): string {
  return reduced ? R.ease : ease;
}

/** A translate with the reduced-motion cap applied. */
export function motionPx(px: number, reduced = reducedMotion()): number {
  if (!reduced) return px;
  return Math.sign(px) * Math.min(Math.abs(px), R.maxTranslate);
}
