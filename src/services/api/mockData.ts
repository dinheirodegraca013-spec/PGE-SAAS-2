import { Cliente } from '@/modules/clientes/types/cliente';
import { ProjetoMovelPlanejado, StatusProjeto, MaterialPadrao } from '@/modules/furniture/types/projeto';
import { Servico } from '@/modules/servicos/types/servico';
import { Orcamento } from '@/modules/orcamentos/types/orcamento';
import { ConversaPendente } from '@/modules/whatsapp/types/conversaPendente';
import { WhatsAppConfiguracao } from '@/modules/whatsapp/types/whatsappConfig';
import { UsuarioAutenticado } from '@/types/api';

export const INITIAL_USER: UsuarioAutenticado = {
  usuarioId: 'usr-admin-01',
  tenantId: 'tnt-marcenaria-arte',
  nomeCompleto: 'Carlos Eduardo Oliveira',
  email: 'carlos@marcenariaarte.com.br',
  papel: 'AdministradorTenant',
  plano: 'Standard',
};

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-001',
    nome: 'Mariana Fontes Souza',
    cpfCnpj: '321.654.987-12',
    email: 'mariana.fontes@gmail.com',
    telefoneWhatsApp: '+55 11 98765-4321',
    observacoes: 'Apartamento novo na Vila Madalena, entrega prevista para novembro.',
    origem: 'WhatsApp',
    createdAtUtc: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cli-002',
    nome: 'Roberto Albuquerque Pinto',
    cpfCnpj: '112.443.556-89',
    email: 'roberto.albuquerque@empresa.com.br',
    telefoneWhatsApp: '+55 11 97654-3210',
    observacoes: 'Reforma do escritório comercial, precisa de armários e mesa de reunião.',
    origem: 'Manual',
    createdAtUtc: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'cli-003',
    nome: 'Juliana Mendes Castilho',
    cpfCnpj: '445.667.889-01',
    email: 'juliana.castilho@outlook.com',
    telefoneWhatsApp: '+55 11 99123-4567',
    observacoes: 'Cozinha compacta e painel ripado na sala de TV.',
    origem: 'WhatsApp',
    createdAtUtc: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const INITIAL_PROJETOS: ProjetoMovelPlanejado[] = [
  {
    id: 'proj-001',
    clienteId: 'cli-001',
    titulo: 'Cozinha Planejada e Suíte Master',
    status: StatusProjeto.EmProducao,
    dataMedicaoAgendada: new Date(Date.now() - 10 * 86400000).toISOString(),
    dataPrevistaEntrega: new Date(Date.now() + 15 * 86400000).toISOString(),
    valorTotalOrcamento: 24850,
    observacoes: 'MDF Louro Freijó com puxadores ocultos e amortecedores Blum.',
    ambientes: [
      {
        id: 'amb-01',
        nome: 'Cozinha Integrada',
        dimensoesDescricao: '3,80m x 2,60m x 2,70m altura',
        itens: [
          {
            id: 'it-01',
            descricao: 'Armário superior 3 portas basculantes vidro reflecta',
            material: MaterialPadrao.MdfTexturizado,
            larguraMetros: 2.4,
            alturaMetros: 0.8,
            profundidadeMetros: 0.35,
            valorUnitario: 4200,
            quantidade: 1,
          },
          {
            id: 'it-02',
            descricao: 'Bancada inferior com gavetões para panelas e torre quente',
            material: MaterialPadrao.MdfTexturizado,
            larguraMetros: 3.2,
            alturaMetros: 0.88,
            profundidadeMetros: 0.65,
            valorUnitario: 8900,
            quantidade: 1,
          },
        ],
      },
      {
        id: 'amb-02',
        nome: 'Suíte Master (Guarda-roupa)',
        dimensoesDescricao: '4,10m x 3,20m',
        itens: [
          {
            id: 'it-03',
            descricao: 'Roupeiro 4 portas deslizantes com iluminação em fita LED embutida',
            material: MaterialPadrao.MdfColorido,
            larguraMetros: 3.0,
            alturaMetros: 2.65,
            profundidadeMetros: 0.62,
            valorUnitario: 11750,
            quantidade: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'proj-002',
    clienteId: 'cli-002',
    titulo: 'Sala de Reuniões & Estação de Trabalho',
    status: StatusProjeto.Orcamento,
    dataMedicaoAgendada: new Date(Date.now() + 3 * 86400000).toISOString(),
    valorTotalOrcamento: 14200,
    observacoes: 'Mesa oval para 8 lugares com caixa de conectividade HDMI/USB.',
    ambientes: [
      {
        id: 'amb-03',
        nome: 'Sala de Reuniões',
        dimensoesDescricao: '5,00m x 4,00m',
        itens: [
          {
            id: 'it-04',
            descricao: 'Mesa de conferência estruturada com passa-fios central',
            material: MaterialPadrao.MdfTexturizado,
            larguraMetros: 3.2,
            alturaMetros: 0.75,
            profundidadeMetros: 1.2,
            valorUnitario: 6800,
            quantidade: 1,
          },
          {
            id: 'it-05',
            descricao: 'Aparador buffet com portas de correr para café e copos',
            material: MaterialPadrao.MdfBranco,
            larguraMetros: 1.8,
            alturaMetros: 0.85,
            profundidadeMetros: 0.45,
            valorUnitario: 7400,
            quantidade: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'proj-003',
    clienteId: 'cli-003',
    titulo: 'Home Theater Ripado e Bar',
    status: StatusProjeto.AguardandoAprovacaoCliente,
    dataPrevistaEntrega: new Date(Date.now() + 25 * 86400000).toISOString(),
    valorTotalOrcamento: 9600,
    observacoes: 'Painel ripado até o teto com rack suspenso.',
    ambientes: [
      {
        id: 'amb-04',
        nome: 'Living / Home',
        dimensoesDescricao: '3,50m x 2,80m',
        itens: [
          {
            id: 'it-06',
            descricao: 'Painel ripado em Carvalho Malva com nicho iluminado',
            material: MaterialPadrao.MdfTexturizado,
            larguraMetros: 2.8,
            alturaMetros: 2.7,
            profundidadeMetros: 0.08,
            valorUnitario: 5800,
            quantidade: 1,
          },
          {
            id: 'it-07',
            descricao: 'Rack suspenso com 3 gavetas frente espelhada',
            material: MaterialPadrao.MdfColorido,
            larguraMetros: 2.4,
            alturaMetros: 0.45,
            profundidadeMetros: 0.4,
            valorUnitario: 3800,
            quantidade: 1,
          },
        ],
      },
    ],
  },
];

export const INITIAL_SERVICOS: Servico[] = [
  {
    id: 'srv-001',
    clienteId: 'cli-001',
    clienteNome: 'Mariana Fontes Souza',
    titulo: 'Cozinha Planejada e Suíte Master',
    escopo: 'Fabricação e montagem completa de armários planejados para cozinha integrada e roupeiro para quarto casal.',
    status: 'EmAndamento',
    origem: 'WhatsApp',
    createdAtUtc: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'srv-002',
    clienteId: 'cli-002',
    clienteNome: 'Roberto Albuquerque Pinto',
    titulo: 'Mobiliário Corporativo para Escritório',
    escopo: 'Mesa de reuniões com canaletas técnicas, armários para arquivo e estante decorativa.',
    status: 'OrcamentoEnviado',
    origem: 'Manual',
    createdAtUtc: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'srv-003',
    clienteId: 'cli-003',
    clienteNome: 'Juliana Mendes Castilho',
    titulo: 'Painel Ripado Home Theater',
    escopo: 'Painel de parede ripado em MDF Carvalho com nichos para aparelhos e iluminação LED.',
    status: 'EscopoDefinido',
    origem: 'WhatsApp',
    createdAtUtc: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const INITIAL_ORCAMENTOS: Orcamento[] = [
  {
    id: 'orc-001',
    servicoId: 'srv-001',
    itens: [
      { descricao: 'Armários superiores cozinha com portas basculantes', quantidade: 1, valorUnitario: 4200, valorTotal: 4200 },
      { descricao: 'Módulos inferiores pia e torre de fornos', quantidade: 1, valorUnitario: 8900, valorTotal: 8900 },
      { descricao: 'Roupeiro suíte master com ferragens amortecidas', quantidade: 1, valorUnitario: 11750, valorTotal: 11750 },
    ],
    valorTotal: 24850,
    dataValidade: new Date(Date.now() + 15 * 86400000).toISOString(),
    observacoesGerais: 'Pagamento em até 6x sem juros ou 5% de desconto à vista via Pix. Garantia de 5 anos.',
    status: 'Assinado',
    temPdfAssinado: true,
    assinadoPorNome: 'Mariana Fontes Souza',
    assinadoEmUtc: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'orc-002',
    servicoId: 'srv-002',
    itens: [
      { descricao: 'Mesa de reuniões corporativa 3,20m x 1,20m', quantidade: 1, valorUnitario: 6800, valorTotal: 6800 },
      { descricao: 'Aparador buffet com portas de correr', quantidade: 1, valorUnitario: 7400, valorTotal: 7400 },
    ],
    valorTotal: 14200,
    dataValidade: new Date(Date.now() + 10 * 86400000).toISOString(),
    observacoesGerais: 'Prazo de montagem: 18 dias úteis após aprovação.',
    status: 'Pendente',
    temPdfAssinado: false,
  },
  {
    id: 'orc-003',
    servicoId: 'srv-003',
    itens: [
      { descricao: 'Painel ripado sob medida até o teto', quantidade: 1, valorUnitario: 5800, valorTotal: 5800 },
      { descricao: 'Rack suspenso com gaveteiro e passa cabo', quantidade: 1, valorUnitario: 3800, valorTotal: 3800 },
    ],
    valorTotal: 9600,
    dataValidade: new Date(Date.now() + 7 * 86400000).toISOString(),
    observacoesGerais: 'Instalação inclusa na Grande São Paulo.',
    status: 'Pendente',
    temPdfAssinado: false,
  },
];

export const INITIAL_CONVERSAS_PENDENTES: ConversaPendente[] = [
  {
    id: 'conv-001',
    telefoneOrigemE164: '+5511994567890',
    ultimaMensagemTexto: 'Olá, gostaria de saber se vocês fazem orçamento para um closet sob medida no Brooklin?',
    primeiraMensagemEmUtc: new Date(Date.now() - 3 * 3600000).toISOString(),
    ultimaMensagemEmUtc: new Date(Date.now() - 25 * 60000).toISOString(),
    quantidadeMensagens: 4,
    status: 'Pendente',
  },
  {
    id: 'conv-002',
    telefoneOrigemE164: '+5511988776655',
    ultimaMensagemTexto: 'Vocês atendem região de Alphaville? Quero orçar gabinetes de banheiro e lavabo.',
    primeiraMensagemEmUtc: new Date(Date.now() - 14 * 3600000).toISOString(),
    ultimaMensagemEmUtc: new Date(Date.now() - 2 * 3600000).toISOString(),
    quantidadeMensagens: 3,
    status: 'Pendente',
  },
  {
    id: 'conv-003',
    telefoneOrigemE164: '+5511977665544',
    ultimaMensagemTexto: 'Boa tarde! Qual é o prazo médio de entrega para uma cozinha planejada?',
    primeiraMensagemEmUtc: new Date(Date.now() - 28 * 3600000).toISOString(),
    ultimaMensagemEmUtc: new Date(Date.now() - 6 * 3600000).toISOString(),
    quantidadeMensagens: 2,
    status: 'Pendente',
  },
];

export const INITIAL_WHATSAPP_CONFIG: WhatsAppConfiguracao = {
  configurado: true,
  numeroOrigem: '+55 11 99988-7766',
  phoneNumberIdMascarado: '••••••••8912',
  businessAccountIdMascarado: '••••••••4301',
  configuradoEmUtc: new Date(Date.now() - 20 * 86400000).toISOString(),
  webhookUrl: 'https://ais-dev-vhx3yidnlylqp2sannik7k-796422315639.us-east1.run.app/api/whatsapp/webhook',
};
