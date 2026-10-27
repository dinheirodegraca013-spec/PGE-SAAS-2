# Metas do GESTIO

## Meta principal
Entregar uma versão do GESTIO alinhada ao PGE II: uma plataforma simples para micro e pequenas marcenarias controlarem clientes, projetos, orçamentos, estoque, produção e financeiro com dados reais.

## Metas de produto

1. **Operação centralizada** — permitir acompanhar projetos, tarefas, estoque e financeiro em um único painel.
2. **Visibilidade operacional** — oferecer a Visão 3D como mapa de setores e alertas, sem substituir os módulos transacionais.
3. **Equipe rastreável** — apresentar presença, setor e status dos colaboradores com origem de dados identificada.
4. **Dados confiáveis** — não exibir lançamentos fictícios como se fossem dados da empresa; estados vazios devem ser explícitos.
5. **Planos coerentes** — manter os planos alinhados ao documento do PGE II: Básico R$ 39,90, Profissional R$ 79,90 e Premium/Plus R$ 129,90.
6. **Segurança multiempresa** — preservar autenticação, RLS e isolamento por tenant.
7. **Publicação controlada** — validar build, testes, variáveis, backup e rollback antes de promover alterações para produção.
8. **Visão operacional acessível** — abrir a Visão 3D pelo menu, dashboard e links antigos sem rota quebrada.
9. **Resiliência de carregamento** — manter o mapa visível mesmo quando uma fonte de dados falhar, com erro recuperável e ação de atualizar.
10. **Experiência responsiva** — preservar a leitura do mapa, alertas e indicadores em desktop, tablet e celular.
11. **Rastreabilidade de indicadores** — cada número exibido deve vir de estoque/projetos reais ou declarar “Sem dados”.
12. **Consistência visual** — manter menu lateral escuro, área interna clara e hierarquia baseada no protótipo ERP 3D.

## Critérios de sucesso

- Usuário encontra mapa, estoque, projetos e equipe sem duplicidade de funções.
- Cada indicador informa sua origem ou mostra estado vazio quando não há dados.
- Fluxos essenciais continuam funcionando após a integração.
- Build, testes e verificação de produção passam sem regressões críticas.

