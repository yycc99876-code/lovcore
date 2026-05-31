'use client';

import type { LovcoreSpace } from '../types';
import { useTranslatedSpace } from '../i18n';

interface SpacePillsProps {
  spaces: LovcoreSpace[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
}

function SpacePillButton({ space, isActive, onSelect }: { space: LovcoreSpace; isActive: boolean; onSelect: () => void }) {
  const { name, description } = useTranslatedSpace(space);

  return (
    <button
      className={`space-pill ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      title={description}
    >
      <span
        className="space-color-dot"
        style={{ borderColor: space.color || 'var(--accent)' }}
      />
      {name}
    </button>
  );
}

export const SpacePills = ({ spaces, activeSpaceId, onSelectSpace }: SpacePillsProps) => {
  const visibleSpaces = spaces.filter((space) => space.id !== 'space-all');

  if (visibleSpaces.length === 0) return null;

  return (
    <div className="space-pills-row">
      {visibleSpaces.map((space) => (
        <SpacePillButton
          key={space.id}
          space={space}
          isActive={activeSpaceId === space.id}
          onSelect={() => onSelectSpace(space.id)}
        />
      ))}
    </div>
  );
};
