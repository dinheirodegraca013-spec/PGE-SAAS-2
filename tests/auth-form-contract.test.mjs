import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const login = fs.readFileSync(new URL("../src/views/auth/LoginView.tsx", import.meta.url), "utf8");
const register = fs.readFileSync(new URL("../src/views/auth/RegisterView.tsx", import.meta.url), "utf8");

test("login mantém autofill e teclado de e-mail no celular", () => {
  assert.match(login, /id="email" type="email" inputMode="email" autoComplete="email"/);
  assert.match(login, /id="emailRecup" type="email" inputMode="email" autoComplete="email"/);
  assert.match(login, /id="senha" type="password" autoComplete="current-password"/);
});

test("cadastro identifica senhas novas para gerenciadores", () => {
  assert.match(register, /id="email"[\s\S]*autoComplete="email"/);
  assert.match(register, /id="senha"[\s\S]*autoComplete="new-password"/);
  assert.match(register, /id="confirmarSenha"[\s\S]*autoComplete="new-password"/);
});

