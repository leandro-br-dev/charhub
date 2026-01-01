import { Fragment, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';

type Option = { value: string; label: string };

type MultiSelectProps = {
  label?: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  compact = false
}: MultiSelectProps): JSX.Element {
  const display = useMemo(() => {
    if (!values || values.length === 0) return placeholder;
    const labels = options
      .filter(o => values.includes(o.value))
      .map(o => o.label);
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [values, options, placeholder]);

  // Compact styling for filters
  const buttonClass = compact
    ? 'py-1.5 pl-2.5 pr-8 text-xs rounded-md'
    : 'py-2 pl-3 pr-10 text-sm rounded-lg';

  const optionsClass = compact
    ? 'py-1 pl-7 pr-2 text-xs'
    : 'py-2 pl-8 pr-3 text-sm';

  return (
    <div className={`relative w-full ${className}`}>
      {label ? (
        <label className="block text-sm font-medium text-content dark:text-content-dark mb-1">{label}</label>
      ) : null}
      <Listbox value={values} onChange={onChange} multiple disabled={disabled}>        <div className="relative">
          <Listbox.Button
            className={`
              relative w-full bg-light dark:bg-gray-800
              border border-gray-600 dark:border-gray-600
              ${buttonClass}
              text-left
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              text-content dark:text-content-dark
              cursor-pointer
            `}
          >
            <span className="block truncate">{display}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
              <span className={`material-symbols-outlined ${compact ? 'text-sm' : 'text-base'} text-muted`}>unfold_more</span>
            </span>
          </Listbox.Button>
          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options
              className={`
                absolute z-50 mt-1 max-h-60 w-full overflow-auto
                rounded-lg border border-gray-600
                bg-light dark:bg-gray-800
                shadow-lg
                focus:outline-none
              `}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none ${optionsClass} ${
                      active ? 'bg-primary text-black' : 'text-content dark:text-content-dark'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span className={`material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 ${compact ? 'text-sm' : 'text-base'}`}>
                          check
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}

export default MultiSelect;

