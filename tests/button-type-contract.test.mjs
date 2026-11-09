import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ações de formulário têm tipo explícito", () => {
  const estoque = read("src/views/estoque/EstoqueView.tsx");
  const financeiro = read("src/views/financeiro/FinanceiroEmpresaView.tsx");
  const servicos = read("src/modules/servicos/views/ServicosListView.tsx");
  const layout = read("src/layouts/AppLayout.tsx");
  const projetos = read("src/modules/furniture/views/ProjetosListView.tsx");
  assert.match(estoque, /<button type="submit" disabled=\{operando\} className="btn-primary sm:col-span-2">Salvar dados técnicos/);
  assert.match(estoque, /<button type="submit" disabled=\{operando\} className="btn-primary sm:col-span-4">/);
  assert.match(financeiro, /<button\s+type="submit"\s+disabled=\{salvando\}/);
  assert.match(servicos, /<button type="button" onClick=\{carregar\}/);
  assert.match(layout, /<button\s+type="button"\s+aria-label="Fechar menu"/);
  assert.match(projetos, /<button\s+type="button"\s+onClick=\{carregarProjetos\}/);
});

