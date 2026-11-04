import { readFile } from 'node:fs/promises';

const checks = [
  ['src/App.tsx', value => value.startsWith('/**') && value.includes('export default function App')],
  ['src/components/RouteErrorBoundary.tsx', value => value.startsWith('import { Component') && value.includes('export default class RouteErrorBoundary')],
  ['package.json', value => { JSON.parse(value); return true; }],
  ['scripts/audit-production.mjs', value => value.startsWith('const baseUrl')],
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

console.log(JSON.stringify({ checks: checks.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;

