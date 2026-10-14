import React from 'react';

interface EmblemProps {
  className?: string;
  size?: number | string;
}

/**
 * Emblema Oficial GESTIO
 * Símbolo geométrico facetado em 3D com gradientes metálicos, ciano, prata e roxo/índigo.
 */
export const GestioEmblem: React.FC<EmblemProps> = ({ className = '', size = 36 }) => {
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-sm ${className}`}
      aria-label="Emblema GESTIO"
    >
      <defs>
        {/* Gradiente Ciano Elétrico */}
        <linearGradient id="gestioCyan" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Gradiente Metálico Cromado / Platina */}
        <linearGradient id="gestioChrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#E2E8F0" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Gradiente Roxo / Violeta Elétrico */}
        <linearGradient id="gestioPurple" x1="20%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="45%" stopColor="#7C3AED" />
          <stop offset="85%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Gradiente Azul Profundo / Sombra Técnica */}
        <linearGradient id="gestioDeepBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        {/* Filtro de Brilho Sutil */}
        <filter id="gestioGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Face Superior Esquerda / Faceta Ciano Superior */}
      <path
        d="M50 12 L82 28 L50 44 L18 28 Z"
        fill="url(#gestioChrome)"
        stroke="#FFFFFF"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />

      {/* Face Lateral Esquerda Superior (Ciano Vibrante) */}
      <path
        d="M18 28 L50 44 L50 72 L18 56 Z"
        fill="url(#gestioCyan)"
        stroke="#22D3EE"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Face Lateral Direita (Roxo / Violeta Tecnológico) */}
      <path
        d="M50 44 L82 28 L82 56 L50 72 Z"
        fill="url(#gestioPurple)"
        stroke="#A855F7"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Recorte Interno 'G' - Faceta de Conexão Ciano/Prata */}
      <path
        d="M50 44 L66 36 L66 52 L50 60 Z"
        fill="url(#gestioChrome)"
        opacity="0.9"
      />

      {/* Núcleo Central do 'G' - Gancho interno cromado/roxo */}
      <path
        d="M50 60 L66 52 L66 60 L50 68 Z"
        fill="url(#gestioCyan)"
      />

      {/* Base Hexagonal Inferior com chanfro dinâmico */}
      <path
        d="M18 56 L50 72 L50 88 L18 72 Z"
        fill="url(#gestioDeepBlue)"
        opacity="0.85"
      />

      <path
        d="M50 72 L82 56 L82 72 L50 88 Z"
        fill="url(#gestioPurple)"
      />

      {/* Ponto de Luz / Reflexo Especular Prata */}
      <polygon
        points="50,14 78,28 50,42 22,28"
        fill="#FFFFFF"
        opacity="0.25"
      />
    </svg>
  );
};

interface LogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withTagline?: boolean;
  className?: string;
  condensed?: boolean;
}

/**
 * Logo Completa Oficial GESTIO
 * Combina o Emblema Oficial com a Tipografia e Tagline Institucional.
 */
export const GestioLogo: React.FC<LogoProps> = ({
  variant = 'auto',
  size = 'md',
  withTagline = false,
  className = '',
  condensed = false,
}) => {
  // Configuração de tamanhos
  const sizeMap = {
    sm: { emblem: 28, text: 'text-base', tagline: 'text-[9px]', tracking: 'tracking-wider' },
    md: { emblem: 34, text: 'text-xl', tagline: 'text-[10px]', tracking: 'tracking-widest' },
    lg: { emblem: 44, text: 'text-2xl', tagline: 'text-xs', tracking: 'tracking-widest' },
    xl: { emblem: 54, text: 'text-3xl', tagline: 'text-xs', tracking: 'tracking-widest' },
  };

  const currentSize = sizeMap[size];

  // Cores conforme a variante
  const isDarkBg = variant === 'dark';
  const textColor = isDarkBg
    ? 'text-white'
    : variant === 'light'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white';
  const tagColor = isDarkBg
    ? 'text-slate-400'
    : 'text-slate-500';

  if (condensed) {
    return <GestioEmblem size={currentSize.emblem} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <GestioEmblem size={currentSize.emblem} />
      <div className="flex flex-col leading-tight">
        <div className="flex items-center">
          <span
            className={`font-black uppercase ${currentSize.text} ${currentSize.tracking} ${textColor} transition-colors`}
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.12em' }}
          >
            GESTIO
          </span>
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </div>
        {withTagline && (
          <span className={`font-medium ${currentSize.tagline} ${tagColor} tracking-tight`}>
            Gestão inteligente para quem faz acontecer
          </span>
        )}
      </div>
    </div>
  );
};

export default GestioLogo;
