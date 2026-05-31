/**
 * POST /api/ai/scrape-url
 *
 * Fetches a URL and extracts OG metadata (title, description, image).
 * Uses simple regex parsing — no external dependencies.
 *
 * Request body:
 *   { url: string }
 *
 * Response:
 *   { title: string, description: string, image: string, favicon: string, siteName: string }
 */

export interface ScrapeUrlRequest {
  url: string;
}

export interface ScrapeUrlResponse {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
}

function extractMeta(html: string, property: string): string {
  // Match og:title, og:description, og:image, etc.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractTitle(html: string): string {
  // Try og:title first, then <title> tag
  const ogTitle = extractMeta(html, 'og:title');
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() || '';
}

function extractFavicon(html: string, baseUrl: string): string {
  // Look for link rel="icon" or rel="shortcut icon"
  const linkMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);

  if (linkMatch?.[1]) {
    const href = linkMatch[1];
    if (href.startsWith('http')) return href;
    try {
      return new URL(href, baseUrl).href;
    } catch { /* ignore */ }
  }

  // Fallback to /favicon.ico
  try {
    return new URL('/favicon.ico', baseUrl).href;
  } catch {
    return '';
  }
}

function resolveUrl(raw: string, base: string): string {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  try {
    return new URL(raw, base).href;
  } catch {
    return '';
  }
}

export async function handleScrapeUrl(req: ScrapeUrlRequest): Promise<ScrapeUrlResponse> {
  const { url } = req;

  if (!url || !/^https?:\/\//i.test(url)) {
    return { title: '', description: '', image: '', favicon: '', siteName: '' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LovcoreBot/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { title: '', description: '', image: '', favicon: '', siteName: '' };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { title: '', description: '', image: '', favicon: '', siteName: '' };
    }

    // Read only the first 64KB to avoid downloading huge pages
    const reader = response.body?.getReader();
    if (!reader) {
      return { title: '', description: '', image: '', favicon: '', siteName: '' };
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const MAX_SIZE = 65536;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
      if (totalSize >= MAX_SIZE) {
        reader.cancel();
        break;
      }
    }

    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const hostname = new URL(url).hostname;

    const title = extractTitle(html);
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
    const image = resolveUrl(extractMeta(html, 'og:image'), url);
    const favicon = extractFavicon(html, url);
    const siteName = extractMeta(html, 'og:site_name') || hostname.replace('www.', '');

    return { title, description, image, favicon, siteName };
  } catch {
    clearTimeout(timeout);
    return { title: '', description: '', image: '', favicon: '', siteName: '' };
  }
}
