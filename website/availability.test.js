import assert from "node:assert/strict";
import { test } from "node:test";
import { getAvailability } from "./availability.js";
test("launch stays pending unless explicitly enabled with a valid Store link", () => {
  for (const config of [
    undefined,
    { storeUrl: "https://www.raycast.com/byronrode/cloakshot" },
    { enabled: "true", storeUrl: "javascript:alert(1)" },
    { enabled: "true", storeUrl: "https://example.com/cloakshot" },
    { enabled: "true", storeUrl: "https://www.raycast.com/" },
  ]) {
    assert.equal(getAvailability(config).available, false);
  }
});
test("approved Store availability can be enabled and disabled", () => {
  const storeUrl = "https://www.raycast.com/byronrode/cloakshot";
  assert.deepEqual(getAvailability({ enabled: "true", storeUrl }), {
    label: "Available on Raycast",
    href: storeUrl,
    available: true,
  });
  assert.equal(
    getAvailability({ enabled: "false", storeUrl }).label,
    "Coming to launch soon",
  );
});
