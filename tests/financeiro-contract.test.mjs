import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync(
  new URL("../src/views/financeiro/FinanceiroEmpresaView.tsx", import.meta.url),
  "utf8",
);

test("financeiro aceita valores decimais no padrão brasileiro", () => {
  assert.match(view, /type="text"[\s\S]*inputMode="decimal"/);
  assert.match(view, /replace\(",", "\."\)/);
  assert.match(view, /até duas casas decimais/);
  assert.match(view, /Valor \(ex\.\: 39,90\)/);
});

