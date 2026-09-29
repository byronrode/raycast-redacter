import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
  const css = readFileSync(new URL(`./dist${cssPath}`, import.meta.url), "utf8");
  const fontPath = css.match(/url\(([^)]+\.ttf)\)/)?.[1];
  assert.ok(fontPath, "compiled CSS references the shared bundled font");
  assert.ok(statSync(new URL(`./dist${fontPath}`, import.meta.url)).size > 1000);
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
