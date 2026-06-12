import { withHandler } from '../../server/api/handler.js';

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

/**
 * Check if a hostname resolves to a private/internal network address.
 * Prevents SSRF attacks that target internal services.
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // IPv6 loopback
  if (h === '::1' || h === '[::1]') return true;
  // IPv6 private ranges
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;

  // Strip IPv6 bracket wrapper
  const ip = h.replace(/^\[|]$/g, '');

  // IPv4 loopback
  if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('127.')) return true;

  // Private IPv4 ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    // Link-local
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  // Block common internal hostnames
  const blocked = ['localhost', 'metadata.google.internal', '169.254.169.254'];
  if (blocked.includes(h)) return true;

  return false;
}

export async function handleScrapeUrl(req: ScrapeUrlRequest): Promise<ScrapeUrlResponse> {
  const { url } = req;

  if (!url || !/^https?:\/\//i.test(url)) {
    return { title: '', description: '', image: '', favicon: '', siteName: '' };
  }

  // SSRF protection: block requests to private/internal networks
  try {
    const parsed = new URL(url);
    if (isPrivateHost(parsed.hostname)) {
      return { title: '', description: '', image: '', favicon: '', siteName: '' };
    }
  } catch {
    return { title: '', description: '', image: '', favicon: '', siteName: '' };
  }

  const MAX_SIZE = 65536;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',  // Don't auto-follow redirects — prevents SSRF bypass via redirect
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LovcoreBot/1.0)',
        'Accept': 'text/html',
      },
    });

    // If redirected, validate the target before following
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location, url);
        } catch {
          return { title: '', description: '', image: '', favicon: '', siteName: '' };
        }
        if (isPrivateHost(redirectUrl.hostname)) {
          return { title: '', description: '', image: '', favicon: '', siteName: '' };
        }
        // Re-fetch the redirect target (one hop only)
        const redirectResponse = await fetch(redirectUrl.href, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LovcoreBot/1.0)',
            'Accept': 'text/html',
          },
        });
        clearTimeout(timeout);
        if (!redirectResponse.ok) {
          return { title: '', description: '', image: '', favicon: '', siteName: '' };
        }
        const ct = redirectResponse.headers.get('content-type') || '';
        if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
          return { title: '', description: '', image: '', favicon: '', siteName: '' };
        }
        const reader2 = redirectResponse.body?.getReader();
        if (!reader2) {
          return { title: '', description: '', image: '', favicon: '', siteName: '' };
        }
        const chunks2: Uint8Array[] = [];
        let total2 = 0;
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          chunks2.push(value);
          total2 += value.length;
          if (total2 >= MAX_SIZE) { reader2.cancel(); break; }
        }
        const html2 = new TextDecoder().decode(Buffer.concat(chunks2));
        const hostname2 = redirectUrl.hostname;
        return {
          title: extractTitle(html2),
          description: extractMeta(html2, 'og:description') || extractMeta(html2, 'description'),
          image: resolveUrl(extractMeta(html2, 'og:image'), redirectUrl.href),
          favicon: extractFavicon(html2, redirectUrl.href),
          siteName: extractMeta(html2, 'og:site_name') || hostname2.replace('www.', ''),
        };
      }
    }

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


export default withHandler(handleScrapeUrl, { timeoutMs: 15_000 });
