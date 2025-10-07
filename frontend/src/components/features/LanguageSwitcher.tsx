import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import type { FlagComponent } from 'country-flag-icons/react/3x2';
import {
  US,
  BR,
  ES,
  FR,
  DE,
  CN,
  IN,
  SA,
  RU,
  JP,
  KR,
  IT
} from 'country-flag-icons/react/3x2';
import { Button } from '../ui/Button';
import { SmartDropdown } from '../ui/SmartDropdown';

type LanguageOption = {
  code: string;
  name: string;
  flag: FlagComponent;
};

const languages: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)', flag: US },
  { code: 'pt-BR', name: 'Português (BR)', flag: BR },
  { code: 'es-ES', name: 'Español (ES)', flag: ES },
  { code: 'fr-FR', name: 'Français (FR)', flag: FR },
  { code: 'de-DE', name: 'Deutsch (DE)', flag: DE },
  { code: 'zh-CN', name: '中文 (CN)', flag: CN },
  { code: 'hi-IN', name: 'हिन्दी (IN)', flag: IN },
  { code: 'ar-SA', name: 'العربية (SA)', flag: SA },
  { code: 'ru-RU', name: 'Русский (RU)', flag: RU },
  { code: 'ja-JP', name: '日本語 (JP)', flag: JP },
  { code: 'ko-KR', name: '한국어 (KR)', flag: KR },
  { code: 'it-IT', name: 'Italiano (IT)', flag: IT }
];

export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation('common');
  const current = i18n.resolvedLanguage || i18n.language || languages[0].code;

  const resolved =
    languages.find((lang) => current.toLowerCase().startsWith(lang.code.split('-')[0].toLowerCase())) ?? languages[0];
  const FlagIcon = resolved.flag;

  const handleChange = (code: string) => {
    if (code === current) {
      return;
    }
    void i18n.changeLanguage(code);
  };

  return (
    <SmartDropdown
      menuWidth="w-48"
      buttonContent={
        <Button variant="light" className="flex h-12 w-12 items-center justify-center rounded-full !p-0">
          <FlagIcon aria-label={resolved.name} role="img" className="h-6 w-8 rounded-sm" />
        </Button>
      }
    >
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {t('language')}
      </p>
      {languages.map((lang) => {
        const LangFlag = lang.flag;
        const isSelected = resolved.code === lang.code;
        return (
          <Menu.Item key={lang.code}>
            {({ active }) => (
              <button
                type="button"
                onClick={() => handleChange(lang.code)}
                className={`${
                  active ? 'bg-primary-100 text-primary-900' : 'text-content'
                } group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${isSelected ? 'font-semibold' : ''}`}
              >
                <LangFlag aria-label={lang.name} role="img" className="h-4 w-6 rounded-sm" />
                <span>{lang.name}</span>
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
