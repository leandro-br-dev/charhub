import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';

interface Option {
  value: string;
  label: string;
}

interface ComboboxSelectProps {
  label?: string;
  options: Option[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}

export function ComboboxSelect({
  label = '',
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  variant = 'primary',
  className = '',
  disabled = false,
}: ComboboxSelectProps) {
  const [query, setQuery] = useState('');
  const [optionsStyle, setOptionsStyle] = useState<React.CSSProperties>({});
  const comboboxRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    requestAnimationFrame(() => {
      if (comboboxRef.current) {
        const rect = comboboxRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeightEstimate = 240; // max-h-60
        const openUpwards = spaceBelow < dropdownHeightEstimate && rect.top > spaceBelow;

        setOptionsStyle({
          position: 'fixed',
          width: `${rect.width}px`,
          left: `${rect.left}px`,
          ...(openUpwards
            ? { bottom: `${window.innerHeight - rect.top + 4}px` }
            : { top: `${rect.bottom + 4}px` }),
        });
      }
    });
  }, []);

  const wrapperBaseClasses = 'relative w-fit';
  const inputBaseClasses =
    'w-full rounded-lg pl-3 pr-10 py-2 text-sm shadow-sm border focus:ring-2 focus:outline-none';
  const buttonBaseClasses = 'absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer';
  const optionsBaseClasses =
    'absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border bg-white dark:bg-gray-800 py-1 text-sm shadow-lg';
  const optionBaseClasses = 'cursor-pointer select-none px-3 py-2';
  const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';

  const variants = {
    primary: {
      input:
        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500',
      button: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
      option: {
        active: 'bg-primary-500 text-white',
        inactive: 'text-gray-900 dark:text-gray-100',
      },
    },
    secondary: {
      input:
        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-gray-500 focus:ring-gray-500',
      button: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
      option: {
        active: 'bg-gray-700 text-gray-100',
        inactive: 'text-gray-900 dark:text-gray-100',
      },
    },
    danger: {
      input:
        'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500',
      button: 'text-red-400 hover:text-red-600',
      option: {
        active: 'bg-red-50 dark:bg-red-900 text-red-900 dark:text-red-100',
        inactive: 'text-gray-900 dark:text-gray-100',
      },
    },
  };

  const isObjectList = options.length > 0 && typeof options[0] === 'object';

  const getDisplayValue = (selectedValue: string) => {
    if (!selectedValue) return '';
    if (isObjectList) {
      const selectedItem = (options as Option[]).find((item) => item.value === selectedValue);
      return selectedItem ? selectedItem.label : '';
    }
    return selectedValue;
  };

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => {
          const searchText = isObjectList ? (option as Option).label : (option as string);
          return searchText.toLowerCase().includes(query.toLowerCase());
        });

  const handleChange = (selectedOption: Option | string | null) => {
    const newValue = isObjectList
      ? selectedOption
        ? (selectedOption as Option).value
        : ''
      : (selectedOption as string) || '';
    onChange(newValue);
  };

  return (
    <div className={`${wrapperBaseClasses} ${className}`.trim()}>
      {label && <label className={labelClasses}>{label}</label>}
      <Combobox value={value} onChange={handleChange} disabled={disabled}>
        {({ open }) => {
          useEffect(() => {
            if (open) {
              calculatePosition();
              window.addEventListener('resize', calculatePosition);
              window.addEventListener('scroll', calculatePosition, true);
            }
            return () => {
              window.removeEventListener('resize', calculatePosition);
              window.removeEventListener('scroll', calculatePosition, true);
            };
          }, [open, calculatePosition]);

          return (
            <div className="relative" ref={comboboxRef}>
              <Combobox.Input
                className={`${inputBaseClasses} ${variants[variant].input}`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                displayValue={getDisplayValue}
              />
              <Combobox.Button
                className={`${buttonBaseClasses} ${variants[variant].button}`}
              >
                <span className="material-symbols-outlined text-base">unfold_more</span>
              </Combobox.Button>

              <Transition
                as={Fragment}
                show={open}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => setQuery('')}
              >
                <Combobox.Options static className={optionsBaseClasses} style={optionsStyle}>
                  {filteredOptions.length === 0 && query !== '' ? (
                    <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      No options found.
                    </div>
                  ) : (
                    filteredOptions.map((option) => (
                      <Combobox.Option
                        key={isObjectList ? (option as Option).value : (option as string)}
                        value={option}
                        className={({ active }) =>
                          `${optionBaseClasses} ${
                            active
                              ? variants[variant].option.active
                              : variants[variant].option.inactive
                          }`
                        }
                      >
                        {isObjectList ? (option as Option).label : (option as string)}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </Transition>
            </div>
          );
        }}
      </Combobox>
    </div>
  );
}
