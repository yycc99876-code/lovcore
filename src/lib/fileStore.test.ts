import { describe, it, expect } from 'vitest';
import { isFileRef, fileRefKey, makeFileRef, FILE_REF_PREFIX } from './fileStore';

describe('fileStore utils', () => {
  describe('isFileRef', () => {
    it('returns true for indexeddb:// refs', () => {
      expect(isFileRef('indexeddb://abc123')).toBe(true);
    });

    it('returns false for http URLs', () => {
      expect(isFileRef('https://example.com/img.png')).toBe(false);
    });

    it('returns false for blob URLs', () => {
      expect(isFileRef('blob:http://localhost/abc')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFileRef(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isFileRef('')).toBe(false);
    });
  });

  describe('fileRefKey', () => {
    it('extracts the key from a file ref', () => {
      expect(fileRefKey('indexeddb://my-key')).toBe('my-key');
    });

    it('handles keys with special characters', () => {
      expect(fileRefKey('indexeddb://1716451234567')).toBe('1716451234567');
    });
  });

  describe('makeFileRef', () => {
    it('creates a file ref from an item id', () => {
      expect(makeFileRef('abc123')).toBe('indexeddb://abc123');
    });

    it('prefix matches FILE_REF_PREFIX', () => {
      const ref = makeFileRef('test');
      expect(ref.startsWith(FILE_REF_PREFIX)).toBe(true);
    });
  });

  describe('roundtrip', () => {
    it('makeFileRef -> isFileRef -> fileRefKey is identity', () => {
      const id = 'item-42';
      const ref = makeFileRef(id);
      expect(isFileRef(ref)).toBe(true);
      expect(fileRefKey(ref)).toBe(id);
    });
  });
});
