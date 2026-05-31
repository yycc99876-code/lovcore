'use client';

import { Plus } from 'lucide-react';
import type { Item, LovcoreSpace } from '../types';
import { useTranslation, useTranslatedSpace } from '../i18n';
import { useFileUrl } from '../lib/fileStore';

interface SpacesViewProps {
  spaces: LovcoreSpace[];
  items: Item[];
  onCreateSpace: () => void;
  onOpenSpace: (spaceId: string) => void;
}

const getSpaceItems = (space: LovcoreSpace, items: Item[]) => {
  if (space.id === 'space-all') return items;

  return items.filter((item) => {
    if (space.selectedType && space.selectedType !== 'all' && item.type !== space.selectedType) return false;
    if (space.tags && space.tags.length > 0) {
      return space.tags.every((tag) => item.tags.includes(tag));
    }
    if (space.query) {
      const haystack = [item.title, item.summary, item.content, item.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(space.query.toLowerCase());
    }
    return false;
  });
};

function SpacePreviewThumb({ item, style }: { item: Item; style: React.CSSProperties }) {
  const resolved = useFileUrl(item.thumbnail);
  return (
    <span
      className="space-preview-thumb"
      style={{ ...style, backgroundImage: resolved ? `url(${resolved})` : undefined }}
    >
      {!resolved && item.type.toUpperCase()}
    </span>
  );
}

function SpaceCard({ space, items, onOpen }: { space: LovcoreSpace; items: Item[]; onOpen: () => void }) {
  const { t } = useTranslation();
  const { name } = useTranslatedSpace(space);
  const matchedItems = getSpaceItems(space, items);
  const previewItems = matchedItems.slice(0, 3);

  return (
    <button className="space-overview-card" onClick={onOpen}>
      <div className="space-preview-stack">
        {previewItems.map((item, index) => (
          <SpacePreviewThumb
            key={item.id}
            item={item}
            style={{ transform: `translate(${index * 28}px, ${index * -4}px)` }}
          />
        ))}
      </div>
      <div className="space-card-label">
        <span className="space-color-dot" style={{ borderColor: space.color || 'var(--accent)' }} />
        <strong>{name}</strong>
      </div>
      <span className="space-card-count">{matchedItems.length} {t.spaces.cards}</span>
    </button>
  );
}

export const SpacesView = ({ spaces, items, onCreateSpace, onOpenSpace }: SpacesViewProps) => {
  const { t } = useTranslation();
  const visibleSpaces = spaces.filter((space) => space.id !== 'space-all');

  return (
    <main className="spaces-view">
      <div className="section-heading-row">
        <h1>{t.spaces.allFolios}</h1>
        <button className="create-space-button" onClick={onCreateSpace}>
          <Plus size={16} />
          {t.spaces.createNew}
        </button>
      </div>
      <div className="section-hairline" />

      <div className="spaces-grid">
        {visibleSpaces.map((space) => (
          <SpaceCard
            key={space.id}
            space={space}
            items={items}
            onOpen={() => onOpenSpace(space.id)}
          />
        ))}
      </div>
    </main>
  );
};
