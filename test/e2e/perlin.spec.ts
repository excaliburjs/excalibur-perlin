import { expect, test } from '@playwright/test';
import type { Frame, Page } from '@playwright/test';
import { EXAMPLE_CASES } from './manifest';

// Installed via page.addInitScript in every frame, before any page script runs. It does two
// things to make these otherwise wall-clock/RNG-driven pages reproducible:
//
// 1. Seeds Math.random with a fixed PRNG. The example's PerlinGenerator is explicitly
//    seeded (seed: 515), but excalibur itself falls back to raw Math.random() in a few
//    places (particle variance, camera shake) when no seeded ex.Random is supplied, which is
//    otherwise genuinely nondeterministic between runs.
// 2. Installs window.__exStep(steps, stepMs), which freezes ex.Engine's real-time clock
//    (every engine registers itself as window.___EXCALIBUR_DEVTOOL) the first time it's
//    called and, from then on, advances it a fixed number of simulated frames per call.
//    Deliberately drives the *same* Clock instance (via its protected update()) rather than
//    swapping in a fresh TestClock: swapping instances would silently drop anything already
//    scheduled via clock.schedule() on the original clock, e.g. the Loader's own 200ms
//    "show play button" delay (Loader.onUserAction), leaving those permanently stuck. Steps
//    are paced with a real rAF yield every few steps so the GPU gets a chance to actually
//    flush its draw calls - only the simulated elapsed time handed to the engine is
//    deterministic, not the real-world pacing between steps.
const INSTALL_DETERMINISM_HOOKS = `
  (function () {
    let seed = 0x2f6e2b1;
    Math.random = function () {
      seed |= 0;
      seed = (seed + 0x9e3779b9) | 0;
      let t = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  })();
  window.__exStep = async function (steps, stepMs) {
    const engine = window.___EXCALIBUR_DEVTOOL;
    if (!engine || !engine.clock) {
      return false;
    }
    if (!engine.clock.__isFrozen) {
      if (engine.clock.isRunning()) {
        engine.clock.stop();
      }
      engine.clock.__isFrozen = true;
      // Belt-and-suspenders: some engine paths (e.g. regaining window focus) call
      // clock.start() again, which would resume the real rAF loop and undo the freeze.
      engine.clock.start = function () {};
    }
    var YIELD_EVERY = 3;
    for (let i = 0; i < steps; i++) {
      engine.clock.update(stepMs || 16.6);
      if ((i + 1) % YIELD_EVERY === 0 || i === steps - 1) {
        await new Promise(function (resolve) {
          requestAnimationFrame(resolve);
        });
      }
    }
    return true;
  };
`;

async function stepEngineClock(frame: Frame, steps: number) {
  // window.__exStep is installed by page.addInitScript(INSTALL_DETERMINISM_HOOKS) before any
  // page script runs. Silently a no-op if called before the engine has constructed itself.
  await frame.evaluate((steps) => (window as any).__exStep?.(steps), steps);
}

async function findGameFrame(page: Page): Promise<Frame> {
  const mainFrame = page.mainFrame();
  // Generous: the example does a lot of synchronous perlin work at module scope (a 40-octave
  // 200x200 drawer.image()), which can pin the main thread on a cold vite start.
  await mainFrame.locator('canvas').first().waitFor({ state: 'visible', timeout: 30_000 });
  return mainFrame;
}

for (const exampleCase of EXAMPLE_CASES) {
  const file = exampleCase.file ?? 'index.html';
  const name = exampleCase.name ?? exampleCase.dir;
  const url = `/${[exampleCase.dir, file].filter(Boolean).join('/')}`;

  test(`${name} matches golden master`, async ({ page }) => {
    test.skip(!!exampleCase.skip, exampleCase.skip);

    await page.addInitScript(INSTALL_DETERMINISM_HOOKS);
    await page.goto(url);

    const frame = await findGameFrame(page);
    const canvas = frame.locator('canvas').first();

    // Freeze frame timing as early as possible - safe to do before the Loader's play button
    // ever appears since we drive the original clock instance in place (see comment above).
    await stepEngineClock(frame, 1);

    // Pages booted with a Loader draw a loading bar directly onto the canvas and show a real
    // DOM "Play game" button (#excalibur-play inside #excalibur-play-root) once ready, which
    // must be clicked before the game actually starts. excalibur 0.33's Loader has no
    // readiness attribute to poll (the `aria-busy` flag core's own sandbox spec looks for
    // does not exist in this version), so poll the button's own visibility instead: it is
    // created up-front with `display: none` and only flipped visible after the loader's
    // 200ms aesthetic delay - which is scheduled on the clock we just froze, so stepping the
    // clock is what actually drives it.
    const playRoot = frame.locator('#excalibur-play-root');
    const playButton = frame.locator('#excalibur-play-root button');
    let playButtonShown = false;
    for (let i = 0; i < 30 && !playButtonShown; i++) {
      playButtonShown = await playButton.isVisible();
      if (!playButtonShown) {
        await stepEngineClock(frame, 2);
      }
    }
    if (playButtonShown) {
      await playButton.click();
    }
    // We should never end up screenshotting the boot screen (Excalibur logo / loading bar /
    // play button) - fail loudly instead of silently capturing it. A page with no Loader
    // never creates the root element at all, and legitimately has no button to dismiss.
    if (await playRoot.count()) {
      expect(playButtonShown, 'loader play button should have appeared so it can be dismissed').toBe(true);
    }
    // hidePlayButton() sets display:none synchronously on click, so this never needs its own
    // step loop.
    await expect(playButton, 'loader play button should be dismissed before capturing').toBeHidden();

    if (exampleCase.action) {
      await exampleCase.action(page, canvas);
    }

    // Deterministically advance a handful more frames so the action's effects (and the
    // post-loader `game.start().then(...)` that actually adds the perlin actor) are
    // reflected in the render before capturing.
    await stepEngineClock(frame, exampleCase.settleSteps ?? 10);

    // Capture a single frame directly rather than using toHaveScreenshot's "wait until
    // stable" retry loop - this is a boot-and-shoot golden master, not a
    // wait-for-animation-to-settle one.
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot(`${name}.png`, { maxDiffPixelRatio: exampleCase.tolerance ?? 0.01 });
  });
}
