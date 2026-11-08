import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../src/layouts/AppLayout.tsx", import.meta.url), "utf8");

test("cabeçalho não exibe sino sem ação para o proprietário", () => {
  assert.match(layout, /hasPermission\(work\.context, 'notificacoes'\)/);
  assert.doesNotMatch(layout, /work\.context\?\.proprietario \? <button[\s\S]*aria-label="Notificações"/);
});