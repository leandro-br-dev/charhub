import { StoryCoverImageUploader } from './StoryCoverImageUploader';

interface MediaTabProps {
  value?: string;
  onChange: (url: string) => void;
}

export function MediaTab({ value = '', onChange }: MediaTabProps): JSX.Element {
  return (
    <div className="space-y-6">
      <StoryCoverImageUploader
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
