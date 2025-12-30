import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { characterService } from '../../services/characterService';
import { MultiSelect } from '../ui/MultiSelect';

export interface GenderOption {
  value: string;
  count: number;
}

interface GenderFilterProps {
  selected: string[];
  onChange: (genders: string[]) => void;
}

// Translation keys for genders
const GENDER_TRANSLATION_KEYS: Record<string, string> = {
  'MALE': 'filters.genders.male',
  'FEMALE': 'filters.genders.female',
  'NON_BINARY': 'filters.genders.nonBinary',
  'OTHER': 'filters.genders.other',
  'UNKNOWN': 'filters.genders.unknown',
  'unknown': 'filters.genders.unknown',
};

export function GenderFilter({ selected, onChange }: GenderFilterProps) {
  const { t } = useTranslation('dashboard');
  const [options, setOptions] = useState<GenderOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const data = await characterService.getGenderFilterOptions();
        setOptions(data);
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="h-8 bg-light/50 dark:bg-gray-800/50 rounded-md animate-pulse" />
      </div>
    );
  }

  if (options.length === 0) {
    return null;
  }

  // Convert options to format expected by MultiSelect, translating labels
  const multiSelectOptions = options.map(opt => ({
    value: opt.value,
    label: `${t(GENDER_TRANSLATION_KEYS[opt.value] || `filters.genders.${opt.value.toLowerCase()}`, opt.value)} (${opt.count})`
  }));

  return (
    <MultiSelect
      options={multiSelectOptions}
      values={selected}
      onChange={onChange}
      placeholder={t('filters.selectGender', 'Gênero...')}
      compact
    />
  );
}
