import { useState, Fragment, type ReactNode } from 'react';

export interface DescriptiveSelectorOption<T = string> {
  value: T;
  label: string;
  description: string;
  icon?: ReactNode;
}

export interface DescriptiveSelectorProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: DescriptiveSelectorOption<T>[];
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * DescriptiveSelector - A robust selector component with descriptions
 *
 * Features:
 * - Dropdown with rich option display
 * - Icon support for each option
 * - Description text for better UX
 * - Follows project design system
 * - Fully accessible with keyboard navigation
 *
 * @example
 * ```tsx
 * <DescriptiveSelector
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={[
 *     {
 *       value: 'option1',
 *       label: 'Option 1',
 *       description: 'This is the first option',
 *       icon: <IconComponent />
 *     }
 *   ]}
 *   label="Select an option"
 * />
 * ```
 */
export function DescriptiveSelector<T extends string = string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className = '',
}: DescriptiveSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-content dark:text-content-dark mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-light dark:bg-gray-800 border border-border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          {selectedOption?.icon && (
            <div className="flex-shrink-0 w-5 h-5 text-muted dark:text-muted-dark">
              {selectedOption.icon}
            </div>
          )}
          <div className="text-left flex-1 min-w-0">
            <div className="text-sm font-medium text-content dark:text-content-dark truncate">
              {selectedOption?.label || 'Select an option'}
            </div>
            {selectedOption?.description && (
              <div className="text-xs text-muted dark:text-muted-dark truncate">
                {selectedOption.description}
              </div>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-muted dark:text-muted-dark transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 mt-2 w-full bg-light dark:bg-gray-800 border border-border dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
            {options.map((option) => {
              const isSelected = value === option.value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''
                  }`}
                >
                  {option.icon && (
                    <div
                      className={`flex-shrink-0 w-5 h-5 ${
                        isSelected
                          ? 'text-primary dark:text-primary'
                          : 'text-muted dark:text-muted-dark'
                      }`}
                    >
                      {option.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-primary dark:text-primary'
                          : 'text-content dark:text-content-dark'
                      }`}
                    >
                      {option.label}
                    </div>
                    <div className="text-xs text-muted dark:text-muted-dark mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary dark:bg-primary rounded-full flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default DescriptiveSelector;
