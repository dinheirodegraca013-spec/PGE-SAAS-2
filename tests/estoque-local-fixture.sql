-- Minimal disposable fixture for stock migrations. NOT the production schema.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.tenants (id uuid PRIMARY KEY, razao_social text NOT NULL);
CREATE TABLE public.projetos_marcenaria (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id)
);
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 papel text NOT NULL, ativo boolean NOT NULL DEFAULT true
);
CREATE FUNCTION private.current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
