import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export interface FormattingType {
  type: string;
  label: string;
  icon: string;
  prefix: string;
  suffix: string;
  placeholder: string;
  description: string;
}

const formattingTypes: FormattingType[] = [
  {
    type: 'action',
    label: 'formatting.action',
    icon: 'directions_run',
    prefix: '*',
    suffix: '*',
    placeholder: 'ação',
    description: 'Ação ou narração',
  },
  {
    type: 'thought',
    label: 'formatting.thought',
    icon: 'psychology',
    prefix: '<"',
    suffix: '">',
    placeholder: 'pensamento',
    description: 'Pensamento interno',
  },
  {
    type: 'ooc',
    label: 'formatting.ooc',
    icon: 'chat_bubble_outline',
    prefix: '((',
    suffix: '))',
    placeholder: 'fora do personagem',
    description: 'Fora do personagem',
  },
  {
    type: 'shout',
    label: 'formatting.shout',
    icon: 'campaign',
    prefix: '>',
    suffix: '<',
    placeholder: 'grito',
    description: 'Falar alto',
  },
  {
    type: 'whisper',
    label: 'formatting.whisper',
    icon: 'volume_off',
    prefix: '<',
    suffix: '>',
    placeholder: 'sussurro',
    description: 'Sussurrar',
  },
  {
    type: 'description',
    label: 'formatting.description',
    icon: 'description',
    prefix: '[',
    suffix: ']',
    placeholder: 'descrição',
    description: 'Descrição de cena',
  },
];

interface MessageFormattingToolbarProps {
  onInsertFormatting: (prefix: string, suffix: string, placeholder: string) => void;
  disabled?: boolean;
  className?: string;
}

export const MessageFormattingToolbar: React.FC<MessageFormattingToolbarProps> = ({
  onInsertFormatting,
  disabled = false,
  className = '',
}) => {
  const { t } = useTranslation('chat');

  const handleFormatClick = (formatting: FormattingType) => {
    onInsertFormatting(formatting.prefix, formatting.suffix, formatting.placeholder);
  };

  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <div>
        <Menu.Button as="div">
          <button
            type="button"
            disabled={disabled}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t('formatting.toolbarTitle', { defaultValue: 'Formatação de roleplay' })}
          >
            <span className="material-symbols-outlined text-lg">format_paint</span>
          </button>
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute bottom-full left-0 mb-2 w-64 origin-bottom-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('formatting.menuTitle', { defaultValue: 'Formatação de Roleplay' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('formatting.menuDescription', { defaultValue: 'Insira formatação na sua mensagem' })}
            </p>
          </div>
          <div className="px-1 py-1 max-h-80 overflow-y-auto">
            {formattingTypes.map((formatting) => (
              <Menu.Item key={formatting.type}>
                {({ active }: any) => (
                  <button
                    onClick={() => handleFormatClick(formatting)}
                    disabled={disabled}
                    className={`${
                      active
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary dark:text-primary-100'
                        : 'text-gray-700 dark:text-gray-300'
                    } group flex w-full items-center rounded-md px-3 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined mr-3 h-5 w-5 text-gray-500 dark:text-gray-400">
                      {formatting.icon}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {t(formatting.label, formatting.description)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatting.prefix}texto{formatting.suffix}
                      </span>
                    </div>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('formatting.helpText', { defaultValue: 'Clique para inserir na posição do cursor' })}
            </p>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default MessageFormattingToolbar;
