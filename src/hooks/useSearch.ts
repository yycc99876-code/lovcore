import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardTypeFilter, Item, LovcoreSpace } from '../types';
import { cosineSimilarity, getQueryEmbedding, rerankBySimilarity } from '../lib/semanticSearch';

const mergeTags = (spaceTags: string[] = [], activeTags: string[]) => {
  return Array.from(new Set([...spaceTags, ...activeTags]));
};

export const useSearch = (items: Item[], activeSpace?: LovcoreSpace) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedType, setSelectedType] = useState<CardTypeFilter>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [spaceEmbedding, setSpaceEmbedding] = useState<number[] | null>(null);
  const embedAbortRef = useRef(0);
  const spaceEmbedAbortRef = useRef(0);

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
    setQueryEmbedding(null);
  };

  // Generate space embedding when active space has a semanticQuery
  const spaceSemanticQuery = activeSpace?.semanticQuery?.trim() || '';
  useEffect(() => {
    if (!spaceSemanticQuery) {
      setSpaceEmbedding(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const requestId = ++spaceEmbedAbortRef.current;
    getQueryEmbedding(spaceSemanticQuery)
      .then((embedding) => {
        if (requestId === spaceEmbedAbortRef.current) {
          setSpaceEmbedding(embedding);
        }
      })
      .catch(() => {});
  }, [spaceSemanticQuery]);

  // Generate query embedding when search value changes (debounced via useMemo timing)
  const trimmedQuery = searchValue.trim();
  useEffect(() => {
    if (!trimmedQuery || trimmedQuery.length < 3) {
      setQueryEmbedding(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const requestId = ++embedAbortRef.current;
    const timeout = setTimeout(() => {
      getQueryEmbedding(trimmedQuery)
        .then((embedding) => {
          if (requestId === embedAbortRef.current) {
            setQueryEmbedding(embedding);
          }
        })
        .catch(() => {});
    }, 600);

    return () => {
      clearTimeout(timeout);
    };
  }, [trimmedQuery]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const spaceQuery = activeSpace?.query?.trim().toLowerCase() || '';
    const effectiveType = selectedType !== 'all' ? selectedType : activeSpace?.selectedType || 'all';
    const effectiveTags = mergeTags(activeSpace?.tags, activeTags);

    // Base filter: type + tags (always applied)
    const baseFiltered = items.filter((item) => {
      if (effectiveType !== 'all' && item.type !== effectiveType) return false;

      if (effectiveTags.length > 0) {
        if (!effectiveTags.every((tag) => item.tags.includes(tag))) return false;
      }

      return true;
    });

    // Space-level filtering: semanticQuery takes priority over keyword query
    let spaceFiltered: Item[];
    const hasSemanticSpace = !!spaceSemanticQuery && spaceEmbedding && spaceEmbedding.length > 0;
    const spaceId = activeSpace?.id;

    // Explicitly assigned items always pass space filter
    const assignedItems = spaceId && spaceId !== 'space-all'
      ? baseFiltered.filter((item) => item.assignedSpaceIds?.includes(spaceId))
      : [];
    const unassignedItems = spaceId && spaceId !== 'space-all'
      ? baseFiltered.filter((item) => !item.assignedSpaceIds?.includes(spaceId))
      : baseFiltered;

    if (hasSemanticSpace) {
      // Semantic space: rank by similarity to space's semanticQuery, apply threshold
      const SPACE_THRESHOLD = 0.2;
      const ranked = unassignedItems.map((item) => ({
        item,
        score: item.embedding ? cosineSimilarity(spaceEmbedding, item.embedding) : -1,
      })).filter((s) => s.score < 0 || s.score >= SPACE_THRESHOLD);
      ranked.sort((a, b) => {
        if (a.score >= 0 && b.score >= 0) return b.score - a.score;
        if (a.score >= 0) return -1;
        if (b.score >= 0) return 1;
        return 0;
      });
      spaceFiltered = [...assignedItems, ...ranked.map((s) => s.item)];
    } else if (spaceQuery) {
      // Keyword space: filter by keyword match
      const keywordFiltered = unassignedItems.filter((item) => {
        const searchableText = [item.title, item.content, item.summary, item.tags.join(' ')]
          .filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(spaceQuery);
      });
      spaceFiltered = [...assignedItems, ...keywordFiltered];
    } else {
      spaceFiltered = [...assignedItems, ...unassignedItems];
    }

    if (!query) return spaceFiltered;

    // User search: with embedding → hybrid ranking, without → keyword filter
    if (queryEmbedding && queryEmbedding.length > 0) {
      return rerankBySimilarity(spaceFiltered, queryEmbedding, query);
    }

    return spaceFiltered.filter((item) => {
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
      return searchableText.includes(query);
    });
  }, [activeSpace, activeTags, items, searchValue, selectedType, queryEmbedding, spaceSemanticQuery, spaceEmbedding]);

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
