import { useTranslation } from 'react-i18next';
import type { ButtonHTMLAttributes } from 'react';
import type { OAuthProvider } from '../../types/auth';

interface LoginButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  provider: OAuthProvider;
}

const providerStyle: Record<OAuthProvider, string> = {
  google:
    'bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 focus:ring-brand-500 dark:bg-slate-100 dark:hover:bg-slate-200',
  facebook:
    'bg-[#1877F2] text-white hover:bg-[#166ee2] focus:ring-[#1877F2] dark:bg-[#1877F2] dark:hover:bg-[#166ee2]'
};

const providerIcon: Record<OAuthProvider, string> = {
  google: 'G',
  facebook: 'f'
};

export function LoginButton({ provider, className = '', ...props }: LoginButtonProps): JSX.Element {
  const { t } = useTranslation('common');
  const label = provider === 'google' ? t('continueGoogle') : t('continueFacebook');

  return (
    <button
      type="button"
      className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition ${providerStyle[provider]} ${className}`.trim()}
      {...props}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
        {providerIcon[provider]}
      </span>
      <span>{label}</span>
    </button>
  );
}