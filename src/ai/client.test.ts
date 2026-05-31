import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
const { autocomplete, ghostCorrect, rewrite, summarize, scrapeUrl } = await import('./client');

describe('AI client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('autocomplete', () => {
    it('sends correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestion: 'hello', confidence: 0.8 }),
      });

      const result = await autocomplete({
        paragraph: 'test',
        beforeCursor: 'test',
        afterCursor: '',
        fullContext: 'test',
      });

      expect(result.suggestion).toBe('hello');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/autocomplete',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      await expect(
        autocomplete({ paragraph: '', beforeCursor: '', afterCursor: '', fullContext: '' }),
      ).rejects.toThrow('AI API error 500');
    });
  });

  describe('ghostCorrect', () => {
    it('sends correct payload and parses response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: [] }),
      });

      const result = await ghostCorrect({
        paragraphText: 'test text',
        fullContext: 'test text',
      });

      expect(result.suggestions).toEqual([]);
    });
  });

  describe('rewrite', () => {
    it('sends rewrite request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rewritten: 'rewritten text' }),
      });

      const result = await rewrite({
        text: 'original',
        instruction: 'make it formal',
      });

      expect(result.rewritten).toBe('rewritten text');
    });
  });

  describe('summarize', () => {
    it('sends summarize request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: 'short summary' }),
      });

      const result = await summarize({
        text: 'long text here',
        style: 'brief',
      });

      expect(result.summary).toBe('short summary');
    });
  });

  describe('scrapeUrl', () => {
    it('sends scrape request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          title: 'Page Title',
          description: 'A page',
          image: '',
          favicon: '',
          siteName: 'example',
        }),
      });

      const result = await scrapeUrl({ url: 'https://example.com' });

      expect(result.title).toBe('Page Title');
    });
  });

  describe('error handling', () => {
    it('includes status code in error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      });

      await expect(
        summarize({ text: 'test' }),
      ).rejects.toThrow('429');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network fail'));

      await expect(
        summarize({ text: 'test' }),
      ).rejects.toThrow('Network fail');
    });
  });
});
