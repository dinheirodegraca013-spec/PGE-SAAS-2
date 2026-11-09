import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const checks = [
  ['src/App.tsx', value => value.startsWith('/**') && value.includes('export default function App')],
  ['src/components/RouteErrorBoundary.tsx', value => value.startsWith('import { Component') && value.includes('export default class RouteErrorBoundary')],
  ['package.json', value => { const parsed = JSON.parse(value); return parsed.engines?.node === '>=22 <25'; }],
  ['.github/workflows/quality.yml', value => /node-version:\s*22\b/.test(value)],
  ['scripts/audit-production.mjs', value => /const baseUrl =/.test(value)],
  ['supabase/migrations/20261104090000_restrict_internal_trigger_functions.sql', value => value.startsWith('-- Internal compatibility')],
  ['tests/sql-public-grants.test.mjs', value => value.startsWith("import test from 'node:test'")],
];

const findings = [];
for (const [path, predicate] of checks) {
  try {
    const content = await readFile(path, 'utf8');
    if (!predicate(content)) findings.push(`${path}: conteúdo inesperado`);
  } catch (error) {
    findings.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const suspiciousMarkers = ['Get-Content:', 'Cannot find path', 'The system cannot find the path', 'Warning: truncated output'];
const textExtensions = new Set(['.ts', '.tsx', '.mjs', '.js', '.json', '.yml', '.yaml', '.sql']);
async function scanDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name) && path !== join('supabase', '.temp')) await scanDirectory(path);
      continue;
    }
    if (!textExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue;
    const content = await readFile(path, 'utf8');
    if (suspiciousMarkers.some(marker => content.slice(0, 256).includes(marker))) findings.push(`${path}: marcador de corrupção encontrado`);
  }
}
await scanDirectory('.');

console.log(JSON.stringify({ checks: checks.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;

