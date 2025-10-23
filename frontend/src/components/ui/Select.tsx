import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const Select = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}: SelectProps) => {
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-content dark:text-content-dark mb-1">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={`
              relative w-full rounded-lg bg-light dark:bg-gray-800
              border border-gray-600 dark:border-gray-600
              py-2 pl-3 pr-10 text-left text-sm
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              text-content dark:text-content-dark
              cursor-pointer
            `}
          >
            <span className="block truncate">{displayValue}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <span className="material-symbols-outlined text-base text-muted">
                unfold_more
              </span>
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className="
                absolute z-50 mt-1 max-h-60 w-full overflow-auto
                rounded-lg border border-gray-600
                bg-light dark:bg-gray-800
                py-1 text-sm shadow-lg
                focus:outline-none
              "
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 px-3 ${
                      active
                        ? 'bg-primary text-black'
                        : 'text-content dark:text-content-dark'
                    }`
                  }
                >
                  {({ selected }) => (
                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {option.label}
                    </span>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default Select;
