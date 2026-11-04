const baseUrl = (process.env.GESTIO_URL || 'https://gestio.dev.br').replace(/\/$/, '');
const routes = ['/', '/login', '/dashboard', '/funcionarios', '/estoque', '/financeiro', '/erp'];
const requiredHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy'];

const results = [];
for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: 'follow' });
  results.push({ route, status: response.status, ok: response.ok });
}

const response = await fetch(baseUrl, { redirect: 'follow' });
const headers = Object.fromEntries(requiredHeaders.map((name) => [name, response.headers.get(name)]));
const missingHeaders = requiredHeaders.filter((name) => !headers[name]);
const report = { baseUrl, routes: results, headers, missingHeaders };
console.log(JSON.stringify(report, null, 2));

if (results.some((item) => !item.ok) || missingHeaders.length) process.exitCode = 1;
