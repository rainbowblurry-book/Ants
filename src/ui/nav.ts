/**
 * Back navigation (DR-090, J36, J47, UI.md §3).
 *
 * Every back source (the UI back button, browser or Android back, Esc) ends
 * in `goBack()`. The topmost layer closes first (HTML dialog, confirm, level
 * card, Dot card, Pause), else the scene rule runs. `history.pushState` keeps
 * depth only (the URL never changes). The UI back button calls
 * `history.back()`, so it takes the same popstate path as the browser.
 *
 * Scenes arrive in stage 7; here Nav is the shared mechanism with a fake-able
 * history so node tests can drive it.
 */
export type SceneKey =
  | 'boot'
  | 'preload'
  | 'title'
  | 'levelSelect'
  | 'twoPlayerSetup'
  | 'comic'
  | 'battle'
  | 'results';

/** What the scene rule asks the game to do (DR-090 table). */
export type NavAction =
  | { kind: 'ignore' }
  | { kind: 'leave' }
  | { kind: 'goto'; scene: SceneKey }
  | { kind: 'skipComic' }
  | { kind: 'openPause' }
  | { kind: 'resultsExit' };

export function sceneRule(scene: SceneKey): NavAction {
  switch (scene) {
    case 'boot':
    case 'preload':
      return { kind: 'ignore' };
    case 'title':
      return { kind: 'leave' };
    case 'levelSelect':
    case 'twoPlayerSetup':
      return { kind: 'goto', scene: 'title' };
    case 'comic':
      return { kind: 'skipComic' };
    case 'battle':
      return { kind: 'openPause' };
    case 'results':
      // To LevelSelect (campaign) or 2P Setup (versus): the Results scene decides.
      return { kind: 'resultsExit' };
  }
}

/** Scenes that keep the player here: a back press re-pushes the history entry. */
const REPUSH: ReadonlySet<NavAction['kind']> = new Set(['ignore', 'openPause']);

export interface HistoryLike {
  pushState(state: unknown, title: string): void;
  replaceState(state: unknown, title: string): void;
  back(): void;
}

interface Layer {
  id: string;
  close(): void;
}

export type BackSource = 'ui' | 'browser' | 'esc';

export class Nav {
  private layers: Layer[] = [];
  private depth = 0;
  scene: SceneKey = 'boot';

  constructor(
    private readonly history: HistoryLike,
    private readonly act: (a: NavAction) => void,
  ) {}

  /** Installs the popstate listener (browser only). */
  attach(win: Window): () => void {
    const onPop = (e: PopStateEvent) => this.onPopState(e.state);
    win.addEventListener('popstate', onPop);
    this.history.replaceState({ ants: true, depth: 0 }, '');
    return () => win.removeEventListener('popstate', onPop);
  }

  /** A forward step to a new screen: one history entry. */
  forward(scene: SceneKey): void {
    this.depth++;
    this.history.pushState({ ants: true, depth: this.depth }, '');
    this.scene = scene;
  }

  /** Battle, Results and Comic exits replace, so history never holds a finished match. */
  replace(scene: SceneKey): void {
    this.history.replaceState({ ants: true, depth: this.depth }, '');
    this.scene = scene;
  }

  pushLayer(id: string, close: () => void): void {
    this.layers.push({ id, close });
  }

  removeLayer(id: string): void {
    this.layers = this.layers.filter((l) => l.id !== id);
  }

  get topLayer(): string | null {
    return this.layers[this.layers.length - 1]?.id ?? null;
  }

  /** The UI back button: one code path, through popstate. */
  backButton(): void {
    this.history.back();
  }

  onPopState(state: unknown): void {
    const d = (state as { depth?: number } | null)?.depth ?? 0;
    // Forward navigation (depth too high) is ignored and undone.
    if (d > this.depth) {
      this.history.back();
      return;
    }
    this.depth = d;
    this.goBack('browser');
  }

  /** Runs one back step. Returns what was done. */
  goBack(source: BackSource): NavAction | { kind: 'closeLayer'; id: string } {
    const top = this.layers.pop();
    if (top) {
      top.close();
      if (source === 'browser') this.repush();
      return { kind: 'closeLayer', id: top.id };
    }
    const action = sceneRule(this.scene);
    if (action.kind === 'leave') {
      // Title: Esc does nothing; the browser has already left this entry.
      if (source !== 'browser') return { kind: 'ignore' };
      return action;
    }
    if (source === 'browser' && REPUSH.has(action.kind)) this.repush();
    this.act(action);
    return action;
  }

  private repush(): void {
    this.depth++;
    this.history.pushState({ ants: true, depth: this.depth }, '');
  }
}
