import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/views/auth/DevicesView.tsx", import.meta.url), "utf8");

test("controle de dispositivos anuncia carregamento e ações", () => {
  assert.match(source, /<main aria-busy=\{sessionState === 'loading' \|\| busy\}/);
  assert.match(source, /<p role="status" aria-live="polite">Verificando sua sessão/);
  assert.match(source, /aria-label=\{busy \? 'Autorizando este navegador' : 'Autorizar este navegador'\}/);
  assert.match(source, /aria-label="Sair da conta"/);
});