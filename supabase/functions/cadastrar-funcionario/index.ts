import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const setores = new Set(['corte', 'montagem', 'acabamento', 'instalacao', 'estoque', 'financeiro']);
const site = Deno.env.get('SITE_URL') || 'https://gestio.dev.br';
const origin = new URL(site).origin;
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Vary': 'Origin' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Faça login novamente.' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    // getUser validates the token against Auth; do not trust decoded client claims.
    const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply(401, { error: 'Sessão inválida.' });
    const { data: perfil, error: perfilError } = await admin.from('profiles')
      .select('tenant_id,papel,ativo,setor,tenants(ativo)').eq('id', user.id).single();
    const empresa = Array.isArray(perfil?.tenants) ? perfil.tenants[0] : perfil?.tenants;
    if (perfilError || !perfil?.tenant_id || !perfil.ativo || perfil.setor || perfil.papel !== 'AdministradorTenant' || empresa?.ativo !== true) {
      return reply(403, { error: 'Somente o administrador da empresa pode cadastrar funcionários.' });
    }
    let body;
    try { body = await request.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const setor = body?.setor;
    if (nome.length < 2 || nome.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !setores.has(setor)) {
      return reply(400, { error: 'Informe nome, e-mail válido e setor.' });
    }
    // Random password is never returned or persisted. Trusted app_metadata makes the
    // Auth trigger provision the correct tenant atomically, without an owner signup.
    const password = Array.from(crypto.getRandomValues(new Uint8Array(48)), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { nome_completo: nome },
      app_metadata: { gestio_employee: true, gestio_criado_por: user.id, gestio_tenant_id: perfil.tenant_id, gestio_setor: setor },
    });
    if (createError || !created.user) return reply(409, { error: 'Não foi possível criar este acesso. O e-mail pode já estar cadastrado.' });
    const { error: mailError } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/redefinir-senha` });
    if (mailError) {
      // Compensate an email failure so retrying does not leave an inaccessible account.
      const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
      return reply(502, { error: rollbackError ? 'A conta foi criada, mas o e-mail não foi enviado. Contate o suporte para reenviar o acesso.' : 'O e-mail não pôde ser enviado. Tente novamente mais tarde.' });
    }
    return reply(201, { success: true });
  } catch {
    return reply(500, { error: 'Cadastro indisponível no momento. Tente novamente.' });
  }
});
