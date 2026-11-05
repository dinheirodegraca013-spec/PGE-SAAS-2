Warning: truncated output (original token count: 4677)
Total output lines: 184

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
- O quality gate passou a executar `npm audit --omit=dev --audit-level=hi…3677 tokens truncated…TTP, payload de 17 KiB e RPCs anônimos conforme o contrato.
- `npm run audit:sql-security` e `npm run verify:integrity` passaram sem achados.
- Removido do serviço de orçamentos o helper legado que gerava URLs `http://localhost:5000/api`; não havia consumidores nem endpoint correspondente.
- Suíte local: 117 testes aprovados e lint aprovado; foi adicionada uma guarda contra a reintrodução de URLs de API local no serviço de orçamentos.
- Advisors Supabase continuam sem achados críticos; permanecem os avisos intencionais de tabelas privadas sem políticas próprias, RPCs `SECURITY DEFINER` autenticados e a proteção de senhas vazadas, que exige habilitação manual no painel Auth.
- A nova publicação foi tentada, mas a Vercel recusou por cota diária (`api-deployments-free-per-day`); o último deploy publicado permanece `READY`.
- O auditor de produção passou a falhar se os bundles publicados contiverem o fallback `localhost:5000`; a checagem foi executada nos dois domínios sem referências locais.

### Auditoria de logs e autorização — 05/11/2026 (ciclo adicional)

- Consulta direta aos logs do Supabase no intervalo UTC de 04/11/2026 12:00 a 05/11/2026 12:00 não encontrou respostas HTTP 500, 501, 502 ou 503.
- A catalogação das funções públicas confirmou que as funções `SECURITY DEFINER` expostas permitem execução somente a `authenticated`; não há execução anônima. Os avisos restantes correspondem a RPCs autenticados intencionais e à proteção de senhas vazadas ainda não habilitada no painel Auth.
- Nenhuma alteração de código foi necessária neste ciclo; a evidência foi registrada para manter a trilha de auditoria e orientar a próxima verificação após a liberação da cota de deploy da Vercel.
- Reexecução do `npm run verify:release`: 117 testes, typecheck, auditoria de dependências (0 vulnerabilidades), SQL, integridade, build e auditoria externa aprovados; os dois domínios responderam com 11/11 rotas válidas.


