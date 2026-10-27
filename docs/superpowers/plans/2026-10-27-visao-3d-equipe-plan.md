# Visão 3D e Equipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrar a Visão 3D e a área de Equipe ao GESTIO, preservando dados reais, navegação clara e o tema claro interno.

**Architecture:** A nova rota `/visao-3d` será um módulo operacional independente. O mapa terá componentes visuais próprios e consumirá serviços existentes; a presença ficará em `/equipe`, com fonte de dados tenant-scoped. Dashboard receberá apenas resumos e links.

**Tech Stack:** React, TypeScript, React Router, Tailwind CSS, Supabase existente, Vitest/Vite.

**Spec:** `docs/superpowers/specs/2026-10-27-visao-3d-equipe-design.md`

## Global Constraints

- O conteúdo interno permanece claro e o menu lateral permanece escuro.
- O protótipo HTML é referência visual, não fonte de dados de produção.
- Não criar lançamentos fictícios para preencher indicadores.
- Não alterar schema ou permissões sem migration versionada e validação.
- Não alterar planos ou pagamentos nesta entrega.

## Review Focus

- Tenant sem estoque: mapa e alertas devem mostrar estado vazio, não exemplos.
- Tenant sem colaboradores: Equipe deve explicar a ausência de cadastro.
- Usuário sem permissão: dados de equipe não podem vazar entre tenants.
- Mobile: mapa, alertas e lista devem continuar utilizáveis.
- Falha de consulta: a tela deve informar erro e manter navegação disponível.

### Task 1: Navegação e rotas

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/layouts/navigation.ts`
- Create: `src/views/visao3d/Visao3DView.tsx`
- Create: `src/views/equipe/EquipeView.tsx`

- [ ] Adicionar as rotas autenticadas `/visao-3d` e `/equipe`.
- [ ] Adicionar os itens ao menu lateral usando ícones existentes de `lucide-react`.
- [ ] Criar estados iniciais acessíveis e claros para carregamento, erro e ausência de dados.
- [ ] Verificar navegação direta e retorno ao Dashboard.

### Task 2: Visão 3D operacional

**Files:**
- Modify: `src/views/visao3d/Visao3DView.tsx`
- Create/modify: `src/views/visao3d/components/*`
- Reuse: serviços existentes de projetos e estoque

- [ ] Implementar mapa responsivo inspirado no HTML de referência.
- [ ] Representar setores e alertas somente com dados carregados do tenant.
- [ ] Separar mapa, KPIs e lista de alertas em painéis claros.
- [ ] Adicionar link para Estoque e Equipe sem duplicar seus formulários.

### Task 3: Equipe e presença

**Files:**
- Modify: `src/views/equipe/EquipeView.tsx`
- Create/modify: serviço e tipos de equipe somente após confirmar fonte tenant-scoped
- Modify: migrations apenas se a fonte atual não atender ao requisito

- [ ] Confirmar tabela, campos e políticas RLS disponíveis para colaboradores.
- [ ] Exibir presença, status e setor em lista responsiva.
- [ ] Bloquear edição quando a permissão não existir.
- [ ] Mostrar estado vazio quando não houver equipe cadastrada.

### Task 4: Resumo do Dashboard e verificação

**Files:**
- Modify: `src/views/dashboard/DashboardView.tsx`
- Modify: `tests/*` conforme cobertura necessária

- [ ] Adicionar card-resumo com links para Visão 3D e Equipe sem criar métricas fictícias.
- [ ] Testar build, testes existentes, navegação e estados vazios.
- [ ] Registrar evidências em relatório de homologação antes de qualquer deploy.
