'use client';

import { useMemo, useState } from 'react';
import type { CardTypeFilter, Item, LovcoreSpace } from '../types';

const mergeTags = (spaceTags: string[] = [], activeTags: string[]) => {
  return Array.from(new Set([...spaceTags, ...activeTags]));
};

export const useSearch = (items: Item[], activeSpace?: LovcoreSpace) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedType, setSelectedType] = useState<CardTypeFilter>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const allTags = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.tags))).filter((tag) => tag.trim() !== ''),
    [items],
  );

  const toggleTag = (tag: string) => {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((activeTag) => activeTag !== tag) : [...current, tag],
    );
  };

  const resetFilters = () => {
    setSearchValue('');
    setSelectedType('all');
    setActiveTags([]);
  };

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const spaceQuery = activeSpace?.query?.trim().toLowerCase() || '';
    const effectiveType = selectedType !== 'all' ? selectedType : activeSpace?.selectedType || 'all';
    const effectiveTags = mergeTags(activeSpace?.tags, activeTags);

    return items.filter((item) => {
      if (effectiveType !== 'all' && item.type !== effectiveType) return false;

      if (effectiveTags.length > 0) {
        const hasAllActiveTags = effectiveTags.every((tag) => item.tags.includes(tag));
        if (!hasAllActiveTags) return false;
      }

      const searchableText = [
        item.title,
        item.content,
        item.summary,
        item.sourceUrl,
        item.tags.join(' '),
        item.keyClaims?.join(' '),
        item.whyItMatters,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (spaceQuery && !searchableText.includes(spaceQuery)) return false;
      if (query && !searchableText.includes(query)) return false;

      return true;
    });
  }, [activeSpace, activeTags, items, searchValue, selectedType]);

  return {
    searchValue,
    setSearchValue,
    selectedType,
    setSelectedType,
    activeTags,
    allTags,
    toggleTag,
    resetFilters,
    filteredItems,
    effectiveType: selectedType !== 'all' ? selectedType : activeSpace?.selectedType || 'all',
    effectiveTags: mergeTags(activeSpace?.tags, activeTags),
  };
};
