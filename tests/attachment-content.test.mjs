import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const {code}=await transform(await readFile(new URL('../supabase/functions/_shared/attachment-content.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
const module={exports:{}};new Function('module','exports',code)(module,module.exports);
const {attachmentContentError:check,attachmentDigest}=module.exports;
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8lcAAAAASUVORK5CYII=','base64'));
test('imagem PNG reconhecida não pode ser declarada como JPEG ou PDF',()=>{
  assert.equal(check(png,'image/png',png.length),null);
  assert.ok(check(png,'image/jpeg',png.length));assert.ok(check(png,'application/pdf',png.length));
});
test('recusa tamanho divergente, truncamento, conteúdo executável e tipos não permitidos',()=>{
  assert.ok(check(png,'image/png',png.length+1));assert.ok(check(png,'image/png',10485761));
  const truncated=png.slice(0,-1);assert.ok(check(truncated,'image/png',truncated.length));
  const html=new TextEncoder().encode('<script>alert(1)</script>');
  for(const mime of ['application/pdf','image/png','image/jpeg','image/webp','text/html'])assert.ok(check(html,mime,html.length));
});
test('PDF exige cabeçalho e final; WebP exige tamanho de contêiner correto',()=>{
  const pdf=new TextEncoder().encode('%PDF-1.7\nConteúdo de teste\n%%EOF\n');
  assert.equal(check(pdf,'application/pdf',pdf.length),null);
  const extra=new Uint8Array([...pdf,...new TextEncoder().encode('<script>')]);assert.ok(check(extra,'application/pdf',extra.length));
  const webp=new Uint8Array(24);webp.set(new TextEncoder().encode('RIFF'));new DataView(webp.buffer).setUint32(4,16,true);webp.set(new TextEncoder().encode('WEBPVP8L'),8);
  assert.equal(check(webp,'image/webp',webp.length),null);webp[4]=17;assert.ok(check(webp,'image/webp',webp.length));
});
test('hash usa o conteúdo completo e mantém resultado estável',async()=>{
  const bytes=new TextEncoder().encode('abc');assert.equal(await attachmentDigest(bytes),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
