import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const result = await build({entryPoints:[fileURLToPath(new URL('../src/modules/workforce/components/TechnicalSheetForm.tsx', import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['react']});
const module = {exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
const Form = module.exports.default;
const render = props => renderToStaticMarkup(React.createElement(Form, {onChange(){},async onSave(){},...props}));

test('formulário oculta informações restritas e não permite digitar referências de anexos', () => {
  const html = render({fields:[{key:'custo',label:'Custo confidencial',type:'number',privacy:'estrategico'},{key:'foto',label:'Foto técnica',type:'file'}],value:{custo:999,foto:'12345678-1234-1234-1234-123456789012'}});
  assert.ok(!html.includes('Custo confidencial'));
  assert.ok(!html.includes('999'));
  assert.ok(!html.includes('12345678-1234'));
  assert.ok(html.includes('Anexo vinculado à ordem.'));
});
test('listas exibem campos rotulados e campos calculados ficam desabilitados', () => {
  const html = render({fields:[{key:'saldo',label:'Saldo atual',type:'number',readOnly:true},{key:'pecas',label:'Peças',type:'table',columns:[{key:'codigo',label:'Código da peça',type:'text',required:true}]}],value:{saldo:3,pecas:[{codigo:'P1'}]}});
  assert.match(html, /disabled=""[^>]*value="3"/);
  assert.ok(html.includes('Código da peça *'));
  assert.ok(html.includes('Remover item 1'));
  assert.ok(html.includes('Adicionar item'));
  assert.ok(html.includes('value="P1"'));
});
