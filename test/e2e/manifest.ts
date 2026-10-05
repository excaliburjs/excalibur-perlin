import type { Locator, Page } from '@playwright/test';

export interface ExampleCase {
  /** Directory under example/ that holds the page ('' for the example root itself) */
  dir: string;
  /** HTML file within the directory, defaults to 'index.html' */
  file?: string;
  /** Snapshot name, defaults to `dir` (set explicitly for directories with multiple pages) */
  name?: string;
  /** Optional interaction to run (scripted from the page's own on-page directions) before the screenshot */
  action?: (page: Page, canvas: Locator) => Promise<void>;
  /** If set, the case is skipped with this reason instead of run */
  skip?: string;
  /**
   * Overrides the default maxDiffPixelRatio (see perlin.spec.ts). Use sparingly - only for
   * scenes where the small residual drift from stepEngineClock's one-real-frame boot window
   * compounds into a materially different frame, not as a general flakiness workaround.
   */
  tolerance?: number;
  /**
   * Overrides the default number of post-action clock-steps (see perlin.spec.ts) before
   * capturing. Use for scenes whose documented visual state only appears after a scripted
   * delay longer than the default ~10 steps (~166ms simulated) covers.
   */
  settleSteps?: number;
}

export const EXAMPLE_CASES: ExampleCase[] = [
  // example/index.html: an ex.Canvas covering the 800x600 engine canvas painted by
  // PerlinDrawer2D, plus a raw <img> of drawer.image(200, 200) appended under it. Both come
  // from a PerlinGenerator explicitly seeded with 515, so the noise itself is reproducible
  // without any extra determinism plumbing.
  { dir: '', name: 'perlin' }
];
