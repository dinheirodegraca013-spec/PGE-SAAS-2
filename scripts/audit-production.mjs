const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/cadastro', '/redefinir-senha', '/estoque', '/meu-financeiro', '/visao-3d', '/equipe', '/meu-setor', '/admin', '/financeiro'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const expectedHeaderValues = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};
const request = async (url, init) => {
  try {
    const response = await fetch(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return { response, error: null };
  } catch (error) {
    return { response: null, error: error instanceof Error ? error.message : String(error) };
  }
};

const results = [];
for (const route of routes) {
  const result = await request(`${baseUrl}${route}`);
  results.push({ route, status: result.response?.status ?? 0, ok: result.response?.ok ?? false, ...(result.error ? { error: result.error } : {}) });
}

const page = await request(baseUrl);
const headers = Object.fromEntries(requiredHeaders.map((name) => [name, page.response?.headers.get(name) ?? null]));
const missingHeaders = requiredHeaders.filter((name) => !headers[name]);
const mismatchedHeaders = Object.entries(expectedHeaderValues)
  .filter(([name, value]) => (headers[name] || '').toLowerCase() !== value.toLowerCase())
  .map(([name, value]) => ({ name, expected: value, actual: headers[name] }));
const contentType = page.response?.headers.get('content-type') ?? null;
const contentTypeOk = Boolean(contentType?.toLowerCase().startsWith('text/html'));
const html = page.response ? await page.response.text() : '';
const assetPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
const uniqueAssetPaths = [...new Set(assetPaths)];
const assets = await Promise.all(uniqueAssetPaths.map(async (asset) => {
  const result = await request(`${baseUrl}${asset}`);
  return { asset, status: result.response?.status ?? 0, ok: result.response?.ok ?? false, ...(result.error ? { error: result.error } : {}) };
}));

const scriptAssets = uniqueAssetPaths.filter((asset) => asset.endsWith('.js'));
const scriptBodies = await Promise.all(scriptAssets.map(async (asset) => {
  const result = await request(`${baseUrl}${asset}`);
  return result.response ? await result.response.text() : '';
}));
const bundleText = scriptBodies.join('\n');
const exposedSecrets = [
  { name: 'service_role', pattern: /service[_-]?role/i },
  { name: 'secret_key', pattern: /(?:secret|private)[_-]?key\s*[:=]/i },
].filter((entry) => entry.pattern.test(bundleText)).map((entry) => entry.name);
const supabaseUrl = bundleText.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0] ?? null;
const supabaseKey = bundleText.match(/sb_(?:publishable|anon)_[A-Za-z0-9_-]+/)?.[0] ?? null;
const endpointSmoke = [];
if (supabaseUrl && supabaseKey) {
  const checks = [
    ['edge:cadastrar-funcionario', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 401],
    ['edge:validar-anexo', `${supabaseUrl}/functions/v1/validar-anexo`, 401],
    ['edge:public-orcamento', `${supabaseUrl}/functions/v1/public-orcamento`, 400],
    ['rpc:limites_acesso', `${supabaseUrl}/rest/v1/rpc/limites_acesso`, 401],
    ['rpc:meu_contexto_operacional', `${supabaseUrl}/rest/v1/rpc/meu_contexto_operacional`, 401],
  ];
  for (const [name, url, expectedStatus] of checks) {
    const result = await request(url, { method: 'POST', headers: { apikey: supabaseKey, 'content-type': 'application/json' }, body: '{}' });
    const status = result.response?.status ?? 0;
    const cacheControl = result.response?.headers.get('cache-control') ?? null;
    const contentTypeOptions = result.response?.headers.get('x-content-type-options') ?? null;
    const referrerPolicy = result.response?.headers.get('referrer-policy') ?? null;
    const cacheOk = name.startsWith('edge:') ? cacheControl?.includes('no-store') === true : true;
    const edgeHeadersOk = name.startsWith('edge:')
      ? contentTypeOptions?.toLowerCase() === 'nosniff' && referrerPolicy?.toLowerCase() === 'no-referrer'
      : true;
    endpointSmoke.push({ name, status, expectedStatus, cacheControl, contentTypeOptions, referrerPolicy,
      ok: status === expectedStatus && cacheOk && edgeHeadersOk });
  }
}
const methodChecks = [];
if (supabaseUrl && supabaseKey) {
  const checks = [
    ['edge:cadastrar-funcionario:GET', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 405],
    ['edge:validar-anexo:GET', `${supabaseUrl}/functions/v1/validar-anexo`, 405],
    ['edge:public-orcamento:GET-sem-token', `${supabaseUrl}/functions/v1/public-orcamento`, 400],
    ['edge:cadastrar-funcionario:OPTIONS', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 204],
    ['edge:validar-anexo:OPTIONS', `${supabaseUrl}/functions/v1/validar-anexo`, 204],
    ['edge:public-orcamento:OPTIONS', `${supabaseUrl}/functions/v1/public-orcamento`, 200],
  ];
  for (const [name, url, expectedStatus] of checks) {
    const method = name.endsWith(':OPTIONS') ? 'OPTIONS' : 'GET';
    const result = await request(url, { method, headers: { apikey: supabaseKey, origin: baseUrl, 'access-control-request-method': 'POST' } });
    const status = result.response?.status ?? 0;
    const allowOrigin = result.response?.headers.get('access-control-allow-origin') ?? null;
    const allowMethods = result.response?.headers.get('access-control-allow-methods') ?? null;
    const corsOk = name.includes('cadastrar-funcionario') || name.includes('validar-anexo')
      ? allowOrigin === baseUrl && allowMethods?.includes('POST') === true
      : true;
    methodChecks.push({ name, status, expectedStatus, ok: status === expectedStatus && corsOk,
      ...(name.endsWith(':OPTIONS') ? { cors: { allowOrigin, allowMethods, ok: corsOk } } : {}) });
  }
  const oversized = await request(`${supabaseUrl}/functions/v1/public-orcamento`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'content-type': 'application/json' },
    body: 'x'.repeat(17000),
  });
  const oversizedHeadersOk = oversized.response?.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff'
    && oversized.response?.headers.get('referrer-policy')?.toLowerCase() === 'no-referrer';
  methodChecks.push({ name: 'edge:public-orcamento:payload-limit', status: oversized.response?.status ?? 0,
    expectedStatus: 413, cacheControl: oversized.response?.headers.get('cache-control') ?? null,
    contentTypeOptions: oversized.response?.headers.get('x-content-type-options') ?? null,
    referrerPolicy: oversized.response?.headers.get('referrer-policy') ?? null,
    ok: oversized.response?.status === 413 && oversized.response?.headers.get('cache-control')?.includes('no-store') === true && oversizedHeadersOk });
}
const report = { baseUrl, routes: results, headers, missingHeaders, mismatchedHeaders, contentType, contentTypeOk, exposedSecrets, assets, supabase: { discovered: Boolean(supabaseUrl && supabaseKey), endpointSmoke, methodChecks } };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length || mismatchedHeaders.length || !contentTypeOk || exposedSecrets.length || assets.some((item) => !item.ok) || endpointSmoke.some((item) => !item.ok) || methodChecks.some((item) => !item.ok)) process.exitCode = 1;

