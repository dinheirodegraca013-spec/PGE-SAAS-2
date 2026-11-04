# Auditoria de aceite do GESTIO

Data: 27/10/2026

## Resultado

**PASS técnico; homologação visual final pendente.** A Visão 3D usa somente o canvas WebGL Three.js, seguindo o HTML de referência; não há camada fixa sobre o canvas. Quando WebGL não renderiza, o sistema exibe uma mensagem de compatibilidade.

## Reauditoria de recuperação de senha — 04/11/2026

- Corrigido o callback de recuperação para aceitar PKCE (`code`) e tokens legados no hash (`access_token`/`refresh_token`).
- Tokens são removidos da barra de endereço após a sessão ser estabelecida.
- Verificações: `npm test -- --runInBand` (104 aprovados), `npm run lint` e `npm run build`.
- Publicação automática da nova revisão ficou pendente por limite diário da Vercel (`api-deployments-free-per-day`, retry informado de 24h); código já está no `main` do GitHub.

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


