import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/audit-production.mjs", import.meta.url), "utf8");

test("auditoria de produção não deixa Edge Function sem cobertura", () => {
  assert.match(source, /readdirSync\(new URL\('\.\.\/supabase\/functions\//);
  assert.match(source, /missingEdgeAudits/);
  assert.match(source, /missingEdgeAudits\.length/);
});

