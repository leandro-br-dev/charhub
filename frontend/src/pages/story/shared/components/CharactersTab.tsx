import { CharacterSelector } from '../../create/components/CharacterSelector';

interface CharactersTabProps {
  selectedIds?: string[];
  mainCharacterId?: string;
  onChange: (ids: string[]) => void;
  onMainCharacterChange?: (id: string) => void;
}

export function CharactersTab({
  selectedIds = [],
  mainCharacterId,
  onChange,
  onMainCharacterChange,
}: CharactersTabProps): JSX.Element {
  return (
    <div className="space-y-6">
      <CharacterSelector
        selectedIds={selectedIds}
        mainCharacterId={mainCharacterId}
        onChange={onChange}
        onMainCharacterChange={onMainCharacterChange}
      />
    </div>
  );
}
