import React from 'react';

interface LivoraWordmarkProps {
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSublabel?: boolean;
  showMonogram?: boolean;
  className?: string;
}

export const LivoraWordmark: React.FC<LivoraWordmarkProps> = ({
  theme = 'light',
  size = 'md',
  showSublabel = false,
  showMonogram = true,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const sizeMap = {
    sm: {
      icon: 'w-6 h-6',
      title: 'text-base',
      sub: 'text-[8px]',
      gap: 'gap-2',
    },
    md: {
      icon: 'w-7 h-7',
      title: 'text-xl',
      sub: 'text-[9px]',
      gap: 'gap-2.5',
    },
    lg: {
      icon: 'w-8 h-8',
      title: 'text-2xl',
      sub: 'text-[10px]',
      gap: 'gap-3',
    },
  }[size];

  return (
    <span className={`inline-flex items-center ${sizeMap.gap} whitespace-nowrap shrink-0 select-none ${className}`}>
      {showMonogram && (
        <svg
          viewBox="0 0 32 32"
          className={`${sizeMap.icon} shrink-0`}
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="28"
            height="28"
            rx="6"
            fill={isDark ? '#232623' : '#30332F'}
            stroke={isDark ? '#8C7967' : '#78816C'}
            strokeWidth="1.2"
          />
          <path
            d="M9 10 L16 6.5 L23 10 L23 21.5 L16 25 L9 21.5 Z"
            fill="none"
            stroke="#F4F0E8"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M16 6.5 L16 15.5 M16 15.5 L23 21.5 M16 15.5 L9 21.5"
            fill="none"
            stroke="#D8C9B5"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle cx="16" cy="15.5" r="1.4" fill="#78816C" />
        </svg>
      )}
      <span className="inline-flex flex-col leading-none">
        <span
          className={`font-brand ${sizeMap.title} leading-none ${
            isDark ? 'text-[#F4F0E8]' : 'text-[#30332F]'
          }`}
        >
          LIVORA
        </span>
        {showSublabel && (
          <span
            className={`${sizeMap.sub} font-semibold uppercase tracking-[0.26em] mt-0.5 ${
              isDark ? 'text-[#D8C9B5]' : 'text-[#8C7967]'
            }`}
          >
            SPATIAL ATELIER
          </span>
        )}
      </span>
    </span>
  );
};
