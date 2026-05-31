import { describe, it, expect, beforeEach } from 'vitest';
import { loadStoredItems, persistItems } from './storage';

describe('storage', () => {
  beforeEach(() => {
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
});
