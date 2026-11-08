import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../src/layouts/AppLayout.tsx", import.meta.url), "utf8");

test("menu móvel permite fechar com Escape e informa seu estado", () => {
  assert.match(layout, /event\.key === 'Escape'/);
  assert.match(layout, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(layout, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(layout, /aria-controls="gestio-mobile-sidebar"/);
  assert.match(layout, /id="gestio-mobile-sidebar"/);
  assert.match(layout, /role="alert" aria-live="assertive" className="mx-4 mt-3 rounded-xl border border-amber-200/);
  assert.match(layout, /Aguarde a internet voltar antes de salvar alterações/);
});