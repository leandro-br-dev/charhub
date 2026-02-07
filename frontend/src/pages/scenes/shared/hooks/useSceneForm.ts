import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_SCENE_FORM, type SceneFormValues } from '../../../../types/scenes';
import type { ContentTag } from '../../../../types/characters';

type FieldName = keyof SceneFormValues;

export interface UseSceneFormOptions {
  initialValues?: Partial<SceneFormValues>;
}

export interface UseSceneFormReturn {
  values: SceneFormValues;
  updateField: <Key extends FieldName>(field: Key, value: SceneFormValues[Key]) => void;
  handleTextChange: (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => void;
  toggleContentTag: (tag: ContentTag) => void;
  setValues: React.Dispatch<React.SetStateAction<SceneFormValues>>;
  reset: (values?: Partial<SceneFormValues>) => void;
  isDirty: boolean;
}

function buildInitialValues(initialValues?: Partial<SceneFormValues>): SceneFormValues {
  return {
    ...EMPTY_SCENE_FORM,
    ...initialValues,
    contentTags: [...(initialValues?.contentTags ?? EMPTY_SCENE_FORM.contentTags)],
    tagIds: initialValues?.tagIds ? [...initialValues.tagIds] : EMPTY_SCENE_FORM.tagIds,
  };
}

export function useSceneForm(options: UseSceneFormOptions = {}): UseSceneFormReturn {
  // Stabilize the initial values reference by serializing and comparing content
  const initialValuesKey = useMemo(
    () => JSON.stringify(options.initialValues ?? {}),
    [options.initialValues]
  );

  const [values, setValues] = useState<SceneFormValues>(() => buildInitialValues(options.initialValues));

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

  const updateField = useCallback(<Key extends FieldName>(field: Key, value: SceneFormValues[Key]) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleTextChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value as SceneFormValues[typeof field]);
    },
    [updateField]
  );

  const handleSelectChange = useCallback(
    (field: FieldName) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateField(field, event.target.value as SceneFormValues[typeof field]);
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

  const reset = useCallback((nextValues?: Partial<SceneFormValues>) => {
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
