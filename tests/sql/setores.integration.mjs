// Run with: node tests/sql/setores.integration.mjs <absolute path to @electric-sql/pglite/dist/index.js>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const uid = n => `20000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const tid = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
await db.exec(`
  CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE SCHEMA private;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}');
  CREATE TABLE public.tenants(id uuid PRIMARY KEY,ativo boolean DEFAULT true);
  CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users,tenant_id uuid REFERENCES tenants,nome_completo text,email text,papel text,ativo boolean DEFAULT true);
  CREATE TABLE public.projetos_marcenaria(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants,titulo text,data_entrega date,valor_total_orcamento numeric);
  CREATE TABLE public.financeiro_lancamentos(id int,tenant_id uuid);
  CREATE TABLE public.estoque_itens(id int,tenant_id uuid);
  CREATE TABLE public.estoque_movimentacoes(id int,tenant_id uuid);
  CREATE FUNCTION private.current_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT tenant_id FROM public.profiles WHERE id=auth.uid() AND ativo $$;
  CREATE FUNCTION private.handle_new_pge_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
  BEGIN RETURN NEW; END $$;
  CREATE TRIGGER on_auth_user_created_pge AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_pge_user();
  GRANT USAGE ON SCHEMA public,auth,private TO authenticated;
  GRANT SELECT,UPDATE ON public.profiles TO authenticated;
  GRANT SELECT ON public.projetos_marcenaria,public.financeiro_lancamentos,public.estoque_itens,public.estoque_movimentacoes TO authenticated;
  GRANT INSERT,UPDATE,DELETE ON public.projetos_marcenaria TO authenticated;
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY legacy_profiles ON public.profiles FOR ALL TO authenticated USING(tenant_id=private.current_tenant_id()) WITH CHECK(tenant_id=private.current_tenant_id());
  CREATE POLICY legacy_projects ON public.projetos_marcenaria FOR ALL TO authenticated USING(tenant_id=private.current_tenant_id());
  CREATE POLICY legacy_finance ON public.financeiro_lancamentos FOR ALL TO authenticated USING(tenant_id=private.current_tenant_id());
  CREATE POLICY legacy_stock ON public.estoque_itens FOR ALL TO authenticated USING(tenant_id=private.current_tenant_id());
  CREATE POLICY legacy_stock_moves ON public.estoque_movimentacoes FOR ALL TO authenticated USING(tenant_id=private.current_tenant_id());
  INSERT INTO public.tenants VALUES('${tid(1)}',true),('${tid(2)}',true);
  INSERT INTO auth.users(id) VALUES('${uid(1)}'),('${uid(2)}');
  INSERT INTO profiles(id,tenant_id,papel) VALUES('${uid(1)}','${tid(1)}','AdministradorTenant'),('${uid(2)}','${tid(2)}','AdministradorTenant');
  INSERT INTO projetos_marcenaria VALUES('${tid(11)}','${tid(1)}','Cozinha','2026-12-01',30000),('${tid(12)}','${tid(2)}','Outro tenant',null,90000);
  INSERT INTO financeiro_lancamentos VALUES(1,'${tid(1)}'),(2,'${tid(2)}');
  INSERT INTO estoque_itens VALUES(1,'${tid(1)}'),(2,'${tid(2)}');
  INSERT INTO estoque_movimentacoes VALUES(1,'${tid(1)}'),(2,'${tid(2)}');
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261103132337_funcionarios_por_setor.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261103134501_employee_projects_read_only.sql',import.meta.url),'utf8'));
async function asUser(n, action) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid(n)}',false); SELECT set_config('request.jwt.claim.role','authenticated',false);`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}
for (const [n,setor] of [[3,'corte'],[4,'montagem'],[5,'estoque'],[6,'financeiro']]) {
  await db.query(`INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)`,[uid(n),`p${n}@example.test`,{gestio_employee:true,gestio_criado_por:uid(1),gestio_tenant_id:tid(1),gestio_setor:setor},{nome_completo:`Pessoa ${n}`}]);
}
assert.equal((await db.query(`SELECT count(*)::int n FROM tenants`)).rows[0].n,2,'employee signup must not create a tenant');
await assert.rejects(db.query(`INSERT INTO auth.users(id,raw_app_meta_data) VALUES($1,$2)`,[uid(7),{gestio_employee:true,gestio_criado_por:uid(2),gestio_tenant_id:tid(1),gestio_setor:'corte'}]));
await asUser(1,()=>db.query(`SELECT encaminhar_projeto_setor($1,'corte')`,[tid(11)]));
await assert.rejects(asUser(2,()=>db.query(`SELECT encaminhar_projeto_setor($1,'montagem')`,[tid(11)])));
await assert.rejects(asUser(3,()=>db.query(`SELECT encaminhar_projeto_setor($1,'montagem')`,[tid(11)])));
assert.equal((await asUser(3,()=>db.query('SELECT * FROM meu_setor_projetos()'))).rows.length,1);
assert.equal((await asUser(4,()=>db.query('SELECT * FROM meu_setor_projetos()'))).rows.length,0);
const ownProject=(await asUser(3,()=>db.query('SELECT * FROM meu_setor_projetos()'))).rows[0];
assert.deepEqual(Object.keys(ownProject).sort(),['id','prazo','titulo']);
assert.equal((await asUser(3,()=>db.query('SELECT * FROM projetos_marcenaria'))).rows.length,0);
assert.equal((await asUser(3,()=>db.query('SELECT * FROM financeiro_lancamentos'))).rows.length,0);
assert.equal((await asUser(3,()=>db.query('SELECT * FROM profiles'))).rows.length,1);
await assert.rejects(asUser(3,()=>db.query(`UPDATE profiles SET setor='financeiro' WHERE id=$1`,[uid(3)])));
assert.equal((await asUser(5,()=>db.query('SELECT * FROM estoque_itens'))).rows.length,1);
assert.equal((await asUser(5,()=>db.query('SELECT * FROM estoque_movimentacoes'))).rows.length,1);
assert.equal((await asUser(5,()=>db.query('SELECT * FROM financeiro_lancamentos'))).rows.length,0);
assert.equal((await asUser(6,()=>db.query('SELECT * FROM financeiro_lancamentos'))).rows.length,1);
assert.equal((await asUser(6,()=>db.query('SELECT * FROM estoque_itens'))).rows.length,0);
assert.equal((await asUser(6,()=>db.query('SELECT * FROM projetos_marcenaria'))).rows.length,1,'finance can read its company projects');
assert.equal((await asUser(6,()=>db.query(`UPDATE projetos_marcenaria SET titulo='Changed by finance' WHERE id=$1 RETURNING id`,[tid(11)]))).rows.length,0,'finance must not edit projects');
assert.equal((await asUser(6,()=>db.query(`DELETE FROM projetos_marcenaria WHERE id=$1 RETURNING id`,[tid(11)]))).rows.length,0,'finance must not delete projects');
await assert.rejects(asUser(6,()=>db.query(`INSERT INTO projetos_marcenaria(id,tenant_id,titulo) VALUES($1,$2,'Finance project')`,[tid(13),tid(1)])));
assert.equal((await asUser(1,()=>db.query(`UPDATE projetos_marcenaria SET titulo='Updated by administrator' WHERE id=$1 RETURNING id`,[tid(11)]))).rows.length,1,'administrator keeps project management');
await db.exec(`UPDATE profiles SET ativo=false WHERE id='${uid(3)}'`);
assert.equal((await asUser(3,()=>db.query('SELECT * FROM meu_setor_projetos()'))).rows.length,0);
assert.equal((await asUser(3,()=>db.query('SELECT * FROM profiles'))).rows.length,0);
console.log('PASS: signup, tenant isolation, sector isolation, inactive account, self-escalation and administrator routing');
await db.close();
