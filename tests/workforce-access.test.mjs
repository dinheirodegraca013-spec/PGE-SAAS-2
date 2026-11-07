import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/lib/access.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
const module={exports:{}};new Function('module','exports',code)(module,module.exports);
const {hasPermission,authorizedSectors,workforcePathAllowed}=module.exports;
const base={empresa_id:'company',proprietario:false,funcionario:{setor:'corte',setores_adicionais:['montagem','estoque']},permissoes:[{modulo:'painel',operacao:'visualizar',escopo:'atribuidos'},{modulo:'estoque',operacao:'visualizar',escopo:'setor'}]};
test('setor adicional autorizado aparece no acesso sem liberar financeiro',()=>{
  assert.equal(workforcePathAllowed(base,'/estoque'),true);
  assert.equal(workforcePathAllowed(base,'/meu-financeiro'),false);
  assert.equal(workforcePathAllowed(base,'/configuracoes'),false);
  assert.deepEqual(authorizedSectors(base),['corte','montagem','estoque']);
});
test('remover setor ou permissão bloqueia a rota, e leitura não libera criação',()=>{
  assert.equal(workforcePathAllowed({...base,funcionario:{...base.funcionario,setores_adicionais:[]}},'/estoque'),false);
  assert.equal(workforcePathAllowed({...base,permissoes:[]},'/estoque'),false);
  assert.equal(hasPermission(base,'estoque','criar'),false);
  assert.equal(workforcePathAllowed(null,'/estoque'),false);
});
test('qualquer módulo de trabalho autorizado libera o painel do funcionário',()=>{
  const tasksOnly={...base,permissoes:[{modulo:'tarefas',operacao:'visualizar',escopo:'atribuidos'}]};
  assert.equal(workforcePathAllowed(tasksOnly,'/meu-setor'),true);
  assert.equal(workforcePathAllowed({...base,permissoes:[{modulo:'perfil',operacao:'visualizar',escopo:'atribuidos'}]},'/meu-setor'),true);
  assert.equal(workforcePathAllowed({...base,permissoes:[{modulo:'clientes',operacao:'visualizar',escopo:'empresa'}]},'/meu-setor'),false);
  assert.equal(workforcePathAllowed({...base,permissoes:[{modulo:'estoque',operacao:'visualizar',escopo:'setor'}]},'/meu-setor'),true);
  assert.equal(workforcePathAllowed({...base,permissoes:[{modulo:'financeiro',operacao:'visualizar',escopo:'atribuidos'}],funcionario:{...base.funcionario,setor:'financeiro',setores_adicionais:[]}},'/meu-setor'),true);
});
test('cargo administrativo não concede financeiro nem funções de proprietário',()=>{
  const office={...base,funcionario:{setor:'financeiro',setores_adicionais:[],cargo:'Gerente administrativo'},permissoes:[{modulo:'clientes',operacao:'visualizar',escopo:'empresa'}]};
  assert.equal(workforcePathAllowed(office,'/meu-financeiro'),false);
  assert.equal(hasPermission(office,'financeiro','registrar_pagamento'),false);
  assert.equal(workforcePathAllowed({...office,permissoes:[{modulo:'financeiro',operacao:'visualizar',escopo:'atribuidos'}]},'/meu-financeiro'),true);
});

