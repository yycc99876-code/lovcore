import { useState } from 'react';
import type { Item, LovcoreSpace } from '../types';
import { useTranslatedSpace } from '../i18n';
import { isVisibleFolio } from '../lib/spaceVisibility';
import { FolioPeek } from './FolioPeek';

interface SpacePillsProps {
  spaces: LovcoreSpace[];
  items?: Item[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onCreateFolio?: () => void;
}

function SpacePillButton({
  space,
  items = [],
  isActive,
  onSelect,
}: {
  space: LovcoreSpace;
  items?: Item[];
  isActive: boolean;
  onSelect: () => void;
}) {
  const { name, description } = useTranslatedSpace(space);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <button
      className={`space-pill ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      title={description}
    >
      <span
        className="space-color-dot"
        style={{ borderColor: space.color || 'var(--accent)' }}
      />
      {name}
      <FolioPeek space={space} items={items} active={isHovering} variant="pill" />
    </button>
  );
}

export const SpacePills = ({ spaces, items = [], activeSpaceId, onSelectSpace, onCreateFolio }: SpacePillsProps) => {
  const visibleSpaces = spaces.filter(isVisibleFolio);

  return (
    <div className="space-pills-row">
      {visibleSpaces.map((space) => (
        <SpacePillButton
          key={space.id}
          space={space}
          items={items}
          isActive={activeSpaceId === space.id}
          onSelect={() => onSelectSpace(space.id)}
        />
      ))}
      {onCreateFolio && (
        <button className="space-pill create-folio-pill" onClick={onCreateFolio}>
          + Create Folio
        </button>
      )}
    </div>
  );
};
