import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { DEMO_TIMING, demoStepAt } from "./demo-timeline.js";
test("video stages follow playback time, including replay and the reduced-motion final state", () => {
  for (const [time, step] of [
    [0, 0],
    [DEMO_TIMING.redact, 1],
    [DEMO_TIMING.frame, 2],
    [DEMO_TIMING.copy, 3],
    [0, 0],
    [Infinity, 3],
  ])
    assert.equal(demoStepAt(time), step);
});
test("production page ships playable local media instead of a blocked iframe", () => {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: import.meta.dirname,
    stdio: "pipe",
  });
  const page = readFileSync(
    new URL("./dist/index.html", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(page, /<iframe\b/i);
  const cssPath = page.match(/href="([^"]+\.css)"/)?.[1];
  const css = readFileSync(
    new URL(`./dist${cssPath}`, import.meta.url),
    "utf8",
  );
  const fontPath = css.match(/url\(([^)]+\.ttf)\)/)?.[1];
  assert.ok(fontPath, "compiled CSS references the shared bundled font");
  assert.ok(
    statSync(new URL(`./dist${fontPath}`, import.meta.url)).size > 1000,
  );
  const video = page.match(/<video\b[^>]+>/i)?.[0];
  assert.ok(video, "compiled page contains the demonstration video");
  for (const attribute of ["src", "poster"]) {
    const path = video.match(new RegExp(`${attribute}="([^"]+)"`))?.[1];
    assert.ok(path?.startsWith("/demo/"));
    const asset = readFileSync(new URL(`./dist${path}`, import.meta.url));
    assert.ok(statSync(new URL(`./dist${path}`, import.meta.url)).size > 1000);
    if (attribute === "src")
      assert.equal(asset.subarray(4, 8).toString(), "ftyp", "MP4 signature");
    else
      assert.deepEqual(
        [...asset.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
  }
});

function playbackFixture() {
  const target = (properties = {}) => {
    const handlers = new Map();
    return {
      ...properties,
      addEventListener(name, handler) {
        const entries = handlers.get(name) || [];
        handlers.set(name, [...entries, handler]);
      },
      emit(name) {
        for (const handler of handlers.get(name) || []) handler();
      },
    };
  };
  const pause = target({
    disabled: false,
    setAttribute(name, value) {
      this[name] = value;
    },
  });
  const replay = target();
  const steps = Array.from({ length: 4 }, () => {
    const step = { active: false };
    step.classList = {
      toggle: (_, value) => {
        step.active = value;
      },
    };
    return step;
  });
  let rejectPlay;
  const pendingPlay = new Promise((_, reject) => {
    rejectPlay = reject;
  });
  let attempts = 0;
  const video = target({
    paused: true,
    currentTime: 5,
    attributes: { src: "/demo/cloakshot.mp4" },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    pause() {
      this.paused = true;
      this.emit("pause");
    },
    load() {
      this.currentTime = 0;
    },
    play() {
      attempts++;
      return pendingPlay;
    },
  });
  const reducedMotion = target({ matches: false });
  const document = target({
    hidden: false,
    querySelector(selector) {
      return selector === "#demo-video"
        ? video
        : selector === "#pause"
          ? pause
          : selector === "#replay"
            ? replay
            : { scrollIntoView() {} };
    },
    querySelectorAll(selector) {
      return selector === ".step" ? steps : [];
    },
  });
  // Inject imports and environment into the shipping controller. No controller
  // behavior is duplicated: the tests dispatch its real registered handlers.
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8")
    .replace(/^import .*\n/gm, "")
    .replace(/import\.meta\.env\.[A-Z_]+/g, "undefined");
  runInNewContext(source, {
    document,
    matchMedia: () => reducedMotion,
    demoStepAt,
    getAvailability: () => ({}),
  });
  return {
    video,
    pause,
    replay,
    document,
    reducedMotion,
    rejectPlay,
    attempts: () => attempts,
    activeStep: () => steps.findIndex((step) => step.active),
  };
}

test("media error survives pending play rejection, pause, visibility and replay events", async () => {
  const fixture = playbackFixture();
  const { video, pause, document, replay } = fixture;
  assert.equal(fixture.attempts(), 1);
  video.emit("error");
  fixture.rejectPlay(new Error("Media failed while play was pending"));
  await new Promise(setImmediate);
  video.emit("pause");
  // load() may enqueue timeupdate after the error handler installs the poster.
  video.emit("timeupdate");
  document.hidden = true;
  document.emit("visibilitychange");
  document.hidden = false;
  document.emit("visibilitychange");
  replay.emit("click");
  video.emit("canplay");
  assert.equal(pause.disabled, true);
  assert.equal(pause["aria-label"], "Demonstration unavailable");
  assert.equal(video.getAttribute("src"), undefined);
  assert.equal(fixture.activeStep(), 3);
  assert.equal(fixture.attempts(), 1);
});

test("reduced motion keeps final poster step after queued timeupdate and replay", async () => {
  const fixture = playbackFixture();
  const { video, pause, reducedMotion, replay } = fixture;
  reducedMotion.matches = true;
  reducedMotion.emit("change");
  video.emit("timeupdate");
  replay.emit("click");
  fixture.rejectPlay(new Error("Playback interrupted by motion preference"));
  await new Promise(setImmediate);
  assert.equal(pause.disabled, true);
  assert.equal(pause["aria-label"], "Demonstration paused for reduced motion");
  assert.equal(video.getAttribute("src"), undefined);
  assert.equal(fixture.activeStep(), 3);
  assert.equal(fixture.attempts(), 1);
});
