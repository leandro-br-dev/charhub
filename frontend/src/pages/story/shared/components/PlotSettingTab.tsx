import { useTranslation } from 'react-i18next';
import { Textarea } from '../../../../components/ui';
import { ObjectivesList } from '../../create/components/ObjectivesList';
import type { StoryObjective } from '../../../../types/story';

interface PlotSettingTabProps {
  initialText?: string;
  objectives?: StoryObjective[];
  onInitialTextChange: (value: string) => void;
  onObjectivesChange: (objectives: StoryObjective[]) => void;
  errors?: Record<string, string>;
}

export function PlotSettingTab({
  initialText = '',
  objectives = [],
  onInitialTextChange,
  onObjectivesChange,
  errors,
}: PlotSettingTabProps): JSX.Element {
  const { t } = useTranslation(['story']);

  return (
    <div className="space-y-6">
      {/* Initial Text */}
      <div>
        <Textarea
          label={t('story:form.initialText', 'Opening Scene')}
          value={initialText}
          onChange={e => onInitialTextChange(e.target.value)}
          error={errors?.initialText}
          maxLength={5000}
          rows={12}
          placeholder={t('story:form.initialTextPlaceholder', 'The story begins...')}
        />
        <p className="mt-1 text-sm text-muted">
          {t('story:form.initialTextHint', 'This is the opening scene that players will see when starting the story.')}
        </p>
      </div>

      {/* Objectives */}
      <div>
        <ObjectivesList
          objectives={objectives}
          onChange={onObjectivesChange}
        />
      </div>
    </div>
  );
}
