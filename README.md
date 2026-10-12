# ERP SaaS — Frontend (React + TypeScript)

Aplicação web (SPA) do ERP SaaS para marcenarias e prestadores de serviços, migrada para **React 19 + TypeScript + Vite + Tailwind CSS v4**.

## Recursos Implementados e Portados

- **Autenticação & Multi-tenancy**:
  - Tela de login com validação e atalho para conta demo (`/login`)
  - Tela de cadastro com escolha de planos (Free, Standard, Empresarial) e criação do tenant (`/cadastro`)
  - Sessão persistida em `localStorage` com Bearer tokens
  - Proteção de rotas com redirecionamento inteligente

- **Painel Principal (Dashboard)**:
  - Métricas dinâmicas: Projetos em andamento, orçamentos pendentes, conversas WhatsApp e total de clientes
  - Ações rápidas para agilizar o fluxo operacional

- **Gestão de Clientes (`/clientes`)**:
  - Cadastro completo com Nome, CPF/CNPJ, Telefone/WhatsApp, E-mail e Observações
  - Filtro e busca em tempo real por nome, contato ou e-mail
  - Identificação visual de origem (Manual vs. WhatsApp)

- **Módulo de Móveis Planejados (`/projetos`)**:
  - Acompanhamento de projetos por status (Orçamento, Medição Agendada, Aguardando Aprovação, Aprovado, Em Produção, Pronto, Entregue, etc.)
  - Detalhe do projeto com discriminação de ambientes, medidas técnicas (L x A x P), materiais (MDF, MDP, Lacca) e valores
  - Ação de envio do orçamento diretamente pelo WhatsApp do cliente

- **Atendimentos & Serviços (`/servicos`)**:
  - Gestão de atendimentos em andamento originados por triagem ou manuais
  - Edição de título, escopo detalhado e transição de status
  - Criador de orçamentos com múltiplos itens dinâmicos, cálculo automático de totais e observações comerciais

- **Proposta Comercial Pública & Aceite Eletrônico (`/orcamento/:id`)**:
  - Página pública limpa acessível pelo cliente final via link enviado no WhatsApp
  - Visualização completa da proposta e itens
  - Aceite e assinatura eletrônica com registro de nome, data/hora e confirmação

- **Integração WhatsApp Cloud API (`/whatsapp`)**:
  - Triagem de conversas pendentes recebidas de clientes potenciais
  - Aprovação com 1 clique (cria automaticamente o cliente e o serviço no ERP) ou opção de ignorar
  - Painel de configuração da Meta Cloud API com Phone Number ID, Access Token, Token de verificação e cópia rápida da URL do webhook

## Executando o Projeto

```bash
npm install
npm run dev
```

Build de produção:
```bash
npm run build
```
