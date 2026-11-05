import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("auditoria do cliente resolve tenant pelo perfil autenticado", () => {
  const source = fs.readFileSync("src/services/api/client.ts", "utf8");
  const start = source.indexOf("async function recordAuditLog");
  const end = source.indexOf("function createSuccessResult", start);
  assert.ok(start >= 0 && end > start, "recordAuditLog não encontrado");
  const block = source.slice(start, end);
  assert.match(block, /supabase\s*\n?\s*\.from\(["']profiles["']\)/);
  assert.match(block, /\.select\(["']tenant_id["']\)/);
  assert.match(block, /\.eq\(["']id["'],\s*user\.id\)/);
  assert.doesNotMatch(block, /getCurrentTenantId\s*\(/);
  assert.doesNotMatch(block, /localStorage/);
});

