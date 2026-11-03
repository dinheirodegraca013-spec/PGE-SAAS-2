# Painéis operacionais dos funcionários — implementação progressiva

**Objetivo:** executar integralmente a especificação do usuário (seções 1–18), com seis setores, ordens, tarefas, fichas, checklists, arquivos privados, ocorrências, aprovações, notificações e autorização por operação/recurso.

**Arquitetura:** React e Supabase existentes; RPCs com autorização no banco e RLS; funcionalidades operacionais organizadas em módulos. Reutilizar `profiles`, `tenants`, `servicos`, `projetos_marcenaria`, `orcamentos`, `clientes`, estoque, financeiro e auditoria. Serviços receberão os dados operacionais de OS, evitando outra entidade de ordens com a mesma finalidade. Pedidos comerciais, etapas, tarefas e seus vínculos são entidades ausentes e terão estruturas próprias.

**Execução:** nativa nesta sessão, sem delegação por padrão. Nenhum pedido de aprovação adicional para tarefas já autorizadas. Publicação progressiva somente após testes da etapa; funcionalidades incompletas permanecem isoladas da produção.

## Auditoria realizada

- [x] Inventário de tabelas públicas/privadas e módulos React.
- [x] Inspeção dos campos de serviços, projetos, orçamentos, estoque e perfis.
- [x] Identificação das regras atuais de setor único e dos limites 2/1, 5/2 e 15/3 já aprovados.
- [x] Identificação de melhoria necessária nos dispositivos: chave de navegador não exportável, desafio descartável, verificação no backend e vínculo à sessão assinada.

## Entregas e critérios de aceite

- [ ] **Base de autorização e funcionário** (seções 2, 12–14, 16–17): cargo, identificador, status, setor principal/adicionais; matriz por módulo/operação e escopo atribuído/setor/empresa; edição pelo proprietário; atualização imediata das permissões; financeiro independente do administrativo. Testar outro tenant, outro funcionário, setor removido, suspensão e tentativa de autoatribuição.
- [ ] **Dispositivos e sessões** (13): reforçar os dispositivos existentes com WebCrypto ECDSA e IndexedDB; desafio assinado e verificado em Edge Function; consumo atômico, expiração e proteção contra replay; impedir troca da chave pública; revogar sessão e autorização; registrar tentativas; conservar quotas e gerenciamento existentes. Testar assinatura inválida, replay, sessão distinta, alteração de ID local e corrida pela última vaga.
- [ ] **Ordens e fluxo configurável** (3–6, 9): adaptar serviços a OS e ligar pedidos/projetos; etapas Escritório → Corte → Montagem → Acabamento → Instalação, com seleção das etapas necessárias; Estoque como apoio; transições atômicas com versão/idempotência, autor, horário, pendências e documentos; impedir avanço obrigatório sem checklist ou aprovação específica.
- [ ] **Fichas dos seis setores** (3–8): todos os campos técnicos e checklists descritos na especificação; formulários organizados; ações específicas de produção, defeitos, sobras, secagem, recebimento, instalação, fotos e aceite; informações do cliente só quando autorizadas; nenhum rastreamento contínuo de localização.
- [ ] **Tarefas e agenda** (2, 10): atribuição, sete status, prioridade, prazo, percentual, observações e anexos; ações autorizadas e controle de concorrência; indicadores individuais calculados a partir dos registros reais.
- [ ] **Documentos, ocorrências e aprovações** (2–10, 14, 16): bucket privado, upload vinculado a registro autorizado, URLs temporárias, tamanho/tipo, validação da propriedade; ocorrência/retrabalho/aceite com histórico preservado; localização somente por ação explícita informada.
- [ ] **Solicitações e reservas de estoque** (7, 9): reutilizar itens/movimentações; novos vínculos de solicitação, reserva, ordem e setor; entrada/saída/devolução/ajuste/transferência; saldo não negativo e atendimento atômico/idempotente; campos técnicos de material, lote, localização e validade; custos restritos.
- [ ] **Escritório e Financeiro** (8): reaproveitar clientes/orçamentos/serviços/financeiro; permissões distintas para cadastro administrativo, descontos, aprovação, pagamentos, relatórios e informação sensível; conversão de orçamento em pedido sem duplicação.
- [ ] **Notificações e atividades** (11, 16): eventos de atribuição, prazo, prioridade, materiais, aprovação, liberação e avisos; links aos registros; histórico próprio e administrativo; todas as operações relevantes com antes/depois e resultado.
- [ ] **Painéis e navegação** (2–8, 15, 18): Meu Painel, Minhas OS, Minhas Tarefas, Meu Setor, Agenda, Documentos, Notificações, Histórico, Ocorrências e Perfil; menus vindos de capacidades do servidor; painéis específicos por setor e visão consolidada do proprietário; filtros, paginação, pesquisa e estados de erro/carregamento/vazio.
- [ ] **Homologação e liberação** (14–18): testes de integração multi-tenant, IDOR, permissões, concorrência, duplicação, fluxo completo, arquivos privados e revogação; desktop/tablet/celular; TypeScript/build; só então liberar os módulos correspondentes.

## Invariantes e decisões

- Identidade e autorização vêm de Auth validado e registros protegidos no servidor, nunca de `user_metadata` editável.
- O proprietário é `tenants.principal_usuario_id`; não ocupa sublogin e respeita quota de dispositivos.
- Permissões adicionais não podem ultrapassar os setores/recursos que o proprietário concedeu.
- Histórico não é removido quando um funcionário é bloqueado ou muda de setor.
- O downgrade preserva a regra já implantada: cadastros ativos mais antigos, ordenados por data e ID, têm precedência.
- Não declarar módulos prontos com base apenas em componentes, fixtures, contagens fictícias ou testes que não exercitem os limites do escopo.
