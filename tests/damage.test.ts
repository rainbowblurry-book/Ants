import { describe, expect, it } from 'vitest';
import {
  applyBlast,
  type BlastAnt,
  blastDamage,
  fallDamage,
  knockbackSpeed,
  knockbackVelocity,
  nonLethal,
} from '../src/sim/damage.ts';
import { Material } from '../src/sim/terrain.ts';
import { sinDeci } from '../src/sim/trig.ts';

const M = Material;
/** An ant with its feet at (500, 400): hurtbox centre (500, 378), top of capsule y 362. */
const ANT = { x: 500, y: 400 };
/** Blast straight above the capsule at distance d from its surface. */
const above = (d: number) => ({ x: 500, y: 362 - d });

const dmgAt = (base: number, r: number, d: number, direct = false, self = false) => {
  const b = above(d);
  return blastDamage(base, r, b.x, b.y, ANT, direct, self);
};

describe('damage falloff (DR-035, J1)', () => {
  it('is full at the hurtbox surface and inside it', () => {
    expect(dmgAt(30, 28, 0)).toBe(30);
    expect(blastDamage(30, 28, 500, 378, ANT, false, false)).toBe(30); // centre
    expect(blastDamage(30, 28, 512, 380, ANT, false, false)).toBe(30); // on the segment
  });

  it('falls linearly to 25% at the edge, rounded, at least 1', () => {
    expect(dmgAt(30, 28, 14)).toBe(Math.round(30 * (1 - 0.75 * 0.5))); // 19
    expect(dmgAt(45, 48, 24)).toBe(Math.round(45 * 0.625)); // 28
    expect(dmgAt(30, 28, 27.99)).toBe(8);
    expect(dmgAt(30, 28, 28)).toBe(0);
    expect(dmgAt(30, 28, 40)).toBe(0);
    expect(dmgAt(2, 28, 27)).toBe(1);
  });

  it('measures distance to the capsule segment minus 16 (J1), not a circle', () => {
    // 10 px beyond the end of the segment, level with it: d = 28 − 16 = 12... from the side.
    const side = blastDamage(30, 28, 500 + 12 + 16 + 12, 378, ANT, false, false);
    expect(side).toBe(dmgAt(30, 28, 12));
  });
});

describe('direct hits, cap, self-damage (DR-035)', () => {
  it('a direct hit is ×1.2 (Spitter 36, Dewdrop 54, puff 14, Grub 48, Roller 46, Plop 7)', () => {
    expect(dmgAt(30, 28, 0, true)).toBe(36);
    expect(dmgAt(45, 48, 0, true)).toBe(54);
    expect(dmgAt(12, 18, 0, true)).toBe(14);
    expect(dmgAt(40, 30, 0, true)).toBe(48);
    expect(dmgAt(38, 40, 0, true)).toBe(46);
    expect(dmgAt(6, 34, 0, true)).toBe(7);
  });

  const ant = (hp = 100, team = 0): BlastAnt => ({ x: 500, y: 400, hp, team, active: true });

  it('caps damage at 60 per ant per shot', () => {
    const ants = [ant()];
    const dealt = [0];
    const b = { x: 500, y: 378, r: 48, base: 45, direct: 0, shooter: -1 };
    expect(applyBlast(b, ants, dealt)[0]?.dmg).toBe(54);
    expect(applyBlast(b, ants, dealt)[0]?.dmg).toBe(6);
    expect(applyBlast(b, ants, dealt)).toEqual([]);
    expect(ants[0]?.hp).toBe(40);
    expect(dealt[0]).toBe(60);
  });

  it('five puffs on one ant stop at 60', () => {
    const ants = [ant()];
    const dealt = [0];
    let total = 0;
    for (let i = 0; i < 5; i++) {
      for (const h of applyBlast(
        { x: 500, y: 378, r: 18, base: 12, direct: 0, shooter: -1 },
        ants,
        dealt,
      ))
        total += h.dmg;
    }
    expect(total).toBe(60); // 5 × 14 = 70, capped
  });

  it('self-damage is ×0.5 and never lethal; friendly fire is full', () => {
    const shooter = ant(10, 0);
    const mate = { ...ant(100, 0), x: 540 };
    const ants = [shooter, mate];
    const hits = applyBlast(
      { x: 500, y: 378, r: 48, base: 45, direct: 0, shooter: 0 },
      ants,
      [0, 0],
    );
    expect(shooter.hp).toBe(1); // 27 self-damage, floored at 1
    expect(hits.find((h) => h.ant === 0)?.dmg).toBe(9);
    expect(mate.hp).toBeLessThan(100);
    expect(dmgAt(45, 48, 0, true, true)).toBe(27);
  });

  it('a knocked-out ant is not hit again', () => {
    const ants = [{ ...ant(), active: false }];
    expect(
      applyBlast({ x: 500, y: 378, r: 48, base: 45, direct: -1, shooter: -1 }, ants, [0]),
    ).toEqual([]);
  });
});

describe('knockback (DR-035)', () => {
  it('speed is min(600, 8 × dmg)', () => {
    expect(knockbackSpeed(54)).toBe(432);
    expect(knockbackSpeed(20)).toBe(160);
    expect(knockbackSpeed(90)).toBe(600);
  });

  it('points away from the blast, at least 25° upward', () => {
    // Blast level with the hurtbox centre, to the left: launched right at exactly 25°.
    const v = knockbackVelocity(450, 378, ANT, 54);
    expect(Math.sqrt(v.x * v.x + v.y * v.y)).toBeCloseTo(432, 9);
    expect(v.x).toBeGreaterThan(0);
    expect(-v.y / 432).toBeCloseTo(sinDeci(250), 12);
    // Blast below and to the right: launched up-left, steeper than 25°.
    const w = knockbackVelocity(530, 420, ANT, 20);
    expect(w.x).toBeLessThan(0);
    expect(w.y).toBeLessThan(0);
    expect(-w.y / 160).toBeGreaterThan(sinDeci(250));
    expect(knockbackVelocity(500, 378, ANT, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('fall damage (DR-026, J3)', () => {
  it('is 0 up to 90 px, then min(20, ceil((h − 90) / 9))', () => {
    expect(fallDamage(90, M.SOIL)).toBe(0);
    expect(fallDamage(91, M.SOIL)).toBe(1);
    expect(fallDamage(99, M.SOIL)).toBe(1);
    expect(fallDamage(100, M.SOIL)).toBe(2);
    expect(fallDamage(200, M.SOIL)).toBe(13);
    expect(fallDamage(270, M.SOIL)).toBe(20);
    expect(fallDamage(5000, M.HARD)).toBe(20);
  });

  it('is halved on SOFT and 0 on BOUNCY or WATER', () => {
    expect(fallDamage(270, M.SOFT)).toBe(10);
    expect(fallDamage(200, M.SOFT)).toBe(7); // 13 / 2 = 6.5, rounded like DR-035
    expect(fallDamage(400, M.BOUNCY)).toBe(0);
    expect(fallDamage(400, M.WATER)).toBe(0);
  });

  it('never takes an ant below 1 HP', () => {
    expect(nonLethal(5, 20)).toBe(1);
    expect(nonLethal(1, 20)).toBe(1);
    expect(nonLethal(50, 20)).toBe(30);
  });
});
