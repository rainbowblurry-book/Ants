/**
 * The notice queue (DR-131): one slot at 240,184,480,72 for banners, toasts
 * and prompts. Priority: phase > telegraph > sudden death > pickup > info.
 * A higher notice preempts the one showing once it has shown for 600 ms. The
 * queue holds 3; duplicates collapse. Notices are held during the 2P gate
 * and Pause. Pure, driven by a ms clock.
 */
export type NoticePriority = 'phase' | 'telegraph' | 'suddenDeath' | 'pickup' | 'info';
export type NoticeKind = 'banner' | 'toast';

export const PRIORITY_RANK: Record<NoticePriority, number> = {
  phase: 5,
  telegraph: 4,
  suddenDeath: 3,
  pickup: 2,
  info: 1,
};

export const NOTICE = {
  queue: 3,
  preemptAfterMs: 600,
  toastMs: 1600,
  telegraphMs: 1200,
  phaseMs: 1600,
} as const;

export interface Notice {
  text: string;
  priority: NoticePriority;
  kind: NoticeKind;
  /** How long it shows once started. */
  ms: number;
}

export interface Showing extends Notice {
  since: number;
}

export class NoticeQueue {
  private queue: Notice[] = [];
  current: Showing | null = null;

  push(n: Notice): void {
    const same = (o: Notice) => o.text === n.text && o.priority === n.priority;
    if ((this.current && same(this.current)) || this.queue.some(same)) return;
    this.queue.push(n);
    // Highest priority first; equal priorities keep arrival order.
    this.queue.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    if (this.queue.length > NOTICE.queue) this.queue.length = NOTICE.queue;
  }

  /** Advances the queue. While `held` nothing starts or ends. */
  update(now: number, held: boolean): Showing | null {
    if (held) return this.current;
    const cur = this.current;
    if (cur && now - cur.since >= cur.ms) this.current = null;
    const next = this.queue[0];
    if (next) {
      if (!this.current) {
        this.queue.shift();
        this.current = { ...next, since: now };
      } else if (
        PRIORITY_RANK[next.priority] > PRIORITY_RANK[this.current.priority] &&
        now - this.current.since >= NOTICE.preemptAfterMs
      ) {
        this.queue.shift();
        this.current = { ...next, since: now };
      }
    }
    return this.current;
  }

  get pending(): readonly Notice[] {
    return this.queue;
  }
}
