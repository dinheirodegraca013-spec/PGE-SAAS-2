const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/dashboard', '/funcionarios', '/estoque', '/financeiro', '/erp'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
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
const supabaseUrl = bundleText.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0] ?? null;
const supabaseKey = bundleText.match(/sb_(?:publishable|anon)_[A-Za-z0-9_-]+/)?.[0] ?? null;
const endpointSmoke = [];
if (supabaseUrl && supabaseKey) {
  const checks = [
    ['edge:cadastrar-funcionario', `${supabaseUrl}/functions/v1/cadastrar-funcionario`, 401],
    ['edge:public-orcamento', `${supabaseUrl}/functions/v1/public-orcamento`, 400],
    ['rpc:limites_acesso', `${supabaseUrl}/rest/v1/rpc/limites_acesso`, 401],
    ['rpc:meu_contexto_operacional', `${supabaseUrl}/rest/v1/rpc/meu_contexto_operacional`, 401],
  ];
  for (const [name, url, expectedStatus] of checks) {
    const result = await request(url, { method: 'POST', headers: { apikey: supabaseKey, 'content-type': 'application/json' }, body: '{}' });
    const status = result.response?.status ?? 0;
    endpointSmoke.push({ name, status, expectedStatus, ok: status === expectedStatus });
  }
}
const report = { baseUrl, routes: results, headers, missingHeaders, assets, supabase: { discovered: Boolean(supabaseUrl && supabaseKey), endpointSmoke } };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length || assets.some((item) => !item.ok) || endpointSmoke.some((item) => !item.ok)) process.exitCode = 1;
