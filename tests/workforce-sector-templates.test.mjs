import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const templates = JSON.parse(await readFile(new URL('../supabase/workforce-sector-templates.json', import.meta.url), 'utf8'));

test('fichas dos seis setores possuem campos e checklists identificáveis sem duplicidades', () => {
  assert.deepEqual(templates.map(t => t.setor).sort(), ['acabamento', 'corte', 'estoque', 'financeiro', 'instalacao', 'montagem']);
  const types = new Set(['text', 'textarea', 'number', 'integer', 'table', 'file', 'url', 'date']);
  function fields(items) {
    assert.equal(new Set(items.map(f => f.key)).size, items.length);
    for (const field of items) {
      assert.match(field.key, /^[a-z][a-z0-9_]*$/);
      assert.ok(field.label.trim());
      assert.ok(types.has(field.type), field.key);
      if (field.type === 'table') {
        assert.ok(field.columns.length);
        fields(field.columns);
        assert.ok(field.columns.some(c => c.key === field.unique_key && c.required));
      }
    }
  }
  for (const template of templates) {
    assert.ok(Number.isInteger(template.versao) && template.versao > 0);
    fields(template.campos);
    assert.ok(template.checklist.length);
    assert.equal(new Set(template.checklist.map(c => c.key)).size, template.checklist.length);
  }
});

test('aceite do cliente é uma evidência automática, separada dos checklists manuais', () => {
  const installation = templates.find(t => t.setor === 'instalacao');
  assert.equal(installation.checklist.find(c => c.key === 'aceite_cliente')?.automatic, true);
  assert.equal(installation.checklist.length, 19);
  assert.equal(templates.find(t => t.setor === 'montagem').checklist.length, 9);
  assert.equal(templates.find(t => t.setor === 'acabamento').checklist.length, 12);
});
