import { TenantPlano } from '@/types/api';

export interface PlanoDefinicao {
  valor: TenantPlano;
  nome: string;
  precoMensal: string;
  descricao: string;
  recursos: string[];
  destaque?: boolean;
}

/**
 * Definição dos planos exibidos na tela de cadastro.
 */
export const planos: PlanoDefinicao[] = [
  {
    valor: TenantPlano.Free,
    nome: 'Free',
    precoMensal: 'R$ 0',
    descricao: 'Para testar o sistema e projetos pequenos.',
    recursos: ['Até 10 clientes cadastrados', '1 usuário', 'Módulo de Móveis Planejados', 'Suporte por e-mail'],
  },
  {
    valor: TenantPlano.Standard,
    nome: 'Standard',
    precoMensal: 'R$ 149/mês',
    descricao: 'Para marcenarias em operação, com equipe.',
    recursos: [
      'Clientes ilimitados',
      'Até 5 usuários',
      'Integração com WhatsApp',
      'Relatórios e dashboards',
      'Suporte prioritário',
    ],
    destaque: true,
  },
  {
    valor: TenantPlano.Empresarial,
    nome: 'Empresarial',
    precoMensal: 'R$ 399/mês',
    descricao: 'Para operações maiores, com múltiplas equipes.',
    recursos: [
      'Tudo do plano Standard',
      'Usuários ilimitados',
      'Múltiplos módulos de negócio',
      'Papéis e permissões avançadas',
      'Suporte dedicado',
    ],
  },
];
