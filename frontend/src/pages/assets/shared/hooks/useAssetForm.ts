import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_ASSET_FORM, type AssetFormValues } from '../../../../types/assets';
import type { ContentTag } from '../../../../types/characters';

type FieldName = keyof AssetFormValues;

export interface UseAssetFormOptions {
  initialValues?: Partial<AssetFormValues>;
}

export interface UseAssetFormReturn {
  values: AssetFormValues;
  updateField: <Key extends FieldName>(field: Key, value: AssetFormValues[Key]) => void;
  handleTextChange: (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => void;
  toggleContentTag: (tag: ContentTag) => void;
  setValues: React.Dispatch<React.SetStateAction<AssetFormValues>>;
  reset: (values?: Partial<AssetFormValues>) => void;
  isDirty: boolean;
}

function buildInitialValues(initialValues?: Partial<AssetFormValues>): AssetFormValues {
  return {
    ...EMPTY_ASSET_FORM,
    ...initialValues,
    contentTags: initialValues?.contentTags ? [...initialValues.contentTags] : EMPTY_ASSET_FORM.contentTags,
    tagIds: initialValues?.tagIds ? [...initialValues.tagIds] : EMPTY_ASSET_FORM.tagIds,
  };
}

export function useAssetForm(options: UseAssetFormOptions = {}): UseAssetFormReturn {
  // Stabilize the initial values reference by serializing and comparing content
  const initialValuesKey = useMemo(
    () => JSON.stringify(options.initialValues ?? {}),
    [options.initialValues]
  );

  const [values, setValues] = useState<AssetFormValues>(() => buildInitialValues(options.initialValues));

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

  const updateField = useCallback(<Key extends FieldName>(field: Key, value: AssetFormValues[Key]) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleTextChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value as AssetFormValues[typeof field]);
    },
    [updateField]
  );

  const handleSelectChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateField(field, event.target.value as AssetFormValues[typeof field]);
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

  const reset = useCallback((nextValues?: Partial<AssetFormValues>) => {
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
    toggleContentTag,
    setValues,
    reset,
    isDirty
  };
}
