import { useTranslation } from 'react-i18next';
import { VisibilitySelector } from '../../../../components/features/VisibilitySelector';
import { Visibility } from '../../../../types/common';

interface VisibilityTabProps {
  value: Visibility;
  onChange: (visibility: Visibility) => void;
}

export function VisibilityTab({ value, onChange }: VisibilityTabProps): JSX.Element {
  const { t } = useTranslation(['story']);

  return (
    <div className="space-y-6">
      <VisibilitySelector
        value={value}
        onChange={onChange}
        label={t('story:form.visibility', 'Story Visibility')}
      />
    </div>
  );
}
