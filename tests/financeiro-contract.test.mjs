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

test("falha nos lançamentos não apaga projetos já carregados", () => {
  assert.match(view, /erroLancamentos/);
  assert.match(view, /let projetosCarregados = false/);
  assert.match(view, /if \(projetosCarregados\)/);
  assert.match(view, /setErroLancamentos\(mensagemErro\)/);
});

