const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/dashboard', '/funcionarios', '/estoque', '/financeiro', '/erp'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const request = async (url) => {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
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
const report = { baseUrl, routes: results, headers, missingHeaders, assets };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length || assets.some((item) => !item.ok)) process.exitCode = 1;
