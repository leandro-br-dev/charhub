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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-content">
        {t('form.objectives')}
      </label>

      {/* Existing Objectives */}
      {objectives.length > 0 && (
        <div className="space-y-1">
          {objectives.map((objective, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-1.5 py-0.5 bg-light border border-border rounded text-xs"
            >
              <span className="flex-grow text-content truncate">
                {objective.description}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-error hover:text-error/80 p-0.5 rounded hover:bg-error/10 transition-colors flex-shrink-0"
                title={t('common:remove', 'Remove')}
              >
                <span className="material-symbols-outlined text-sm leading-none">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Objective */}
      <div className="flex gap-1.5">
        <Input
          value={newObjective}
          onChange={e => setNewObjective(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('form.objectivePlaceholder')}
          className="flex-grow text-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newObjective.trim()}
          className="px-2 py-1.5 bg-primary text-black rounded text-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title={t('common:add', 'Add')}
        >
          <span className="material-symbols-outlined text-sm leading-none">add</span>
        </button>
      </div>

      {objectives.length === 0 && (
        <p className="text-xs text-muted italic">
          {t('form.noObjectives')}
        </p>
      )}
    </div>
  );
}
