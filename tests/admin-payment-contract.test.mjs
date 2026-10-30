import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const service = readFileSync(
  new URL("../src/services/admin/admin.service.ts", import.meta.url),
  "utf8",
);

test("pagamento manual grava a coluna forma_pagamento do Supabase", () => {
  assert.match(
    service,
    /forma_pagamento:\s* dados\.formaPagamento \|\| ["']PIX["']/,
  );
  assert.doesNotMatch(
    service,
    /\n\s*formaPagamento:\s* dados\.formaPagamento \|\| ["']PIX["']/,
  );
  assert.doesNotMatch(service, /totalProjetos:\s*0/);
});

