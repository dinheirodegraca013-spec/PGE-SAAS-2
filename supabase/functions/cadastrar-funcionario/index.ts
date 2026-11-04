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
      .select('tenant_id,papel,ativo,setor,tenants(ativo,principal_usuario_id)').eq('id', user.id).single();
    const empresa = Array.isArray(perfil?.tenants) ? perfil.tenants[0] : perfil?.tenants;
    if (perfilError || !perfil?.tenant_id || !perfil.ativo || perfil.setor || perfil.papel !== 'AdministradorTenant' || empresa?.ativo !== true || empresa.principal_usuario_id !== user.id) {
      return reply(403, { error: 'Somente o administrador da empresa pode cadastrar funcionários.' });
    }
    let body;
    try { body = await request.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const setor = body?.setor;
    const cargo = typeof body?.cargo === 'string' ? body.cargo.trim() : '';
    const identificadorInterno = typeof body?.identificador_interno === 'string' ? body.identificador_interno.trim() : '';
    if (nome.length < 2 || nome.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !setores.has(setor) || cargo.length > 120 || (identificadorInterno && !/^[A-Za-z0-9][A-Za-z0-9._\/-]{0,39}$/.test(identificadorInterno))) {
      return reply(400, { error: 'Informe nome, e-mail válido e setor.' });
    }
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: limits, error: accessError } = await caller.rpc('limites_acesso');
    if (accessError || !limits) return reply(403, { error: accessError?.message || 'Dispositivo não autorizado.' });
    if (limits.sublogins_available <= 0) return reply(409, { error: 'Limite de sublogins atingido. Desative um funcionário ou faça upgrade.' });
    // Random password is never returned or persisted. Trusted app_metadata makes the
    // Auth trigger provision the correct tenant atomically, without an owner signup.
    // 68 ASCII bytes: retain 256 random bits while respecting Auth's 72-byte limit.
    const password = 'Aa1!' + Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { nome_completo: nome },
      app_metadata: { gestio_employee: true, gestio_criado_por: user.id, gestio_tenant_id: perfil.tenant_id, gestio_setor: setor, gestio_cargo: cargo || null, gestio_identificador_interno: identificadorInterno || null },
    });
    if (createError || !created.user) {
      const duplicate = ['email_exists', 'user_already_exists'].includes(createError?.code || '');
      if (duplicate) return reply(409, { error: 'Este e-mail já está cadastrado. Use outro e-mail ou recupere o acesso existente.' });
      // The database serializes creation. A competing request may have used the
      // final slot after the preflight check; report that limit accurately.
      const { data: currentLimits } = await caller.rpc('limites_acesso');
      if (currentLimits?.sublogins_available === 0) return reply(409, { error: 'Limite de sublogins atingido. Desative um funcionário ou faça upgrade.' });
      console.error('employee_create_failed', { code: createError?.code || 'unknown', status: createError?.status || 500 });
      return reply(502, { error: 'Não foi possível criar o acesso agora. Tente novamente mais tarde ou contate o suporte.' });
    }
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

