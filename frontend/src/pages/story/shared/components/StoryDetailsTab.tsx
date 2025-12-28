import { useTranslation } from 'react-i18next';
import { Input, Textarea } from '../../../../components/ui';
import { VisibilitySelector } from '../../../../components/features/VisibilitySelector';
import { Visibility } from '../../../../types/common';

interface StoryDetailsTabProps {
  title?: string;
  synopsis?: string;
  visibility?: Visibility;
  onTitleChange: (value: string) => void;
  onSynopsisChange: (value: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  errors?: Record<string, string>;
}

export function StoryDetailsTab({
  title = '',
  synopsis = '',
  visibility = Visibility.PRIVATE,
  onTitleChange,
  onSynopsisChange,
  onVisibilityChange,
  errors,
}: StoryDetailsTabProps): JSX.Element {
  const { t } = useTranslation(['story']);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Input
          label={t('story:form.title', 'Title')}
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          error={errors?.title}
          required
          maxLength={100}
          placeholder={t('story:form.titlePlaceholder', 'Enter story title...')}
        />
      </div>

      {/* Synopsis */}
      <div>
        <Textarea
          label={t('story:form.synopsis', 'Synopsis')}
          value={synopsis}
          onChange={e => onSynopsisChange(e.target.value)}
          error={errors?.synopsis}
          maxLength={500}
          rows={6}
          placeholder={t('story:form.synopsisPlaceholder', 'Brief summary of your story...')}
          className="overflow-hidden"
          style={{ height: 'auto', minHeight: '150px', maxHeight: '200px' }}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted">
            {synopsis.length}/500
          </span>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <VisibilitySelector
          value={visibility}
          onChange={onVisibilityChange}
          label={t('story:form.visibility', 'Story Visibility')}
        />
      </div>
    </div>
  );
}
