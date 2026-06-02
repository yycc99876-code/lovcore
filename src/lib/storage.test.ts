import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStoredItems, persistItems } from './storage';

describe('storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns mockItems when localStorage is empty', () => {
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).toHaveProperty('type');
    expect(items[0]).toHaveProperty('status');
  });

  it('returns mockItems when version is missing', () => {
    localStorage.setItem('lovcore_items', JSON.stringify([{ id: 'x' }]));
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('persists and reloads items', () => {
    const original = loadStoredItems();
    persistItems(original);
    const reloaded = loadStoredItems();
    expect(reloaded).toEqual(original);
  });

  it('resets when JSON is corrupted', () => {
    localStorage.setItem('lovcore_items', 'not-json');
    localStorage.setItem('lovcore_items_version', 'phase7-resume-fix');
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('resets when stored array is empty', () => {
    localStorage.setItem('lovcore_items', '[]');
    localStorage.setItem('lovcore_items_version', 'phase7-resume-fix');
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('does not throw when localStorage quota is exceeded by inline thumbnails', () => {
    const originalSetItem = Storage.prototype.setItem;
    let firstItemsWrite = true;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key: string, value: string) {
      if (key === 'lovcore_items' && value.includes('data:image') && firstItemsWrite) {
        firstItemsWrite = false;
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    expect(() =>
      persistItems([
        {
          id: 'local-clip',
          type: 'link',
          status: 'saved',
          title: 'Local clip',
          content: 'https://example.com',
          thumbnail: 'data:image/jpeg;base64,abc',
          createdAt: '2026-06-02',
          tags: [],
        },
      ]),
    ).not.toThrow();

    const saved = JSON.parse(localStorage.getItem('lovcore_items') || '[]');
    expect(saved[0].thumbnail).toBeUndefined();
  });
});
