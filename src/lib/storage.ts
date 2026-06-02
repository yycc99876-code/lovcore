import { mockItems } from '../mockData';
import type { Item } from '../types';

const ITEMS_KEY = 'lovcore_items';
const ITEMS_VERSION_KEY = 'lovcore_items_version';
const CURRENT_ITEMS_VERSION = 'phase8-restore-ai-stack-layout';

const MOCK_IDS = new Set(mockItems.map((item) => item.id));

function isInlineAsset(value: string | undefined): boolean {
  return !!value && (value.startsWith('data:') || value.startsWith('blob:'));
}

function storageSafeItem(item: Item): Item {
  return {
    ...item,
    // Inline screenshots/base64 thumbnails can easily exceed the browser's
    // localStorage quota. Keep durable refs and remote URLs, drop volatile ones.
    thumbnail: isInlineAsset(item.thumbnail) ? undefined : item.thumbnail,
  };
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn(`[Lovcore] localStorage quota exceeded while writing ${key}.`);
      return false;
    }
    throw err;
  }
}

const shouldResetStoredItems = (items: Item[]) => {
  // Only reset if a known mock item was removed — never reset because
  // user-added items made the array longer than mockItems.
  return items.some((item) => {
    if (!MOCK_IDS.has(item.id)) return false; // user-added item, skip
    if (item.id === '1' && !item.thumbnail?.includes('sequoia_agi')) return true;
    return false;
  });
};

export const loadStoredItems = (): Item[] => {
  const saved = localStorage.getItem(ITEMS_KEY);
  const savedVersion = localStorage.getItem(ITEMS_VERSION_KEY);

  if (!saved || savedVersion !== CURRENT_ITEMS_VERSION) {
    safeSetItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
    safeSetItem(ITEMS_KEY, JSON.stringify(mockItems));
    return mockItems;
  }

  try {
    const parsed = JSON.parse(saved) as Item[];

    if (!Array.isArray(parsed) || shouldResetStoredItems(parsed)) {
      safeSetItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
      safeSetItem(ITEMS_KEY, JSON.stringify(mockItems));
      return mockItems;
    }

    return parsed;
  } catch {
    safeSetItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
    safeSetItem(ITEMS_KEY, JSON.stringify(mockItems));
    return mockItems;
  }
};

export const persistItems = (items: Item[]) => {
  safeSetItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);

  if (safeSetItem(ITEMS_KEY, JSON.stringify(items))) {
    return;
  }

  const compactItems = items.map(storageSafeItem);
  if (safeSetItem(ITEMS_KEY, JSON.stringify(compactItems))) {
    return;
  }

  console.warn('[Lovcore] Could not persist local card cache; keeping the current session in memory only.');
};
