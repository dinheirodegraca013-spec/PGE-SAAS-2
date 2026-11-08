import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/RouteErrorBoundary.tsx", import.meta.url), "utf8");

test("erro de rota oferece retorno seguro ao painel", () => {
  assert.match(source, /window\.location\.assign\('\/'\)/);
  assert.match(source, /<h1 autoFocus tabIndex=\{-1\}/);
  assert.match(source, /Voltar ao painel/);
  assert.match(source, /flex flex-col gap-2 sm:flex-row/);
  assert.match(source, /Sua conexão parece estar offline/);
  assert.match(source, /addEventListener\("offline"/);
});

