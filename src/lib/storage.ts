import { mockItems } from '../mockData';
import type { Item } from '../types';

const ITEMS_KEY = 'lovcore_items';
const ITEMS_VERSION_KEY = 'lovcore_items_version';
const CURRENT_ITEMS_VERSION = 'phase8-restore-ai-stack-layout';

const MOCK_IDS = new Set(mockItems.map((item) => item.id));

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
    localStorage.setItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(mockItems));
    return mockItems;
  }

  try {
    const parsed = JSON.parse(saved) as Item[];

    if (!Array.isArray(parsed) || shouldResetStoredItems(parsed)) {
      localStorage.setItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
      localStorage.setItem(ITEMS_KEY, JSON.stringify(mockItems));
      return mockItems;
    }

    return parsed;
  } catch {
    localStorage.setItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(mockItems));
    return mockItems;
  }
};

export const persistItems = (items: Item[]) => {
  localStorage.setItem(ITEMS_VERSION_KEY, CURRENT_ITEMS_VERSION);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
};
