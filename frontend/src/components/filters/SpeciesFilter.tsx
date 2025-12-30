import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { characterService } from '../../services/characterService';
import { MultiSelect } from '../ui/MultiSelect';

export interface SpeciesOption {
  value: string;
  name: string;
  count: number;
}

interface SpeciesFilterProps {
  selected: string[];
  onChange: (species: string[]) => void;
}

export function SpeciesFilter({ selected, onChange }: SpeciesFilterProps) {
  const { t } = useTranslation('dashboard');
  const [options, setOptions] = useState<SpeciesOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const data = await characterService.getSpeciesFilterOptions();
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
    label: `${t(`species:${opt.name}.name`, opt.name)} (${opt.count})`
  }));

  return (
    <MultiSelect
      options={multiSelectOptions}
      values={selected}
      onChange={onChange}
      placeholder={t('filters.selectSpecies', 'Espécie...')}
      compact
    />
  );
}
