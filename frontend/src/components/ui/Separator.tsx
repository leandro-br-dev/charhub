export function Separator({ className = '' }: { className?: string }): JSX.Element {
  return <div className={`h-px w-full bg-border ${className}`} />;
}
