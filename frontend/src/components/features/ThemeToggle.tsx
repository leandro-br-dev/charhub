import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-content transition hover:border-primary hover:bg-light hover:text-title"
        aria-label="Toggle theme"
      >
        <span className="text-base">{currentTheme.icon}</span>
        <span className="hidden sm:inline">{currentTheme.label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-border bg-card shadow-xl">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setTheme(t.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition first:rounded-t-lg last:rounded-b-lg ${
                theme === t.value
                  ? 'bg-primary text-dark font-medium'
                  : 'text-content hover:bg-light'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
