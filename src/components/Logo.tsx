import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  showSubtext?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 120, showText = true, showSubtext = false, className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f2557" />
            <stop offset="40%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="logoShield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="logoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="logoShadow">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="512" height="512" rx="108" fill="url(#logoBg)" />

        {/* Grid sutil */}
        <g opacity="0.06">
          <line x1="128" y1="0" x2="128" y2="512" stroke="white" strokeWidth="1" />
          <line x1="256" y1="0" x2="256" y2="512" stroke="white" strokeWidth="1" />
          <line x1="384" y1="0" x2="384" y2="512" stroke="white" strokeWidth="1" />
          <line x1="0" y1="128" x2="512" y2="128" stroke="white" strokeWidth="1" />
          <line x1="0" y1="256" x2="512" y2="256" stroke="white" strokeWidth="1" />
          <line x1="0" y1="384" x2="512" y2="384" stroke="white" strokeWidth="1" />
        </g>

        {/* Círculo decorativo */}
        <circle cx="256" cy="230" r="168" fill="none" stroke="white" strokeWidth="2" opacity="0.08" />

        {/* Escudo */}
        <g filter="url(#logoShadow)">
          <path
            d="M256 62 L400 132 C400 140 398 290 256 408 C114 290 112 140 112 132 Z"
            fill="url(#logoShield)"
            opacity="0.97"
          />
        </g>

        {/* Borda dourada */}
        <path
          d="M256 62 L400 132 C400 140 398 290 256 408 C114 290 112 140 112 132 Z"
          fill="none"
          stroke="url(#logoGold)"
          strokeWidth="5"
          opacity="0.8"
        />

        {/* Borda interna */}
        <path
          d="M256 82 L384 144 C384 152 382 282 256 388 C130 282 128 152 128 144 Z"
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="1.5"
          opacity="0.12"
        />

        {/* Skyline */}
        <g opacity="0.1">
          <rect x="152" y="280" width="24" height="60" rx="2" fill="#1e3a8a" />
          <rect x="182" y="260" width="20" height="80" rx="2" fill="#1e3a8a" />
          <rect x="208" y="290" width="18" height="50" rx="2" fill="#1e3a8a" />
          <rect x="288" y="275" width="22" height="65" rx="2" fill="#1e3a8a" />
          <rect x="316" y="255" width="18" height="85" rx="2" fill="#1e3a8a" />
          <rect x="340" y="285" width="20" height="55" rx="2" fill="#1e3a8a" />
        </g>

        {/* Lupa - círculo */}
        <circle cx="256" cy="210" r="56" fill="none" stroke="#1e3a8a" strokeWidth="11" opacity="0.9" />
        <circle cx="256" cy="210" r="56" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.2" />

        {/* Vidro da lupa */}
        <circle cx="256" cy="210" r="44" fill="#1e3a8a" opacity="0.05" />

        {/* Reflexo */}
        <ellipse cx="242" cy="194" rx="16" ry="10" fill="white" opacity="0.2" transform="rotate(-30, 242, 194)" />

        {/* Cabo da lupa */}
        <line x1="296" y1="250" x2="334" y2="288" stroke="#1e3a8a" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
        <line x1="296" y1="250" x2="334" y2="288" stroke="url(#logoGold)" strokeWidth="8" strokeLinecap="round" opacity="0.6" />

        {/* Checkmark */}
        <polyline
          points="236,212 250,228 280,194"
          fill="none"
          stroke="url(#logoGreen)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Estrela */}
        <polygon
          points="256,78 260,88 270,88 262,94 265,104 256,98 247,104 250,94 242,88 252,88"
          fill="url(#logoGold)"
          opacity="0.7"
        />

        {/* Texto SIFAU */}
        <text
          x="256"
          y="442"
          textAnchor="middle"
          fontFamily="'Segoe UI', Arial, sans-serif"
          fontWeight="900"
          fontSize="62"
          fill="white"
          letterSpacing="10"
          filter="url(#logoShadow)"
        >
          SIFAU
        </text>

        {/* Linha dourada */}
        <rect x="168" y="454" width="176" height="3" rx="1.5" fill="url(#logoGold)" opacity="0.7" />

        {/* Subtexto */}
        <text
          x="256"
          y="478"
          textAnchor="middle"
          fontFamily="'Segoe UI', Arial, sans-serif"
          fontWeight="400"
          fontSize="14"
          fill="white"
          opacity="0.55"
          letterSpacing="4"
        >
          FISCALIZAÇÃO URBANA
        </text>
      </svg>

      {showText && (
        <div className="mt-3 text-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-wider" style={{ color: 'var(--text-heading, #1e293b)' }}>
            SIFAU
          </h1>
          {showSubtext && (
            <p className="text-xs md:text-sm mt-1 tracking-wide" style={{ color: 'var(--text-secondary, #64748b)' }}>
              Sistema Inteligente de Fiscalização
              <br />e Atividades Urbanas
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
