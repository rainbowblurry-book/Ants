/**
 * botParams(level) (DR-063 curve, DR-064 floor, DR-066 think time, PLAN §9).
 * STUB from the orchestrator: cap values at every level. The error-model work
 * replaces the body; the signature is the contract.
 */
import type { BotParams } from './types.ts';

export interface BotParamOpts {
  /** Boss: effective level min(100, L + 5), true wind (k = b = 0). */
  boss?: boolean;
  /** DR-067 rattled: σ_p, σ_a and B × 1.5 (L1–20 only). */
  rattled?: boolean;
}

export function botParams(level: number, opts: BotParamOpts = {}): BotParams {
  return {
    level,
    sigmaP: 0.0135,
    sigmaA: 0.8,
    sigmaW: 0.05,
    k: 0,
    b: 0,
    B: 0,
    pBf: 0,
    thinkS: 0.8,
    boss: opts.boss ?? false,
  };
}
