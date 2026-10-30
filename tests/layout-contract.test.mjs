import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(
  new URL("../src/layouts/AdminLayout.tsx", import.meta.url),
  "utf8",
);

test("painel interno mantém a casca visual GESTIO padronizada", () => {
  assert.match(layout, /gestio-app/);
  assert.match(layout, /gestio-sidebar/);
  assert.match(layout, /gestio-brand/);
  assert.match(layout, /gestio-nav-active/);
  assert.match(layout, /gestio-topbar/);
  assert.match(layout, /gestio-content/);
  assert.match(layout, /Sistema online/);
});

