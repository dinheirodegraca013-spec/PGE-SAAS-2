import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('login de funcionário tolera a janela de sincronização do perfil', async () => {
  const source = await readFile('src/stores/auth.tsx', 'utf8');
  assert.match(source, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(source, /if \(error \|\| data \|\| attempt === 2\) break/);
  assert.match(source, /setTimeout\(resolve, 150 \* \(attempt \+ 1\)\)/);
  assert.match(source, /Seu convite foi recebido, mas o vínculo com a empresa ainda está sendo concluído/);
  assert.ok(source.indexOf("fetchUserProfile(user.id)") < source.indexOf("authorizeDevice()"), 'perfil deve ser validado antes do dispositivo');
});

