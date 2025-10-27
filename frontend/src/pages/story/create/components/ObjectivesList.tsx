import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../../../components/ui';
import type { StoryObjective } from '../../../../types/story';

interface ObjectivesListProps {
  objectives: StoryObjective[];
  onChange: (objectives: StoryObjective[]) => void;
}

export function ObjectivesList({ objectives, onChange }: ObjectivesListProps) {
  const { t } = useTranslation('story');
  const [newObjective, setNewObjective] = useState('');

  const handleAdd = () => {
    if (newObjective.trim()) {
      onChange([...objectives, { description: newObjective.trim(), completed: false }]);
      setNewObjective('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(objectives.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-content">
        {t('form.objectives')}
      </label>

      {/* Existing Objectives */}
      {objectives.length > 0 && (
        <div className="space-y-2">
          {objectives.map((objective, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-light border border-border rounded-lg"
            >
              <span className="flex-grow text-sm text-content">
                {objective.description}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-error hover:text-error/80 text-sm font-medium"
              >
                {t('common:remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Objective */}
      <div className="flex gap-2">
        <Input
          value={newObjective}
          onChange={e => setNewObjective(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('form.objectivePlaceholder')}
          className="flex-grow"
        />
        <Button
          type="button"
          onClick={handleAdd}
          variant="secondary"
          disabled={!newObjective.trim()}
        >
          {t('common:add')}
        </Button>
      </div>

      {objectives.length === 0 && (
        <p className="text-sm text-muted italic">
          {t('form.noObjectives')}
        </p>
      )}
    </div>
  );
}
