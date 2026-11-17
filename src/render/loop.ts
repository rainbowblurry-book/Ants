/**
 * Fixed-step accumulator (PLAN §1, DR-010).
 *
 * SIM_DT = 1/60 s. Frame delta is clamped to 250 ms, at most 5 steps run per
 * frame, and time left over beyond that is dropped. `alpha` is how far the
 * render is between the last two sim states, for interpolation. The scene
 * stops feeding time while the tab is hidden or the sim is held (hit-stop,
 * Pause).
 */
export const SIM_DT_MS = 1000 / 60;
export const MAX_FRAME_MS = 250;
export const MAX_STEPS = 5;

export class FixedStep {
  private acc = 0;

  /** Returns how many sim steps to run now and the interpolation alpha. */
  advance(deltaMs: number): { steps: number; alpha: number } {
    this.acc += Math.min(MAX_FRAME_MS, Math.max(0, deltaMs));
    let steps = Math.floor(this.acc / SIM_DT_MS);
    if (steps > MAX_STEPS) {
      steps = MAX_STEPS;
      this.acc = 0;
    } else {
      this.acc -= steps * SIM_DT_MS;
    }
    return { steps, alpha: this.acc / SIM_DT_MS };
  }

  reset(): void {
    this.acc = 0;
  }
}
