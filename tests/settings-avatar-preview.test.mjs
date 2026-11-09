import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/views/settings/SettingsView.tsx", import.meta.url),
  "utf8",
);

test("prévia de avatar revoga URLs temporárias", () => {
  assert.match(source, /URL\.createObjectURL\(file\)/);
  assert.match(source, /return \(\) => \{\s*if \(previewUrl\) URL\.revokeObjectURL\(previewUrl\);/);
  assert.ok(
    (source.match(/URL\.revokeObjectURL\(previewUrl\)/g) ?? []).length >= 3,
  );
});

