import type { ParsedRssItem } from './types';

const XML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' '
};

const URL_PATTERN = /^https?:\/\//i;

function decodeEntities(value: string): string {
  return value
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/gi, (entity) => {
      const lower = entity.toLowerCase();
      return XML_ENTITY_MAP[lower] ?? entity;
    })
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function cleanText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const withoutCdata = value.replace(/<!\[CDATA\[([\s\S]*?)]]>/gi, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]*>/g, ' ');
  const decoded = decodeEntities(withoutTags);
  const collapsed = decoded.replace(/\s+/g, ' ').trim();

  return collapsed || null;
}

function getTagValue(xml: string, tagName: string): string | null {
  const escaped = tagName.replace(':', '\\:');
  const match = xml.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  if (match) {
    return match[1].trim();
  }

  const selfClosingMatch = xml.match(new RegExp(`<${escaped}\\b[^>]*/>`, 'i'));
  return selfClosingMatch ? '' : null;
}

function getFirstRssLink(itemXml: string): string | null {
  const blockMatch = itemXml.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  if (blockMatch) {
    const candidate = cleanText(blockMatch[1]);
    return candidate && URL_PATTERN.test(candidate) ? candidate : null;
  }

  return null;
}

function getAtomLink(entryXml: string): string | null {
  const links = entryXml.match(/<link\b[^>]*>/gi) ?? [];

  for (const link of links) {
    const hrefMatch = link.match(/\shref=["']([^"']+)["']/i);
    if (!hrefMatch) {
      continue;
    }

    const relMatch = link.match(/\srel=["']([^"']+)["']/i);
    const rel = relMatch ? relMatch[1].toLowerCase() : 'alternate';
    const href = decodeEntities(hrefMatch[1]).trim();

    if (rel === 'alternate' && URL_PATTERN.test(href)) {
      return href;
    }
  }

  for (const link of links) {
    const hrefMatch = link.match(/\shref=["']([^"']+)["']/i);
    if (!hrefMatch) {
      continue;
    }

    const href = decodeEntities(hrefMatch[1]).trim();
    if (URL_PATTERN.test(href)) {
      return href;
    }
  }

  return null;
}

function parseRssItems(xml: string): ParsedRssItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks
    .map((itemXml): ParsedRssItem | null => {
      const title = cleanText(getTagValue(itemXml, 'title'));
      const link = getFirstRssLink(itemXml);
      const guid = cleanText(getTagValue(itemXml, 'guid'));
      const url = link ?? (guid && URL_PATTERN.test(guid) ? guid : null);
      const description =
        cleanText(getTagValue(itemXml, 'description')) ?? cleanText(getTagValue(itemXml, 'content:encoded'));
      const publishedAt = cleanText(getTagValue(itemXml, 'pubDate'));

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        publishedAt,
        description
      };
    })
    .filter((item): item is ParsedRssItem => item !== null);
}

function parseAtomEntries(xml: string): ParsedRssItem[] {
  const entryBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

  return entryBlocks
    .map((entryXml): ParsedRssItem | null => {
      const title = cleanText(getTagValue(entryXml, 'title'));
      const url = getAtomLink(entryXml);
      const publishedAt = cleanText(getTagValue(entryXml, 'published')) ?? cleanText(getTagValue(entryXml, 'updated'));
      const description = cleanText(getTagValue(entryXml, 'summary')) ?? cleanText(getTagValue(entryXml, 'content'));

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        publishedAt,
        description
      };
    })
    .filter((item): item is ParsedRssItem => item !== null);
}

export function parseRssXml(xml: string): ParsedRssItem[] {
  const trimmed = xml.trim();

  if (/<rss\b/i.test(trimmed) || /<channel\b/i.test(trimmed)) {
    return parseRssItems(trimmed);
  }

  if (/<feed\b/i.test(trimmed)) {
    return parseAtomEntries(trimmed);
  }

  return [...parseRssItems(trimmed), ...parseAtomEntries(trimmed)];
}
