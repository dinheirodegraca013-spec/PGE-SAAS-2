# Auditoria de aceite do GESTIO

## Verificação de navegador em produção — 05/11/2026

- Navegação read-only executada no domínio oficial com o navegador: `/login`, `/cadastro`, `/redefinir-senha` e rota protegida `/visao-3d`.
- Login exibiu campos e guard de autenticação; cadastro carregou os três planos reais após a consulta assíncrona; recuperação exibiu fluxo por link e código; `/visao-3d` redirecionou corretamente para login sem sessão.
- Nenhum formulário foi submetido, nenhum dado sensível foi transmitido e não houve alteração externa durante a verificação.

## Auditoria contínua de produção — 05/11/2026

- Quality gate completo (`npm run verify:release`): 116 testes, lint, auditoria SQL, integridade do repositório, build e auditoria externa aprovados.
- Produção: 11 rotas HTTP 200, assets 200, headers de segurança sem divergências e nenhum segredo exposto no bundle.
- Supabase: Edge Functions, RPCs, métodos HTTP, limite de payload e CORS aprovados para `https://gestio.dev.br` e `https://www.gestio.dev.br`; origem externa não é autorizada.
- Deploy Vercel READY em produção (`dpl_HhMp8QRFE4HrYTMWjTmDtuP12YLX`); funções `cadastrar-funcionario`, `validar-anexo` e `public-orcamento` ativas no Supabase.
- Permanece apenas o aviso externo `auth_leaked_password_protection`, que depende da habilitação no painel Auth do Supabase; não há API disponível no projeto para alterar essa configuração com segurança.

### Logs de produção

- Consulta read-only do período de 04/11/2026 12:00 UTC a 05/11/2026 12:00 UTC: nenhuma resposta HTTP 500 encontrada nos logs.
- As respostas 401, 400, 405 e 413 observadas correspondem às verificações automatizadas de autenticação, método, payload e CORS; não foram identificados erros 5xx ou exceções de aplicação.
- Vercel Runtime Errors nas últimas 24 horas: nenhum erro agregado no projeto de produção.
- O quality gate passou a executar `npm audit --omit=dev --audit-level=high`; resultado atual: 0 vulnerabilidades.

Data: 05/11/2026

## Resultado

**PASS técnico; homologação visual final pendente.** A Visão 3D usa somente o canvas WebGL Three.js, seguindo o HTML de referência; não há camada fixa sobre o canvas. Quando WebGL não renderiza, o sistema exibe uma mensagem de compatibilidade.

O gate reproduzível de release é `npm run verify:release`; ele reúne testes, typecheck, auditorias SQL/integridade, build e auditoria dos endpoints em produção.

Em 05/11/2026, o lockfile foi corrigido para incluir `@emnapi/wasi-threads@1.2.3`; a instalação limpa (`npm ci --ignore-scripts`) e o gate completo passaram após a correção.

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
- A auditoria agora valida também o valor exato da CSP (`frame-ancestors`, `frame-src`, `form-action`, `object-src` e `base-uri`), evitando regressões por cabeçalho apenas parcialmente configurado.
- Assets publicados: todos os bundles referenciados pelo HTML responderam HTTP 200.
- Edge Functions: `cadastrar-funcionario` e `validar-anexo` rejeitam chamadas sem sessão (401); `public-orcamento` mantém contrato público com payload inválido (400); métodos HTTP inválidos foram rejeitados (405).
- RPCs sensíveis `limites_acesso` e `meu_contexto_operacional` rejeitaram chamadas anônimas (401).
- `npm test`: 101 testes aprovados; CI e quality gate do commit de produção aprovados.

### Correção aplicada

`validar-anexo` estava presente no repositório, mas ausente no projeto Supabase publicado (404). A função foi implantada como versão 1, com JWT obrigatório e dependência de validação de conteúdo incluída; a auditoria passou após a publicação.

### Pendência externa

- A proteção contra senhas vazadas permanece desativada no painel do Supabase; requer ativação administrativa no projeto, sem alteração automática nesta sessão.

### Guarda preventiva adicionada

- O quality gate agora executa `npm run audit:sql-security`, cobrindo 49 migrations e falhando se encontrar `SECURITY DEFINER` sem `search_path` fixo ou concessão de execução anônima em funções públicas.
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
- Respostas do orçamento público agora enviam `Cache-Control: no-store, max-age=0`; o auditor valida esse cabeçalho junto com o `413`.
- A versão 6 também compensa a assinatura do orçamento se a atualização do serviço vinculado falhar, evitando estado parcialmente confirmado; teste contratual incluído e suíte com 106 aprovações.
- Logs de 05/11/2026: versão 6 respondeu ao teste de limite com `413` e não registrou nenhum `5xx`; as respostas observadas das versões anteriores foram `200`, `400` e `413` conforme esperado.
- Dependência `@supabase/supabase-js` atualizada para `2.119.0`; `npm audit --omit=dev` continua sem vulnerabilidades, com testes, lint e build aprovados.
- A versão 7 exige que o serviço vinculado seja efetivamente atualizado antes de confirmar o orçamento; serviço inexistente ou de outro tenant dispara compensação e erro seguro.
- A versão 8 de `public-orcamento` está ativa com limite de payload de 16 KiB, resposta `413` sem cache e compensação da assinatura quando a etapa vinculada falha.
- `validar-anexo` foi republicada como versão 2 com o helper de assinatura empacotado no próprio bundle; `401`, `405`, CORS e validação de conteúdo foram revalidados em produção.
- Auditoria final pós-publicação: 11 rotas, cabeçalhos de segurança, assets, endpoints, métodos, CORS e limite de payload aprovados; suíte com 106 testes, lint, build e integridade aprovados.
- Guarda preventiva adicionada para manter `cadastrar-funcionario`, `public-orcamento` e `validar-anexo` na mesma versão fixa do cliente Supabase; suíte atualizada para 107 testes aprovados.
- Respostas das funções autenticadas agora exigem `Cache-Control: no-store, max-age=0`; o auditor de produção valida esse cabeçalho junto com os códigos HTTP e CORS.
- O fluxo de convite foi verificado no banco: 1 funcionário, 0 sem tenant e 0 divergências entre metadata, empresa e setor; foi criado teste de regressão para o trigger de metadata diferida (108 testes aprovados).
- Smoke test visual read-only em produção (`https://gestio.dev.br`): login, cadastro, redefinição de senha e rota pública de orçamento inválido carregaram com conteúdo e campos esperados; não foram enviados dados sensíveis nem submetidos formulários.
- Console do navegador sem erros ou avisos nas telas públicas auditadas.
- Regressão adicionada para impedir que rotas operacionais sejam expostas sem `RequireAuth` ou que guards administrativos sejam removidos; a suíte passou de 108 para 110 testes.
- Vercel Runtime Errors: nenhum erro agregado nas últimas 24 horas após o deploy mais recente.
- As Edge Functions passaram a declarar `X-Content-Type-Options: nosniff` e `Referrer-Policy: no-referrer`; o auditor de produção agora verifica esses headers diretamente. Versões publicadas: `public-orcamento` v9, `cadastrar-funcionario` v9 e `validar-anexo` v4.
- Reauditoria pós-publicação: 11/11 rotas, assets, headers, CORS, métodos, payload de 17 KiB (`413`) e headers de proteção das funções aprovados.
- O CORS do `public-orcamento` foi restringido de `*` para `https://gestio.dev.br`; a função está na versão v10 e o preflight agora confirma somente a origem oficial e os métodos necessários.
- O auditor também verifica `nosniff` e `no-referrer` nas respostas `OPTIONS` de todas as Edge Functions; preflights de produção aprovados.
- A CSP da aplicação foi endurecida com `frame-src 'none'` e `form-action 'self'`, mantendo o checkout via navegação JavaScript e bloqueando embedding/envio de formulários para origens externas.
- Varredura preventiva adicionada para bloquear regressões com `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `eval` e `new Function`; suíte atual: 113 testes aprovados.
- O endpoint `public-orcamento` passou a rejeitar `PUT`, `PATCH` e `DELETE` imediatamente com `405`, antes de validar token; o auditor agora cobre `PUT` e `DELETE`. Publicação atual: v11.

### Reauditoria contínua — 05/11/2026

- Smoke test visual read-only no domínio oficial: página inicial, login, recuperação de senha e cadastro carregaram; os planos apareceram após o carregamento assíncrono.
- Nenhum formulário foi submetido e nenhum dado sensível foi transmitido durante a verificação.
- O auditor de produção passou a exigir `Vary: Origin` no preflight do orçamento público; produção respondeu `200` com `Access-Control-Allow-Origin: https://gestio.dev.br` e `Vary: Accept-Encoding, Origin`.
- Links externos que abrem nova aba foram protegidos com `rel="noopener noreferrer"`, com regressão automatizada adicionada.
- Suíte atual: 114 testes aprovados; auditoria de produção: 11 rotas, 0 headers ausentes, 0 divergências, 0 segredos, 0 falhas de endpoint/método.

### Endurecimento do cadastro de funcionários — 05/11/2026

- O endpoint `cadastrar-funcionario` passou a limitar o corpo da requisição a 16 KiB, rejeitando payloads excedentes com `413` antes de consultar a sessão ou o banco.
- Teste de regressão incluído para garantir que payloads abusivos não avancem no fluxo de cadastro.
- Produção recebeu os commits `2f0200a` e `1d07c00`, ambos READY; `npm run audit:production`, lint e testes direcionados aprovados.

### CSP de produção endurecida — 05/11/2026

- A política agora restringe scripts, fontes, estilos, imagens e conexões às origens necessárias, mantendo Supabase e Google Fonts explicitamente permitidos.
- O auditor de produção foi atualizado para comparar o novo valor completo; produção respondeu sem divergências, com 11 rotas, assets e endpoints aprovados.

### Reauditoria contínua — 05/11/2026 (ciclo adicional)

- A varredura de produção foi repetida: 11 rotas no domínio principal e no `www`, headers obrigatórios, assets, CORS, métodos HTTP, payload de 17 KiB e RPCs anônimos conforme o contrato.
- `npm run audit:sql-security` e `npm run verify:integrity` passaram sem achados.
- Removido do serviço de orçamentos o helper legado que gerava URLs `http://localhost:5000/api`; não havia consumidores nem endpoint correspondente.
- Suíte local: 117 testes aprovados e lint aprovado; foi adicionada uma guarda contra a reintrodução de URLs de API local no serviço de orçamentos.
- Advisors Supabase continuam sem achados críticos; permanecem os avisos intencionais de tabelas privadas sem políticas próprias, RPCs `SECURITY DEFINER` autenticados e a proteção de senhas vazadas, que exige habilitação manual no painel Auth.
- A nova publicação foi tentada, mas a Vercel recusou por cota diária (`api-deployments-free-per-day`); o último deploy publicado permanece `READY`.
- O auditor de produção passou a falhar se os bundles publicados contiverem o fallback `localhost:5000`; a checagem foi executada nos dois domínios sem referências locais.


