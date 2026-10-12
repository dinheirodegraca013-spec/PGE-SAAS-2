# ERP SaaS — Frontend (React + TypeScript + Supabase)

Aplicação web (SPA) do ERP SaaS para marcenarias e prestadores de serviços, construída em **React 19 + TypeScript + Vite + Tailwind CSS v4** com integração total ao **Supabase (Database & Auth)**.

## Integração com Supabase & Vercel

O projeto está configurado para operar com **Supabase Database e Supabase Auth** reais em produção:

- **Autenticação Real**: `supabase.auth.signInWithPassword`, `signUp`, `signOut` e recuperação de senha por e-mail com persistência de sessão.
- **Isolamento Multi-tenant (RLS)**: Cada organização acessa unicamente seus próprios registros através do campo `organization_id` e políticas de Row Level Security.
- **Tabelas do Banco de Dados**:
  - `clientes`: base central de contatos.
  - `projetos`: projetos de marcenaria com ambientes e especificações em `jsonb`.
  - `servicos`: atendimentos e escopos operacionais.
  - `orcamentos`: propostas com itens, totais e suporte a aceite público por link.
  - `whatsapp_conversas` & `whatsapp_config`: triagem de mensagens e chaves da Meta Cloud API.

### Script de Criação das Tabelas e RLS
O arquivo `supabase/schema.sql` contém todo o DDL necessário (tabelas, índices e políticas de Row Level Security). Execute-o diretamente no **SQL Editor** do painel do Supabase.

### Variáveis de Ambiente na Vercel
Cadastre no projeto da Vercel (ou em `.env.local`):
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-publica-anon"
```

## Como Executar Localmente

```bash
npm install
npm run dev
```

Build de produção:
```bash
npm run build
```
