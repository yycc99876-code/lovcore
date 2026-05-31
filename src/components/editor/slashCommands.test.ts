import { describe, it, expect } from 'vitest';
import { filterSlashCommands, slashCommandItems } from './slashCommands';

describe('filterSlashCommands', () => {
  it('returns all items when query is empty', () => {
    expect(filterSlashCommands('')).toHaveLength(slashCommandItems.length);
  });

  it('filters by Chinese title', () => {
    const result = filterSlashCommands('标题');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((item) => {
      expect(item.title).toContain('标题');
    });
  });

  it('filters by pinyin alias', () => {
    const result = filterSlashCommands('bg');
    expect(result.some((item) => item.alias === 'bg')).toBe(true);
  });

  it('filters by description', () => {
    const result = filterSlashCommands('代码');
    expect(result.some((item) => item.description.includes('代码'))).toBe(true);
  });

  it('is case-insensitive', () => {
    const lower = filterSlashCommands('bg');
    const upper = filterSlashCommands('BG');
    expect(lower).toEqual(upper);
  });

  it('returns empty for non-matching query', () => {
    expect(filterSlashCommands('zzzznonexistent')).toHaveLength(0);
  });
});
