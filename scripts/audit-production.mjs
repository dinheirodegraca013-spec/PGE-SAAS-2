const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/cadastro', '/redefinir-senha', '/estoque', '/meu-financeiro', '/visao-3d', '/equipe', '/meu-setor', '/admin', '/financeiro'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const expectedHeaderValues = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; frame-src 'none'; form-action 'self'; object-src 'none'; base-uri 'self'",
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
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
    ['edge:public-orcamento:PUT', `${supabaseUrl}/functions/v1/public-orcamento`, 405],
    ['edge:public-orcamento:PATCH', `${supabaseUrl}/functions/v1/public-orcamento`, 405],
    ['edge:public-orcamento:DELETE', `${supabaseUrl}/functions/v1/public-orcamento`, 405],
    ['edge:cadastrar-funcionario:OPTIONS', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 204],
    ['edge:validar-anexo:OPTIONS', `${supabaseUrl}/functions/v1/validar-anexo`, 204],
    ['edge:public-orcamento:OPTIONS', `${supabaseUrl}/functions/v1/public-orcamento`, 200],
  ];
  for (const [name, url, expectedStatus] of checks) {
    const method = name.endsWith(':OPTIONS') ? 'OPTIONS' : name.endsWith(':PUT') ? 'PUT' : name.endsWith(':PATCH') ? 'PATCH' : name.endsWith(':DELETE') ? 'DELETE' : 'GET';
    const result = await request(url, { method, headers: { apikey: supabaseKey, origin: baseUrl, 'access-control-request-method': 'POST' } });
    const status = result.response?.status ?? 0;
    const allowOrigin = result.response?.headers.get('access-control-allow-origin') ?? null;
    const allowMethods = result.response?.headers.get('access-control-allow-methods') ?? null;
    const vary = result.response?.headers.get('vary') ?? null;
    const contentTypeOptions = result.response?.headers.get('x-content-type-options') ?? null;
    const referrerPolicy = result.response?.headers.get('referrer-policy') ?? null;
    const corsOk = allowOrigin === baseUrl && allowMethods?.includes(name.includes('public-orcamento') ? 'GET' : 'POST') === true;
    const securityOk = name.endsWith(':OPTIONS')
      ? contentTypeOptions?.toLowerCase() === 'nosniff' && referrerPolicy?.toLowerCase() === 'no-referrer'
        && (!name.includes('public-orcamento') || vary?.toLowerCase().split(',').map((value) => value.trim()).includes('origin'))
      : true;
    methodChecks.push({ name, status, expectedStatus, contentTypeOptions, referrerPolicy, ...(name.endsWith(':OPTIONS') ? { vary } : {}),
      ok: status === expectedStatus && corsOk && securityOk,
      ...(name.endsWith(':OPTIONS') ? { cors: { allowOrigin, allowMethods, ok: corsOk && securityOk } } : {}) });
  }
  const baseUrlObject = new URL(baseUrl);
  const alternateBaseUrl = baseUrlObject.hostname.startsWith('www.')
    ? `${baseUrlObject.protocol}//${baseUrlObject.hostname.slice(4)}`
    : `${baseUrlObject.protocol}//www.${baseUrlObject.hostname}`;
  for (const [name, url, expectedStatus] of [
    ['edge:cadastrar-funcionario:OPTIONS-alternate-origin', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 204],
    ['edge:validar-anexo:OPTIONS-alternate-origin', `${supabaseUrl}/functions/v1/validar-anexo`, 204],
    ['edge:public-orcamento:OPTIONS-alternate-origin', `${supabaseUrl}/functions/v1/public-orcamento`, 200],
  ]) {
    const result = await request(url, { method: 'OPTIONS', headers: { apikey: supabaseKey, origin: alternateBaseUrl, 'access-control-request-method': 'POST' } });
    const allowOrigin = result.response?.headers.get('access-control-allow-origin') ?? null;
    const allowMethods = result.response?.headers.get('access-control-allow-methods') ?? null;
    const contentTypeOptions = result.response?.headers.get('x-content-type-options') ?? null;
    const referrerPolicy = result.response?.headers.get('referrer-policy') ?? null;
    const corsOk = allowOrigin === alternateBaseUrl && allowMethods?.includes(name.includes('public-orcamento') ? 'GET' : 'POST') === true;
    const securityOk = contentTypeOptions?.toLowerCase() === 'nosniff' && referrerPolicy?.toLowerCase() === 'no-referrer';
    methodChecks.push({ name, status: result.response?.status ?? 0, expectedStatus, allowOrigin, contentTypeOptions, referrerPolicy, ok: result.response?.status === expectedStatus && corsOk && securityOk });
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

  const foreignOrigin = await request(`${supabaseUrl}/functions/v1/public-orcamento`, {
    method: 'OPTIONS',
    headers: { apikey: supabaseKey, origin: 'https://evil.example', 'access-control-request-method': 'POST' },
  });
  const foreignAllowOrigin = foreignOrigin.response?.headers.get('access-control-allow-origin') ?? null;
  methodChecks.push({ name: 'edge:public-orcamento:CORS-origem-externa', status: foreignOrigin.response?.status ?? 0,
    expectedStatus: 200, allowOrigin: foreignAllowOrigin,
    ok: foreignOrigin.response?.status === 200 && foreignAllowOrigin !== 'https://evil.example' });
}
const report = { baseUrl, routes: results, headers, missingHeaders, mismatchedHeaders, contentType, contentTypeOk, exposedSecrets, assets, supabase: { discovered: Boolean(supabaseUrl && supabaseKey), endpointSmoke, methodChecks } };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length || mismatchedHeaders.length || !contentTypeOk || exposedSecrets.length || assets.some((item) => !item.ok) || endpointSmoke.some((item) => !item.ok) || methodChecks.some((item) => !item.ok)) process.exitCode = 1;

