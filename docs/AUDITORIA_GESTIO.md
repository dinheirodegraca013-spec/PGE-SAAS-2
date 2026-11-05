Warning: truncated output (original token count: 4747)
Total output lines: 185

# Auditoria de aceite do GESTIO

## Verificação de navegador em produção — 05/11/2026

- Navegação read-only executada no domínio oficial com o navegador: `/login`, `/cadastro`, `/redefinir-senha` e rota protegida `/visao-3d`.
- Login exibiu campos e guard de autenticação; cadastro carregou os três planos reais após a consulta assíncrona; recuperação exibiu fluxo por link e código; `/visao-3d` redirecionou corretamente para login sem sessão.
- Nenhum formulário foi submetido, nenhum dado sensível foi transmitido e não houve alteração externa durante a verificação.

## Auditoria contínua de produção — 05/11/2026

- Quality gate completo (`npm run verify:release`): 116 testes, lint, auditoria SQL, integridade do repositório, build e auditoria externa aprovados.
- Produção: 11 rotas HTTP 200, assets 200, headers de segurança sem divergências e nenhum segredo exposto no bundle.
- Supabase: Edge Functions, RPCs, métodos HTTP, limite de payload e CORS apro…4247 tokens truncated…úblicas confirmou que as funções `SECURITY DEFINER` expostas permitem execução somente a `authenticated`; não há execução anônima. Os avisos restantes correspondem a RPCs autenticados intencionais e à proteção de senhas vazadas ainda não habilitada no painel Auth.
- Nenhuma alteração de código foi necessária neste ciclo; a evidência foi registrada para manter a trilha de auditoria e orientar a próxima verificação após a liberação da cota de deploy da Vercel.
- Reexecução do `npm run verify:release`: 117 testes, typecheck, auditoria de dependências (0 vulnerabilidades), SQL, integridade, build e auditoria externa aprovados; os dois domínios responderam com 11/11 rotas válidas.
- A revisão mais recente foi promovida automaticamente pela Vercel no deploy `dpl_EEioTLLF7nGPacVTKWjJT3yeXRbM`, estado **READY**, commit `01a05c60ea8bc3073cb60857e12f5da12bbbcb6a`; a auditoria pós-publicação repetiu os mesmos resultados nos domínios principal e alternativo.


