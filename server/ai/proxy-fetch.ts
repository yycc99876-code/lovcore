/**
 * Proxy-aware fetch for backend AI handlers.
 *
 * Node.js built-in fetch doesn't read system proxy settings.
 * This module creates a ProxyAgent when HTTPS_PROXY/HTTP_PROXY is set.
 */

import { ProxyAgent } from 'undici';

let proxyAgent: ProxyAgent | null = null;

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
}

function getDispatcher(): ProxyAgent | undefined {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;

  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(proxyUrl);
  }

  return proxyAgent;
}

export function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const dispatcher = getDispatcher();
  if (!dispatcher) return fetch(url, init);
  return fetch(url, { ...init, dispatcher } as RequestInit & { dispatcher: unknown });
}
