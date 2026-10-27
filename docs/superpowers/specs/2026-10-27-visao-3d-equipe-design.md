# Integração da Visão 3D e Equipe no GESTIO

## Intenção
Integrar o protótipo ERP 3D ao GESTIO sem misturar responsabilidades de Estoque, Dashboard e Equipe.

## Escopo
- Criar a rota/módulo **Visão 3D** no menu lateral.
- Exibir o mapa 3D como visão operacional da empresa, com setores, alertas e indicadores.
- Criar/reutilizar o módulo **Equipe** para presença, status e distribuição dos colaboradores.
- Mostrar no Dashboard somente um resumo curto, com links para Visão 3D e Equipe.
- Manter o conteúdo interno claro e o menu lateral escuro, seguindo o padrão atual.

## Fora do escopo
- Não replicar dados fictícios do XML do protótipo em produção.
- Não substituir o módulo de Estoque existente.
- Não alterar planos, pagamentos, permissões ou schema do Supabase nesta etapa.

## Dados e segurança
O mapa e a presença devem consumir dados disponíveis no GESTIO/Supabase, com estados vazios claros quando não houver registros. O protótipo 3D serve como referência visual e de interação, não como fonte de dados de produção.

## Layout escolhido
- Visão 3D: mapa amplo à esquerda/centro; alertas e KPIs em painel lateral responsivo.
- Equipe: presença e status em tabela/lista própria, com filtros por setor e status quando compatível com os dados atuais.
- Mobile: mapa acima dos alertas; equipe em lista empilhada.

## Critérios de aceite
- O item Visão 3D aparece no menu e abre sem quebrar as rotas existentes.
- O mapa não usa lançamentos inventados quando ligado aos dados reais.
- A presença fica acessível em Equipe e não é duplicada dentro do Estoque.
- Build e testes existentes continuam passando.
