import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync(
  new URL("../src/views/financeiro/FinanceiroEmpresaView.tsx", import.meta.url),
  "utf8",
);

test("financeiro aceita valores decimais no padrão brasileiro", () => {
  const validationPatterns = [
    ...view.matchAll(/!(\/\^.*?\$\/)\.test\((?:valor|quantia)\.trim\(\)\)/g),
  ];
  assert.equal(
    validationPatterns.length,
    2,
    "cadastro e baixa devem validar a entrada decimal",
  );
  for (const [, literal] of validationPatterns) {
    const pattern = Function(`return ${literal}`)();
    for (const valid of ["39,90", "1,10", "19.99", "100", "0,01"])
      assert.equal(pattern.test(valid), true, valid);
    for (const invalid of ["1,100", "1.000,00", "1e3", "-10", "abc", ""])
      assert.equal(pattern.test(invalid), false, invalid);
  }
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

