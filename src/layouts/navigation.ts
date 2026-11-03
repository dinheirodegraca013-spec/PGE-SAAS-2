import { Home, Users, MessageCircle, Sofa, Settings, Briefcase, Phone, Wallet, Package, Boxes, UserRoundCheck, LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Navegação lateral, agrupada por origem (Core vs. módulo de negócio).
 */
export const navGroups: NavGroup[] = [
  {
    title: 'Espaço de trabalho',
    items: [
      { label: 'Visão geral', path: '/', icon: Home },
      { label: 'Clientes', path: '/clientes', icon: Users },
      { label: 'Serviços', path: '/servicos', icon: Briefcase },
      { label: 'Financeiro', path: '/meu-financeiro', icon: Wallet },
      { label: 'Operação 3D', path: '/visao-3d', icon: Boxes },
      { label: 'Equipe', path: '/equipe', icon: UserRoundCheck },
      // Módulo WhatsApp temporariamente oculto do menu
      // { label: 'Conversas WhatsApp', path: '/whatsapp', icon: MessageCircle },
    ],
  },
  {
    title: 'Móveis Planejados',
    items: [
      { label: 'Projetos e Orçamentos', path: '/projetos', icon: Sofa },
      { label: 'Estoque', path: '/estoque', icon: Package },
    ],
  },
  {
    title: 'Sistema',
    items: [
      // Módulo WhatsApp temporariamente oculto do menu
      // { label: 'WhatsApp (número conectado)', path: '/whatsapp/configuracao', icon: Phone },
      { label: 'Configurações', path: '/configuracoes', icon: Settings },
    ],
  },
];
