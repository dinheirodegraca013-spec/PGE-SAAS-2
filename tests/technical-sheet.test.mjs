import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const {code} = await transform(await readFile(new URL('../src/modules/workforce/lib/technical-sheet.ts', import.meta.url), 'utf8'), {loader:'ts',format:'cjs'});
const module = {exports:{}};
new Function('module','exports',code)(module,module.exports);
const {validateTechnicalSheet: validate} = module.exports;
const templates = JSON.parse(await readFile(new URL('../supabase/workforce-sector-templates.json', import.meta.url), 'utf8'));
const fields = sector => templates.find(t => t.setor === sector).campos;

test('corte aceita peças válidas e rejeita códigos repetidos, quantidades fracionadas e campos inventados', () => {
  assert.deepEqual(validate(fields('corte'), {pecas:[{codigo:'P1',quantidade:2,largura:125.5}]}), []);
  const issues = validate(fields('corte'), {pecas:[{codigo:' P1 ',quantidade:2},{codigo:'p1',quantidade:1.5}],saldo:12});
  assert.deepEqual(issues.map(i => i.path).sort(), ['pecas.1.codigo','pecas.1.quantidade','saldo']);
  assert.ok(validate(fields('corte'), {pecas:[{codigo:'P2'}]}).some(i => i.path === 'pecas.0.quantidade'));
});
test('saldo e dados privados não podem ser enviados sem autorização', () => {
  assert.equal(validate(fields('estoque'), {saldo:10,custo_unitario:2}).length, 2);
  assert.deepEqual(validate(fields('estoque'), {custo_unitario:2}, ['estrategico']), []);
  assert.equal(validate(fields('instalacao'), {endereco:'Rua A'}).length, 1);
  assert.deepEqual(validate(fields('instalacao'), {endereco:'Rua A'}, ['cliente']), []);
});
test('rejeita números não finitos, datas impossíveis, links executáveis e anexos externos', () => {
  assert.equal(validate(fields('acabamento'), {demaos:Infinity,quantidade_aplicada:-1}).length, 2);
  assert.equal(validate(fields('estoque'), {validade:'2026-02-30',foto:'https://example.test/photo.jpg'}).length, 2);
  assert.equal(validate(fields('instalacao'), {localizacao_link:'javascript:alert(1)'}, ['cliente']).length, 1);
  assert.deepEqual(validate(fields('estoque'), {validade:'2028-02-29',foto:'12345678-1234-1234-1234-123456789012'}), []);
});
