Warning: truncated output (original token count: 4998)
Total output lines: 189

# Auditoria de aceite do GESTIO

## Verificação de navegador em produção — 05/11/2026

- Navegação read-only executada no domínio oficial com o navegador: `/login`, `/cadastro`, `/redefinir-s…4898 tokens truncated…ríticas de funcionários, limites de dispositivos, permissões multi-setor, identificador interno, metadata de convite e restrição de triggers constam como aplicadas no projeto Supabase ativo.


### Orçamento público sem UUID interno — 05/11/2026 (ciclo adicional)

- A resposta pública de `public-orcamento` deixou de retornar o UUID interno do orçamento; o fluxo continua identificando o registro exclusivamente pelo token público.
- Regressão adicionada para impedir a reintrodução do campo interno; suíte local: 118 testes aprovados e lint aprovado.
- Edge Function `public-orcamento` publicada no Supabase como versão 15, estado ACTIVE. Smoke test público com token inválido confirmou `400`, `Cache-Control: no-store` e CORS restrito ao domínio oficial.
