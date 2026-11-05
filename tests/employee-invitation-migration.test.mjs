import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('convite de funcionário reconcilia metadata com tenant e setor confiáveis', async () => {
  const [source, triggerSource] = await Promise.all([
    readFile('supabase/migrations/20261104123000_employee_invitation_metadata.sql', 'utf8'),
    readFile('supabase/migrations/20261103201901_employee_deferred_app_metadata.sql', 'utf8'),
  ]);
  assert.match(source, /CREATE OR REPLACE FUNCTION private\.sync_invited_employee/);
  assert.match(source, /gestio_employee/);
  assert.match(source, /gestio_tenant_id/);
  assert.match(source, /gestio_setor/);
  assert.match(source, /p\.papel='AdministradorTenant'/);
  assert.match(source, /UPDATE public\.profiles SET tenant_id=administrator\.tenant_id/);
  assert.match(triggerSource, /CREATE TRIGGER on_employee_metadata_applied/);
});

