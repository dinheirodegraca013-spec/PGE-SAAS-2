import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
const findings = [];

for (const file of files) {
  const source = await readFile(join(directory, file), 'utf8');
  const normalized = source
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

  // SECURITY DEFINER is allowed for the protected RPC model, but every
  // definition must pin search_path to avoid name-resolution attacks.
  const unsafeDefiner = /SECURITY DEFINER(?! SET SEARCH_PATH\s*(?:=|TO))/gi;
  if (unsafeDefiner.test(normalized)) findings.push(`${file}: SECURITY DEFINER without SET search_path`);

  // Anonymous execution must never be granted to functions exposed through
  // the public schema. Public links are implemented by an Edge Function.
  if (/GRANT EXECUTE ON FUNCTION\s+public\.[^;]+\bTO\s+(?:PUBLIC|anon)\b/i.test(normalized)) {
    findings.push(`${file}: public function grants EXECUTE to PUBLIC/anon`);
  }
}

console.log(JSON.stringify({ migrations: files.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;

