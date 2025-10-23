
// frontend/src/pages/(chat)/shared/components/ComboboxSelect.tsx
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Combobox, Transition } from "@headlessui/react";

const ComboboxSelect = ({
  label = "",
  options = [],
  value,
  onChange,
  placeholder,
  variant = "primary",
  className = "",
  disabled = false,
  valueKey = "value",
  labelKey = "label",
  ...props
}: any) => {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState("");
  const [optionsStyle, setOptionsStyle] = useState({});
  const comboboxRef = useRef<HTMLDivElement>(null);
  const resolvedPlaceholder = placeholder ?? t('selectOption', 'Select an option');
  const noResultsLabel = t('noResults', 'No options found.');

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
            : { top: `${rect.bottom + 4}px` }
          ),
        });
      }
    });
  }, []);

  const wrapperBaseClasses = "relative w-full";
  const inputBaseClasses = "w-full rounded-lg pl-3 pr-10 py-2 text-sm shadow-sm border focus:ring-2 focus:outline-none";
  const buttonBaseClasses = "absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer";
  const optionsBaseClasses = "absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border bg-light py-1 text-sm shadow-lg";
  const optionBaseClasses = "cursor-pointer select-none px-3 py-2";
  const labelClasses = "block text-sm font-medium text-content mb-1";

  const variants: any = {
    primary: {
      input: "bg-light text-content border-gray-600 focus:border-primary focus:ring-primary",
      button: "text-muted hover:text-content",
      option: { active: "bg-primary-500 text-black", inactive: "text-content" },
    },
    secondary: {
      input: "bg-light text-content border-gray-600 focus:border-primary focus:ring-primary",
      button: "text-muted hover:text-content",
      option: { active: "bg-gray-700 text-content", inactive: "text-content" },
    },
    danger: {
      input: "bg-red-50 text-red-900 border-red-300 focus:border-red-500 focus:ring-red-500",
      button: "text-red-400 hover:text-red-600",
      option: { active: "bg-red-50 text-red-900", inactive: "text-content" },
    },
  };

  const isObjectList = options.length > 0 && typeof options[0] === "object";
  
  const getDisplayValue = (selectedValue: any) => {
    if (!selectedValue) return "";
    if (isObjectList) {
      const selectedItem = options.find((item: any) => item[valueKey] === selectedValue);
      return selectedItem ? selectedItem[labelKey] : "";
    }
    return selectedValue;
  };
  
  const filteredOptions = query === "" ? options : options.filter((option: any) => {
    const searchText = isObjectList ? option[labelKey] : option;
    return searchText.toLowerCase().includes(query.toLowerCase());
  });

  const handleChange = (selectedOption: any) => {
    const newValue = isObjectList ? (selectedOption ? selectedOption[valueKey] : "") : selectedOption;
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
                placeholder={resolvedPlaceholder}
                displayValue={getDisplayValue}
              />
              <Combobox.Button className={`${buttonBaseClasses} ${variants[variant].button}`}>
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
                <Combobox.Options
                  static
                  className={optionsBaseClasses}
                  style={optionsStyle}
                >
                  {filteredOptions.length === 0 && query !== "" ? (
                    <div className="px-3 py-2 text-muted">{noResultsLabel}</div>
                  ) : (
                    filteredOptions.map((option: any) => (
                      <Combobox.Option
                        key={isObjectList ? option[valueKey] : option}
                        value={option}
                        className={({ active }: any) =>
                          `${optionBaseClasses} ${active ? variants[variant].option.active : variants[variant].option.inactive}`
                        }
                      >
                        {isObjectList ? option[labelKey] : option}
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
};

export default ComboboxSelect;
