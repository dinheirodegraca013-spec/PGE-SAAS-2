# GESTIO — reconciliação do PR #5 (20/10/2026)

Escopo: comparação somente leitura entre `main` (`5e923620`) e `audit/pge2-financeiro-base-20261019` (`5bddbc34`). Nenhum deploy ou escrita em banco.

- PR #5: aberto, em rascunho, com conflito. PR #7: integrado à `main`.
- `FinanceiroEmpresaView.tsx`: as linhas da proposta do PR #5 estão presentes na `main`; a implementação atual contém recursos adicionais.
- `pge2_financeiro_base.sql`: todas as linhas não vazias da proposta constam na `main`, com ajustes posteriores.
- `financeiro_rls.sql`: a `main` amplia os testes; duas linhas exclusivas do PR #5 são comentários históricos sobre a ausência de RPCs de escrita.
- `SettingsView.tsx`: a proposta antiga omite `tenants.logo_url`, `tenants.data_contratacao`, `tenants.inicio_utilizacao` e `profiles.avatar_url`. Consulta de metadados ao Supabase confirmou que essas colunas existem. Não restaurar a versão antiga sem motivo.
- CI: último commit do PR #7 teve CI #273, Financeiro PostgreSQL #39 e RPCs autenticadas #17 aprovados.

**Recomendação:** encerrar o PR #5 como substituído pelo PR #7, sem merge. A atualização de metadados do PR #5 foi bloqueada pela ferramenta; o PR permanece aberto.

**Pendências:** testes transacionais concorrentes reais, homologação de compras/fornecedores/produção/dashboard, revisão de permissões e validação de deploy. Os arquivos `concurrency-plan.md` e `test_rpc_concurrency.py` nesta branch são apenas planejamento e preflight, não prova de concorrência transacional.
