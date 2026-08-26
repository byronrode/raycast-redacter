import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { imageMimeType, validateImage } from "./image-file";

test("recognizes supported image extensions case-insensitively", () => {
  assert.equal(imageMimeType("Screenshot.PNG"), "image/png");
  assert.equal(imageMimeType("photo.jpeg"), "image/jpeg");
  assert.equal(imageMimeType("notes.txt"), undefined);
});

test("accepts an existing image without modifying it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "image-redacter-"));
  const path = join(directory, "source.webp");
  const contents = Buffer.from("source remains untouched");
  await writeFile(path, contents);

  assert.equal(await validateImage(path), "image/webp");
  assert.deepEqual(
    await import("node:fs/promises").then(({ readFile }) => readFile(path)),
    contents,
  );
});

test("rejects unsupported and missing files", async () => {
  await assert.rejects(() => validateImage("document.pdf"), /Choose a PNG/);
  await assert.rejects(() => validateImage("missing.png"), /no longer exists/);
});
