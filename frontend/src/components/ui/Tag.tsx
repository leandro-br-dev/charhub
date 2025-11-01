import type { ButtonHTMLAttributes, ReactNode } from 'react';
import React from 'react';

type Tone = 'default' | 'danger' | 'success' | 'warning' | 'info' | 'nsfw' | 'secondary';

export interface TagProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  label: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /**
   * Visual tone for semantic coloring. Use 'nsfw' for +18 content.
   */
  tone?: Tone;
  /** Optional leading icon node (e.g., a material icon span). */
  icon?: ReactNode;
  /** When provided and selected is true, shows a close button that calls this handler. */
  onRemove?: () => void;
  /** Additional classes for the wrapper. */
  className?: string;
}

function toneClasses(tone: Tone | undefined, selected: boolean): string {
  const t = tone === 'nsfw' ? 'danger' : tone ?? 'default';
  switch (t) {
    case 'secondary':
      return selected
        ? 'bg-secondary text-white'
        : 'bg-light text-content hover:bg-input border border-secondary/30';
    case 'danger':
      return selected
        ? 'bg-danger text-white'
        : 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20';
    case 'success':
      return selected
        ? 'bg-success text-white'
        : 'bg-light text-content hover:bg-input border border-success/30';
    case 'warning':
      return selected
        ? 'bg-accent text-white'
        : 'bg-light text-content hover:bg-input border border-accent/30';
    case 'info':
      return selected
        ? 'bg-info text-white'
        : 'bg-light text-content hover:bg-input border border-info/30';
    case 'default':
    default:
      return selected ? 'bg-primary text-white' : 'bg-light text-content hover:bg-input';
  }
}

export function Tag({
  label,
  selected = false,
  disabled = false,
  tone,
  icon,
  onRemove,
  className = '',
  onClick,
  ...rest
}: TagProps): JSX.Element {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors select-none';
  const colors = toneClasses(tone, selected);
  const state = disabled ? 'cursor-default pointer-events-none' : 'cursor-pointer';

  return (
    <span className={`inline-flex items-center`}>
      <button
        type="button"
        className={`${base} ${colors} ${state} ${className}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
        {...rest}
      >
        {icon ? <span className="mr-0.5 inline-flex items-center">{icon}</span> : null}
        <span>{label}</span>
      </button>
      {selected && onRemove ? (
        <button
          type="button"
          className="ml-1 inline-flex items-center text-muted hover:text-content"
          onClick={onRemove}
          aria-label="Remove tag"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      ) : null}
    </span>
  );
}

export default Tag;
