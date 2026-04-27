const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'yclid',
  'mc_cid',
  'mc_eid'
]);

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';

    const keptParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        keptParams.append(key, value);
      }
    }

    url.search = keptParams.toString();

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}
