import { useCallback, useEffect, useMemo, useState } from 'react';
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

function buildInitialValues(initialValues?: Partial<CharacterFormValues>): CharacterFormValues {
  return {
    ...EMPTY_CHARACTER_FORM,
    ...initialValues,
    contentTags: [...(initialValues?.contentTags ?? EMPTY_CHARACTER_FORM.contentTags)],
    stickers: initialValues?.stickers ? [...initialValues.stickers] : EMPTY_CHARACTER_FORM.stickers,
  };
}

export function useCharacterForm(options: UseCharacterFormOptions = {}): UseCharacterFormReturn {
  // Stabilize the initial values reference by serializing and comparing content
  const initialValuesKey = useMemo(
    () => JSON.stringify(options.initialValues ?? {}),
    [options.initialValues]
  );

  const [values, setValues] = useState<CharacterFormValues>(() => buildInitialValues(options.initialValues));

  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    JSON.stringify(buildInitialValues(options.initialValues))
  );

  useEffect(() => {
    if (options.initialValues) {
      const nextValues = buildInitialValues(options.initialValues);
      setValues(nextValues);
      setInitialSnapshot(JSON.stringify(nextValues));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesKey]);

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
    const computed = buildInitialValues(nextValues);
    setValues(computed);
    setInitialSnapshot(JSON.stringify(computed));
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
