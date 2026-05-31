import { describe, it, expect } from 'vitest';
import { isHttpUrl, createAnalyzingItem } from './ingestion';

describe('isHttpUrl', () => {
  it('returns true for https URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isHttpUrl('http://test.org/path?q=1')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isHttpUrl('hello world')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isHttpUrl('')).toBe(false);
  });

  it('returns false for partial URLs', () => {
    expect(isHttpUrl('example.com')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
  });
});

describe('createAnalyzingItem', () => {
  it('creates an item with analyzing status', () => {
    const item = createAnalyzingItem('note', { content: 'test' });
    expect(item.status).toBe('analyzing');
    expect(item.type).toBe('note');
    expect(item.content).toBe('test');
  });

  it('generates an id based on timestamp', () => {
    const item = createAnalyzingItem('note', {});
    expect(item.id).toBeTruthy();
    expect(typeof item.id).toBe('string');
    expect(item.id.length).toBeGreaterThan(0);
  });

  it('applies initial fields', () => {
    const item = createAnalyzingItem('image', {
      title: 'My Photo',
      thumbnail: 'blob:test',
    });
    expect(item.title).toBe('My Photo');
    expect(item.thumbnail).toBe('blob:test');
  });

  it('uses default title when not provided', () => {
    const item = createAnalyzingItem('link', {});
    expect(item.title).toBe('Analyzing...');
  });

  it('sets createdAt to ISO string', () => {
    const item = createAnalyzingItem('note', {});
    expect(() => new Date(item.createdAt)).not.toThrow();
  });
});
