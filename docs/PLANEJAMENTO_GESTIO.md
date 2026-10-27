# Planejamento do GESTIO

## Ordem de execução

### Fase 0 — Alinhamento e segurança

- Conferir o escopo do PGE II, catálogo de planos e módulos existentes.
- Mapear cada tela para uma meta do produto.
- Identificar dados reais disponíveis e separar claramente protótipos demonstrativos.
- Não alterar produção ou banco sem migration, teste e autorização específica.

### Fase 1 — Navegação operacional

- Criar o módulo **Visão 3D** no menu lateral.
- Manter o conteúdo interno claro e o menu lateral escuro.
- Adicionar links de retorno entre Dashboard, Visão 3D, Estoque e Equipe.

### Fase 2 — Visão 3D

- Reaproveitar o protótipo 3D como referência de interação e hierarquia visual.
- Implementar mapa responsivo com setores, alertas e indicadores.
- Consumir dados do GESTIO quando houver fonte real.
- Exibir “sem dados” para setores ainda não cadastrados; não copiar valores fictícios do XML.

### Fase 3 — Equipe e presença

- Definir a fonte autorizada de colaboradores por tenant.
- Exibir lista de presença em módulo próprio, com status e setor.
- Aplicar RLS e permissões antes de permitir edição de presença.
- No Dashboard, mostrar somente um resumo e link para a lista completa.

### Fase 4 — Homologação

- Testar navegação, responsividade e acessibilidade.
- Rodar testes existentes, build e validações de integração.
- Conferir que Estoque e Financeiro continuam usando dados reais.
- Registrar riscos, pendências e evidências antes do deploy.

## Dependências e bloqueios conhecidos

- A integração da presença depende de confirmar a tabela/fonte de colaboradores do tenant e suas políticas RLS.
- O mapa 3D não pode assumir os dados demonstrativos do HTML como dados de produção.
- A publicação em Vercel só deve ocorrer após a homologação da fase 4.

## Entregáveis

- Documento de metas.
- Documento de planejamento.
- Especificação da Visão 3D e Equipe.
- Implementação versionada com testes e evidências de build.

## Registro de homologação — 27/10/2026

- Código local: `4b4859a` — testes, lint e build aprovados.
- Preview Vercel validado: HTTP 200 no deploy `dpl_9Ep91YrtysF4TrzZzyzNLhd6bdUX`.
- Domínio `gestio.dev.br`: HTTP 200 e rollback anterior preservado.
- Pendência externa: o preview publicado corresponde ao commit `48d5654`; o commit local `4b4859a` ainda aguarda novo build por limite de deploy da Vercel.
- Presença diária: o banco atual não fornece registro de presença; a interface informa explicitamente “Presença não registrada”.

