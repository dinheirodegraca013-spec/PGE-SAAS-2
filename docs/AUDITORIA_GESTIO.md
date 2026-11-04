# Auditoria de aceite do GESTIO

Data: 27/10/2026

## Resultado

**PASS técnico; homologação visual final pendente.** A Visão 3D usa somente o canvas WebGL Three.js, seguindo o HTML de referência; não há camada fixa sobre o canvas. Quando WebGL não renderiza, o sistema exibe uma mensagem de compatibilidade.

## Reauditoria de recuperação de senha — 04/11/2026

- Corrigido o callback de recuperação para aceitar PKCE (`code`) e tokens legados no hash (`access_token`/`refresh_token`).
- Tokens são removidos da barra de endereço após a sessão ser estabelecida.
- Verificações: `npm test -- --runInBand` (104 aprovados), `npm run lint` e `npm run build`.
- Publicação automática da nova revisão ficou pendente por limite diário da Vercel (`api-deployments-free-per-day`, retry informado de 24h); código já está no `main` do GitHub.
- A tela também oferece reenvio do link quando a sessão não foi reconhecida, sem obrigar o funcionário a obter um código inexistente.

## Evidências executadas

- `npm run lint` — aprovado.
- `npm test` — 15 testes aprovados.
- `npm run build` — aprovado; apenas avisos de chunk grande e configuração nativa do Vite.
- Vercel — deploy `dpl_3qZ9FhWhuBr6GqnxWgpwt8mmnwRP` em estado `READY`.
- Domínio — `https://gestio.dev.br/visao-3d` respondeu HTTP 200.
- Bundle publicado — contém `WebGLRenderer`, fallback visual e canvas transparente.
- Catálogo — planos Básico R$ 39,90, Profissional R$ 79,90 e Premium/Plus R$ 129,90, mensais e ativos.

## Metas verificadas

- Navegação: menu, dashboard e alias `/visao3d` apontam para a Visão 3D.
- Dados: mapa usa estoque/projetos do tenant e declara “Sem dados” sem inventar lançamentos.
- Visual: menu escuro, conteúdo claro e hierarquia inspirada no HTML 3D.
- Resiliência: falhas de fonte exibem alerta e ação de atualização.
- Mobile: canvas redimensionado por viewport, sem sobreposição fixa.

## Pendências e riscos

- A validação visual interativa em um dispositivo móvel real ainda depende de abrir a página no aparelho; a automação do Chrome desta sessão não disponibilizou a URL atual para captura.
- O bundle continua acima de 500 kB por incluir Three.js; não bloqueia o funcionamento, mas pode ser otimizado com code splitting em uma etapa posterior.
- Não foram feitas alterações no Supabase nem em permissões/RLS nesta auditoria.

## Reauditoria de produção — 04/11/2026

### Ciclo adicional — 04/11/2026

- Revisadas as funções públicas do schema `public` usadas como helpers e gatilhos.
- Revogado o `EXECUTE` de `anon` e `authenticated` para os helpers de gatilho de estoque, financeiro e normalização de plano; `current_tenant_id()` permanece disponível somente para usuários autenticados.
- Verificado no banco: nenhum desses helpers é executável anonimamente; os quatro continuam com `search_path` vazio.
- Suíte local: 105 testes, lint e auditoria estática SQL aprovados.
- O status `Vercel` do commit mais recente permanece falho por `build-rate-limit`/cota diária; o código não foi promovido automaticamente para produção.
- Advisors Supabase pós-migração: todas as tabelas `public` continuam com RLS e políticas; nenhuma função `public` é executável por `anon`. Permanece somente o aviso de configuração `auth_leaked_password_protection`, que exige habilitação no painel Auth do projeto.
- Auditoria externa repetida em 04/11/2026: 11 rotas publicadas, headers de segurança, assets, ausência de segredos no bundle, funções Edge e RPCs passaram; nenhum ajuste de produção foi necessário nesta execução.
- O build Vercel `dpl_2C1MhuLf5CAKHwKp75tqbMwk7xEx` falhou por corrupção do `src/App.tsx` na sincronização do GitHub (`Get-Content:` no arquivo). O arquivo foi restaurado e conferido no GitHub; nova publicação segue bloqueada pela cota diária.

- Rotas públicas e protegidas: 11/11 responderam HTTP 200 no domínio oficial; rotas protegidas redirecionam para login quando sem sessão.
- Headers obrigatórios: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e Permissions-Policy presentes.
- Assets publicados: todos os bundles referenciados pelo HTML responderam HTTP 200.
- Edge Functions: `cadastrar-funcionario` e `validar-anexo` rejeitam chamadas sem sessão (401); `public-orcamento` mantém contrato público com payload inválido (400); métodos HTTP inválidos foram rejeitados (405).
- RPCs sensíveis `limites_acesso` e `meu_contexto_operacional` rejeitaram chamadas anônimas (401).
- `npm test`: 101 testes aprovados; CI e quality gate do commit de produção aprovados.

### Correção aplicada

`validar-anexo` estava presente no repositório, mas ausente no projeto Supabase publicado (404). A função foi implantada como versão 1, com JWT obrigatório e dependência de validação de conteúdo incluída; a auditoria passou após a publicação.

### Pendência externa

- A proteção contra senhas vazadas permanece desativada no painel do Supabase; requer ativação administrativa no projeto, sem alteração automática nesta sessão.

### Guarda preventiva adicionada

- O quality gate agora executa `npm run audit:sql-security`, cobrindo 46 migrations e falhando se encontrar `SECURITY DEFINER` sem `search_path` fixo ou concessão de execução anônima em funções públicas.
- Resultado atual: nenhum achado.

### Fechamento de auditoria aprofundada — 04/11/2026

- `npm test -- --runInBand`: 105 aprovados, 0 falhas.
- `npm run lint`, `npm run build` e `npm run verify:integrity`: aprovados; integridade do repositório sem achados.
- `npm run audit:production`: 11/11 rotas HTTP 200, headers obrigatórios presentes, assets 200, bundle sem segredos expostos, Edge Functions/RPCs e preflight OPTIONS conforme contrato.
- Vercel: o último deploy READY ainda aponta para o commit anterior; o commit mais novo está bloqueado pela cota diária `api-deployments-free-per-day`, não por falha de código.
- Parecer: **PASS técnico local e de endpoints públicos; BLOCKED somente para promoção automática da revisão mais nova pela cota externa da Vercel**.
- Consulta direta ao catálogo do Supabase: 62 funções públicas, 0 `SECURITY DEFINER` sem `search_path` fixo e 0 funções públicas executáveis por `anon`; os avisos restantes são os RPCs autenticados intencionais e a proteção de senhas vazadas desativada.
- Nova falha de build identificada na Vercel: `src/components/RouteErrorBoundary.tsx` havia sido sincronizado como texto de erro do PowerShell. O arquivo foi restaurado no `main` do GitHub e conferido via raw; o build local permanece aprovado.
- A varredura remota encontrou e restaurou também a migration `20261104090000_restrict_internal_trigger_functions.sql` e `tests/sql-public-grants.test.mjs`; o gate `verify:integrity` passou a proteger os cinco arquivos críticos contra esse tipo de corrupção.

### Publicação e reauditoria final — 04/11/2026

- O commit `140bdf583569cf9b2fc72b3fbd493caaef4070c5` foi publicado pela Vercel em produção (`dpl_CiQb5VBbhy8XYt9MSKobC7EuyZDa`) com estado **READY**.
- O domínio `https://gestio.dev.br` foi revalidado após a publicação: 11/11 rotas, assets e headers aprovados.
- O auditor agora também compara valores exatos dos headers de segurança e valida CORS dos endpoints autenticados (`https://gestio.dev.br`, somente POST/OPTIONS).
- Resultado: `npm run audit:production` aprovado, sem segredos expostos, com Edge Functions/RPCs e preflight conforme contrato.

### Endurecimento do orçamento público — 04/11/2026

- `public-orcamento` foi atualizado para a versão 4 no Supabase, com `supabase-js` fixado em `2.117.3`.
- O corpo POST agora é limitado a 16 KiB, com resposta `413` para payload excedente; requisições inválidas continuam respondendo `400`.
- Verificação direta: payload inválido `400`, payload de 17 KiB `413` e auditoria de produção completa aprovada.
- Pós-deploy: os únicos dois `500` registrados foram testes da versão 3 durante a publicação incorreta do pacote; ambos ocorreram às 07:14 UTC. Após a versão 4, não houve `5xx` no intervalo monitorado até 07:30 UTC.
- O `audit:production` passou a testar permanentemente o limite de payload (`17 KiB` deve retornar `413`), além dos contratos de rota, headers e CORS.


