import { useCallback, useMemo, useState } from 'react';
import { EMPTY_CHARACTER_FORM, type CharacterFormValues, type ContentTag } from '../../../../types/characters';

type FieldName = keyof CharacterFormValues;

export interface UseCharacterFormOptions {
  initialValues?: Partial<CharacterFormValues>;
}

export interface UseCharacterFormReturn {
  values: CharacterFormValues;
  updateField: <Key extends FieldName>(field: Key, value: CharacterFormValues[Key]) => void;
  handleTextChange: (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleNumberChange: (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  toggleContentTag: (tag: ContentTag) => void;
  setValues: React.Dispatch<React.SetStateAction<CharacterFormValues>>;
  reset: (values?: Partial<CharacterFormValues>) => void;
  isDirty: boolean;
}

export function useCharacterForm(options: UseCharacterFormOptions = {}): UseCharacterFormReturn {
  const [values, setValues] = useState<CharacterFormValues>({
    ...EMPTY_CHARACTER_FORM,
    ...options.initialValues
  });

  const [initialSnapshot] = useState(() => JSON.stringify({
    ...EMPTY_CHARACTER_FORM,
    ...options.initialValues
  }));

  const updateField = useCallback(<Key extends FieldName>(field: Key, value: CharacterFormValues[Key]) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleTextChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value as CharacterFormValues[typeof field]);
    },
    [updateField]
  );

  const handleSelectChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateField(field, event.target.value as CharacterFormValues[typeof field]);
    },
    [updateField]
  );

  const handleNumberChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value === '' ? null : Number(event.target.value);
      updateField(field, nextValue as CharacterFormValues[typeof field]);
    },
    [updateField]
  );

  const toggleContentTag = useCallback((tag: ContentTag) => {
    setValues(prev => {
      const hasTag = prev.contentTags.includes(tag);
      return {
        ...prev,
        contentTags: hasTag ? prev.contentTags.filter(item => item !== tag) : [...prev.contentTags, tag]
      };
    });
  }, []);

  const reset = useCallback((nextValues?: Partial<CharacterFormValues>) => {
    setValues({
      ...EMPTY_CHARACTER_FORM,
      ...nextValues
    });
  }, []);

  const isDirty = useMemo(() => JSON.stringify(values) !== initialSnapshot, [values, initialSnapshot]);

  return {
    values,
    updateField,
    handleTextChange,
    handleSelectChange,
    handleNumberChange,
    toggleContentTag,
    setValues,
    reset,
    isDirty
  };
}
