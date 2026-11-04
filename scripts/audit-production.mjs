const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/dashboard', '/funcionarios', '/estoque', '/financeiro', '/erp'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const request = (url) => fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });

const results = [];
for (const route of routes) {
  const response = await request(`${baseUrl}${route}`);
  results.push({ route, status: response.status, ok: response.ok });
}

const response = await request(baseUrl);
const headers = Object.fromEntries(requiredHeaders.map((name) => [name, response.headers.get(name)]));
const missingHeaders = requiredHeaders.filter((name) => !headers[name]);
const html = await response.text();
const assetPaths = [...html.matchAll(/(?:src|href)=[\"'](\\/assets\\/[^\"']+)[\"']/g)].map((match) => match[1]);
const uniqueAssetPaths = [...new Set(assetPaths)];
const assets = await Promise.all(uniqueAssetPaths.map(async (asset) => {
  const assetResponse = await request(`${baseUrl}${asset}`);
  return { asset, status: assetResponse.status, ok: assetResponse.ok };
}));
const report = { baseUrl, routes: results, headers, missingHeaders, assets };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length || assets.some((item) => !item.ok)) process.exitCode = 1;
