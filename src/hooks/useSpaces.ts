import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { defaultSpaces } from '../data/spaces';
import { createLovcoreOriginalSpace } from '../data/lovcoreOriginalSeed';
import { supabase } from '../lib/supabaseClient';
import { dbToSpace, spaceToDb } from '../lib/supabaseMappers';
import { isAllSpace, isLegacyDefaultFolio } from '../lib/spaceVisibility';
import type { CardTypeFilter, LovcoreSpace } from '../types';
import { useTranslation } from '../i18n';

interface SpaceDraft {
  query: string;
  selectedType: CardTypeFilter;
  activeTags: string[];
}

interface ManualSpaceDraft {
  name: string;
  color: string;
}

interface SmartSpaceDraft {
  name: string;
  color: string;
  ruleText: string;
  tags: string[];
  selectedType: string;
  semanticQuery: string;
  description: string;
}

const SPACES_KEY = 'lovcore_spaces';
const SPACES_VERSION_KEY = 'lovcore_spaces_version';
const CURRENT_SPACES_VERSION = 'phase9-folios-user-created-only';
const ALL_SPACE_ID = 'space-all';
const ALL_SPACE = defaultSpaces.find((space) => space.id === ALL_SPACE_ID) ?? defaultSpaces[0];
const STARTER_SPACE_SEED_KEY_PREFIX = 'lovcore:starter-folio-seeded:';

const normalizeSpaces = (incoming: LovcoreSpace[]) => {
  const userFolios = incoming.filter((space) => !isAllSpace(space) && !isLegacyDefaultFolio(space));
  return [ALL_SPACE, ...userFolios];
};

const loadSpaces = (): LovcoreSpace[] => {
  const saved = localStorage.getItem(SPACES_KEY);
  const version = localStorage.getItem(SPACES_VERSION_KEY);

  if (!saved || version !== CURRENT_SPACES_VERSION) {
    localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
    localStorage.setItem(SPACES_KEY, JSON.stringify([ALL_SPACE]));
    return [ALL_SPACE];
  }

  try {
    const parsed = JSON.parse(saved) as LovcoreSpace[];
    if (!Array.isArray(parsed)) {
      localStorage.setItem(SPACES_KEY, JSON.stringify([ALL_SPACE]));
      return [ALL_SPACE];
    }

    return normalizeSpaces(parsed);
  } catch {
    localStorage.setItem(SPACES_KEY, JSON.stringify([ALL_SPACE]));
    return [ALL_SPACE];
  }
};

const createSpaceName = ({ query, selectedType, activeTags }: SpaceDraft) => {
  if (query.trim()) return query.trim();
  if (activeTags.length > 0) return activeTags.map((tag) => `#${tag}`).join(' ');
  if (selectedType !== 'all') return `${selectedType} archive`;
  return 'Untitled Space';
};

interface UseSpacesOptions {
  user?: User | null;
  onToast?: (message: string) => void;
  authLoading?: boolean;
}

export const useSpaces = ({ user, onToast, authLoading = false }: UseSpacesOptions = {}) => {
  const { t } = useTranslation();
  const [spaces, setSpaces] = useState<LovcoreSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpaceId, setActiveSpaceId] = useState(ALL_SPACE_ID);
  const lastUserIdRef = useRef<string | null>(null);

  const isMockMode = !user || (typeof window !== 'undefined' && localStorage.getItem('lovcore:mock-auth') === 'true');

  // Load spaces on mount
  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      return () => {
        cancelled = true;
      };
    }

    if (user && supabase && !isMockMode) {
      // Supabase mode
      const client = supabase;
      const userId = user.id;
      const isUserSwitch = lastUserIdRef.current !== userId;
      lastUserIdRef.current = userId;

      if (isUserSwitch) {
        setSpaces([ALL_SPACE]);
        setActiveSpaceId(ALL_SPACE_ID);
      }
      setLoading(true);
      supabase
        .from('spaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .then(async ({ data, error }) => {
          if (cancelled) return;

          if (error) {
            console.error('[Lovcore] Failed to load spaces from Supabase:', error);
            onToast?.(t.app.loadFailed);
            setSpaces(loadSpaces());
            setLoading(false);
            return;
          }

          const rows = data ?? [];

          const seedKey = `${STARTER_SPACE_SEED_KEY_PREFIX}${userId}`;

          if (rows.length === 0 && localStorage.getItem(seedKey) !== 'true') {
            const seededSpace = createLovcoreOriginalSpace(userId);
            const nextSpaces = normalizeSpaces([seededSpace]);
            setSpaces(nextSpaces);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client.from('spaces') as any).insert(spaceToDb(seededSpace, userId)).then(({ error }: { error: unknown }) => {
              if (error) {
                console.error('[Lovcore] Failed to create starter folio:', error);
                onToast?.(t.app.saveFailed);
              } else {
                localStorage.setItem(seedKey, 'true');
              }
            });
            setLoading(false);
            return;
          }

          setSpaces(normalizeSpaces(rows.map(dbToSpace)));
          setLoading(false);
        });
    } else {
      // localStorage mode
      lastUserIdRef.current = null;
      setSpaces(loadSpaces());
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, onToast, t, isMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage in local mode
  useEffect(() => {
    if (isMockMode && !loading) {
      localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
      localStorage.setItem(SPACES_KEY, JSON.stringify(spaces));
    }
  }, [spaces, isMockMode, loading]);

  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? ALL_SPACE,
    [activeSpaceId, spaces],
  );

  const selectSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId);
  };

  const clearSpace = () => {
    setActiveSpaceId(ALL_SPACE_ID);
  };

  const saveSmartSpace = useCallback((draft: SpaceDraft) => {
    const query = draft.query.trim();
    const selectedType = draft.selectedType;
    const tags = [...draft.activeTags];

    const hasMeaningfulFilter = query || selectedType !== 'all' || tags.length > 0;
    if (!hasMeaningfulFilter) return null;

    const now = new Date().toISOString();
    const newSpace: LovcoreSpace = {
      id: `user-space-${Date.now()}`,
      name: createSpaceName(draft),
      type: 'smart',
      description: 'Saved from the current search and filter state.',
      query,
      selectedType,
      tags,
      createdAt: now,
      updatedAt: now,
    };

    const nextSpaces = [...spaces, newSpace];
    setSpaces(nextSpaces);
    setActiveSpaceId(newSpace.id);

    if (!user || isMockMode) {
      localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
      localStorage.setItem(SPACES_KEY, JSON.stringify(nextSpaces));
    } else if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('spaces') as any).insert(spaceToDb(newSpace, user.id)).then(({ error }: { error: unknown }) => {
        if (error) {
          console.error('[Lovcore] Failed to create space:', error);
          onToast?.(t.app.saveFailed);
        }
      });
    }

    return newSpace;
  }, [spaces, user, onToast, t, isMockMode]);

  const createManualSpace = useCallback(({ name, color }: ManualSpaceDraft) => {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const now = new Date().toISOString();
    const newSpace: LovcoreSpace = {
      id: `user-space-${Date.now()}`,
      name: cleanName,
      type: 'smart',
      color,
      description: 'A user-created space. Add assignment rules later, or use it as a visual collection shell.',
      selectedType: 'all',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    const nextSpaces = [...spaces, newSpace];
    setSpaces(nextSpaces);
    setActiveSpaceId(newSpace.id);

    if (!user || isMockMode) {
      localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
      localStorage.setItem(SPACES_KEY, JSON.stringify(nextSpaces));
    } else if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('spaces') as any).insert(spaceToDb(newSpace, user.id)).then(({ error }: { error: unknown }) => {
        if (error) {
          console.error('[Lovcore] Failed to create space:', error);
          onToast?.(t.app.saveFailed);
        }
      });
    }

    return newSpace;
  }, [spaces, user, onToast, t, isMockMode]);

  const createSmartSpace = useCallback((draft: SmartSpaceDraft) => {
    const cleanName = draft.name.trim();
    if (!cleanName) return null;

    const now = new Date().toISOString();
    const newSpace: LovcoreSpace = {
      id: `user-space-${Date.now()}`,
      name: cleanName,
      type: 'smart',
      color: draft.color,
      description: draft.description,
      selectedType: draft.selectedType as LovcoreSpace['selectedType'],
      tags: draft.tags,
      ruleText: draft.ruleText,
      semanticQuery: draft.semanticQuery,
      suggestedTags: draft.tags,
      createdAt: now,
      updatedAt: now,
    };

    const nextSpaces = [...spaces, newSpace];
    setSpaces(nextSpaces);
    setActiveSpaceId(newSpace.id);

    if (!user || isMockMode) {
      localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
      localStorage.setItem(SPACES_KEY, JSON.stringify(nextSpaces));
    } else if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('spaces') as any).insert(spaceToDb(newSpace, user.id)).then(({ error }: { error: unknown }) => {
        if (error) {
          console.error('[Lovcore] Failed to create space:', error);
          onToast?.(t.app.saveFailed);
        }
      });
    }

    return newSpace;
  }, [spaces, user, onToast, t, isMockMode]);

  const deleteSpace = useCallback((spaceId: string) => {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space || space.id === ALL_SPACE_ID || space.type === 'default' || space.system) return;

    const nextSpaces = spaces.filter((item) => item.id !== spaceId);
    setSpaces(nextSpaces);

    if (user && supabase && !isMockMode) {
      supabase.from('spaces').delete().eq('id', spaceId).eq('user_id', user.id).then(({ error }) => {
        if (error) {
          console.error('[Lovcore] Failed to delete space:', error);
          onToast?.(t.app.deleteFailed);
        }
      });
    } else {
      localStorage.setItem(SPACES_VERSION_KEY, CURRENT_SPACES_VERSION);
      localStorage.setItem(SPACES_KEY, JSON.stringify(nextSpaces));
    }

    if (activeSpaceId === spaceId) {
      setActiveSpaceId(ALL_SPACE_ID);
    }
  }, [spaces, activeSpaceId, user, onToast, t, isMockMode]);

  return {
    spaces,
    activeSpace,
    activeSpaceId,
    selectSpace,
    clearSpace,
    saveSmartSpace,
    createManualSpace,
    createSmartSpace,
    deleteSpace,
    loading,
  };
};
