import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { SmartDropdown } from '../ui/SmartDropdown';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  icon: string;
};

const themeOptions: ThemeOption[] = [
  { value: 'light', icon: 'light_mode' },
  { value: 'dark', icon: 'dark_mode' },
  { value: 'system', icon: 'desktop_windows' },
];

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');

  const currentTheme = themeOptions.find(option => option.value === theme) ?? themeOptions[2];

  const resolveLabel = (value: ThemeOption['value']) => t(`theme.option.${value}`);

  return (
    <SmartDropdown
      menuWidth="w-48"
      buttonContent={
        <Button variant="light" className="flex h-12 w-12 items-center justify-center rounded-full !p-0" aria-label={t('theme.label')}>
          <span className="material-symbols-outlined text-xl text-title">{currentTheme.icon}</span>
        </Button>
      }
    >
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t('theme.label')}</p>
      {themeOptions.map(option => {
        const isSelected = option.value === theme;

        return (
          <Menu.Item key={option.value}>
            {({ active }) => (
              <button
                type="button"
                onClick={() => setTheme(option.value)}
                className={`${
                  active ? 'bg-primary-100 text-primary-900' : 'text-content'
                } group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${isSelected ? 'font-semibold' : ''}`}
              >
                <span className="material-symbols-outlined text-lg">{option.icon}</span>
                <span className="flex-1 whitespace-nowrap text-left">{resolveLabel(option.value)}</span>
                {isSelected ? (
                  <span className="material-symbols-outlined ml-auto text-primary text-base">check_circle</span>
                ) : null}
              </button>
            )}
          </Menu.Item>
        );
      })}
    </SmartDropdown>
  );
}
