import { TenantPlano } from '@/types/api';

export interface PlanoDefinicao {
  id?: string;
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
    valor: TenantPlano.Basico,
    nome: 'Básico',
    precoMensal: 'R$ 39,90/mês',
    descricao: 'Para microempresas que querem substituir planilhas manuais.',
    recursos: ['Gestão de Estoque e Insumos'],
  },
  {
    valor: TenantPlano.Profissional,
    nome: 'Profissional',
    precoMensal: 'R$ 79,90/mês',
    descricao: 'Para empresas com rotina ativa de produção.',
    recursos: [
      'Estoque e Insumos',
      'Pedidos',
      'Produção',
      'Financeiro integrados',
    ],
    destaque: true,
  },
  {
    valor: TenantPlano.Premium,
    nome: 'Premium/Plus',
    precoMensal: 'R$ 129,90/mês',
    descricao: 'Para empresas com maior demanda operacional e gerencial.',
    recursos: [
      'Todas as funcionalidades',
      'Suporte prioritário',
      'Relatórios avançados',
    ],
  },
];
