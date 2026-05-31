import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Item, LovcoreSpace } from '../types';
import { useTranslation, useTranslatedSpace } from '../i18n';
import { useFileUrl } from '../lib/fileStore';
import { isVisibleFolio } from '../lib/spaceVisibility';
import { FolioPeek } from './FolioPeek';

interface SpacesViewProps {
  spaces: LovcoreSpace[];
  items: Item[];
  onCreateSpace: () => void;
  onOpenSpace: (spaceId: string) => void;
  onDeleteSpace?: (spaceId: string) => void;
}

const getSpaceItems = (space: LovcoreSpace, items: Item[]) => {
  if (space.id === 'space-all') return items;

  return items.filter((item) => {
    // Explicit assignment
    if (item.assignedSpaceIds?.includes(space.id)) return true;

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
  const resolved = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  return (
    <span
      className="space-preview-thumb"
      style={{ ...style, backgroundImage: resolved ? `url(${resolved})` : undefined }}
    >
      {!resolved && item.type.toUpperCase()}
    </span>
  );
}

function SpaceCard({ space, items, onOpen, onDelete }: { space: LovcoreSpace; items: Item[]; onOpen: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  const { name } = useTranslatedSpace(space);
  const [isHovering, setIsHovering] = useState(false);
  const matchedItems = getSpaceItems(space, items);
  const previewItems = matchedItems.slice(0, 3);
  const canDelete = !space.system && space.type !== 'default';

  return (
    <div className="space-overview-card-wrapper">
      <button
        className="space-overview-card"
        onClick={onOpen}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsHovering(true)}
        onBlur={() => setIsHovering(false)}
      >
        <div className="space-preview-stack">
          {/* Background color glow effect on hover */}
          <div
            className="space-card-glow-bg"
            style={{
              background: space.color || 'var(--accent)'
            }}
          />
          {previewItems.map((item, index) => (
            <SpacePreviewThumb
              key={item.id}
              item={item}
              style={{ transform: `translate(${index * 28}px, ${index * -4}px)` }}
            />
          ))}
          <FolioPeek space={space} items={items} active={isHovering} variant="overview" />
        </div>
        <div className="space-card-label">
          <span className="space-color-dot" style={{ borderColor: space.color || 'var(--accent)' }} />
          <strong>{name}</strong>
        </div>
        <span className="space-card-count">{matchedItems.length} {t.spaces.cards}</span>
      </button>
      {canDelete && onDelete && (
        <button
          className="space-card-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete folio"
          aria-label="Delete folio"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export const SpacesView = ({ spaces, items, onCreateSpace, onOpenSpace, onDeleteSpace }: SpacesViewProps) => {
  const { t } = useTranslation();
  const visibleSpaces = spaces.filter(isVisibleFolio);

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

      {visibleSpaces.length === 0 ? (
        <div className="folios-empty-state">
          <p className="folios-empty-kicker">Folios</p>
          <h2>{t.spaces.emptyTitle}</h2>
          <p>{t.spaces.emptyDesc}</p>
          <button className="create-space-button folios-empty-create" onClick={onCreateSpace}>
            <Plus size={15} />
            {t.spaces.createNew}
          </button>
        </div>
      ) : (
        <div className="spaces-grid">
          {visibleSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              items={items}
              onOpen={() => onOpenSpace(space.id)}
              onDelete={onDeleteSpace ? () => onDeleteSpace(space.id) : undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
};
