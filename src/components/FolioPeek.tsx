import { useEffect, useMemo, useState } from 'react';
import type { Item, LovcoreSpace } from '../types';
import { useFileUrl } from '../lib/fileStore';

interface FolioPeekProps {
  space: LovcoreSpace;
  items: Item[];
  active: boolean;
  variant?: 'pill' | 'overview';
}

const STEP_MS = 900;

const getFolioItems = (space: LovcoreSpace, items: Item[]) => {
  return items.filter((item) => {
    if (item.assignedSpaceIds?.includes(space.id)) return true;

    if (space.selectedType && space.selectedType !== 'all' && item.type !== space.selectedType) return false;
    if (space.tags?.length) return space.tags.every((tag) => item.tags.includes(tag));
    if (space.query) {
      const haystack = [item.title, item.content, item.summary, item.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(space.query.toLowerCase());
    }

    return false;
  });
};

function FolioPeekCard({ item, index }: { item: Item; index: number }) {
  const resolvedThumbnail = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  const label = item.title || item.type;

  return (
    <span className={`folio-peek-card folio-peek-card-${index}`} title={label}>
      {resolvedThumbnail ? (
        <img src={resolvedThumbnail} alt="" draggable={false} />
      ) : (
        <span className="folio-peek-fallback">{item.type}</span>
      )}
    </span>
  );
}

export function FolioPeek({ space, items, active, variant = 'pill' }: FolioPeekProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const folioItems = useMemo(() => getFolioItems(space, items), [items, space]);

  useEffect(() => {
    if (!active || folioItems.length === 0) {
      setCurrentIndex(0); // eslint-disable-line react-hooks/set-state-in-effect
      setIsVisible(false);
      return;
    }

    setCurrentIndex(0);
    setIsVisible(true);

    const interval = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % folioItems.length);
    }, STEP_MS);

    return () => window.clearInterval(interval);
  }, [active, folioItems.length]);

  if (folioItems.length === 0 || !isVisible) return null;

  const currentItem = folioItems[currentIndex];

  return (
    <span className={`folio-peek folio-peek-${variant}`} aria-hidden="true">
      <FolioPeekCard key={`${currentItem.id}-${currentIndex}`} item={currentItem} index={0} />
      {folioItems.length > 1 && (
        <span className="folio-peek-count">{currentIndex + 1}/{folioItems.length}</span>
      )}
    </span>
  );
}
