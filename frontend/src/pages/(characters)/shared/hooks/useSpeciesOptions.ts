import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export interface SpeciesOption {
  id: string;
  name: string;
  category: string | null;
}

export function useSpeciesOptions() {
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSpecies = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ success: boolean; data: SpeciesOption[] }>('/api/v1/species');
        setSpecies(response.data.data || []);
      } catch (error) {
        console.error('[useSpeciesOptions] Failed to load species:', error);
        setSpecies([]);
      } finally {
        setLoading(false);
      }
    };
    loadSpecies();
  }, []);

  return { species, loading };
}
