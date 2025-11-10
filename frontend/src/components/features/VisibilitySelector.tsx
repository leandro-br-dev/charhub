import { DescriptiveSelector, type DescriptiveSelectorOption } from '../ui/DescriptiveSelector';
import { Visibility, VISIBILITY_LABELS, VISIBILITY_DESCRIPTIONS } from '../../types/common';

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

// Icon components following project standards
const LockIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const LinkIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const EyeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const VISIBILITY_ICONS = {
  [Visibility.PRIVATE]: <LockIcon />,
  [Visibility.UNLISTED]: <LinkIcon />,
  [Visibility.PUBLIC]: <EyeIcon />,
};

/**
 * VisibilitySelector - Specialized selector for content visibility
 *
 * Provides a user-friendly interface for selecting content visibility levels:
 * - PRIVATE: Only owner can access
 * - UNLISTED: Anyone with the link can access
 * - PUBLIC: Everyone can see and search
 *
 * @example
 * ```tsx
 * <VisibilitySelector
 *   value={visibility}
 *   onChange={setVisibility}
 *   label="Visibilidade"
 * />
 * ```
 */
export function VisibilitySelector({
  value,
  onChange,
  label = 'Visibilidade',
  disabled = false,
  className = '',
}: VisibilitySelectorProps) {
  const options: DescriptiveSelectorOption<Visibility>[] = [
    {
      value: Visibility.PRIVATE,
      label: VISIBILITY_LABELS[Visibility.PRIVATE],
      description: VISIBILITY_DESCRIPTIONS[Visibility.PRIVATE],
      icon: VISIBILITY_ICONS[Visibility.PRIVATE],
    },
    {
      value: Visibility.UNLISTED,
      label: VISIBILITY_LABELS[Visibility.UNLISTED],
      description: VISIBILITY_DESCRIPTIONS[Visibility.UNLISTED],
      icon: VISIBILITY_ICONS[Visibility.UNLISTED],
    },
    {
      value: Visibility.PUBLIC,
      label: VISIBILITY_LABELS[Visibility.PUBLIC],
      description: VISIBILITY_DESCRIPTIONS[Visibility.PUBLIC],
      icon: VISIBILITY_ICONS[Visibility.PUBLIC],
    },
  ];

  return (
    <DescriptiveSelector
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      disabled={disabled}
      className={className}
    />
  );
}

export default VisibilitySelector;
