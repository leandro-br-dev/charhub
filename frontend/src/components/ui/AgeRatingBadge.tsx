import { AgeRating } from '@/types/characters';

interface AgeRatingBadgeProps {
  ageRating: AgeRating;
  variant?: 'overlay' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AGE_RATING_CONFIG: Record<
  AgeRating,
  {
    label: string;
    color: string; // Tailwind class
    description: string;
  }
> = {
  L: {
    label: 'L',
    color: 'bg-success text-white',
    description: 'Livre para todas as idades'
  },
  TEN: {
    label: '10+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 10 anos'
  },
  TWELVE: {
    label: '12+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 12 anos'
  },
  FOURTEEN: {
    label: '14+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 14 anos'
  },
  SIXTEEN: {
    label: '16+',
    color: 'bg-accent text-white',
    description: 'Não recomendado para menores de 16 anos'
  },
  EIGHTEEN: {
    label: '18+',
    color: 'bg-black text-white',
    description: 'Conteúdo adulto - Apenas para maiores de 18 anos'
  }
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1.5'
};

const VARIANT_CLASSES = {
  overlay: 'absolute left-2 top-2 shadow-lg',
  inline: 'inline-block'
};

export function AgeRatingBadge({
  ageRating,
  variant = 'inline',
  size = 'md',
  className = ''
}: AgeRatingBadgeProps) {
  const config = AGE_RATING_CONFIG[ageRating] || AGE_RATING_CONFIG.L;

  return (
    <span
      className={`
        ${config.color}
        ${SIZE_CLASSES[size]}
        ${VARIANT_CLASSES[variant]}
        rounded-full
        font-semibold
        uppercase
        tracking-wide
        ${className}
      `}
      title={config.description}
      aria-label={config.description}
    >
      {config.label}
    </span>
  );
}

// Export config for use elsewhere
export { AGE_RATING_CONFIG };
