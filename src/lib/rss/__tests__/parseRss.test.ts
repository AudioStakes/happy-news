import { describe, expect, it } from 'vitest';

import { parseRssXml } from '../parseRss';

describe('parseRssXml', () => {
  it('parses RSS 2.0 items with link fallback and sanitized descriptions', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <item>
            <title><![CDATA[Good &amp; Happy News]]></title>
            <link>https://example.com/article/1?utm_source=rss</link>
            <pubDate>Mon, 22 Apr 2026 10:00:00 GMT</pubDate>
            <description><![CDATA[<p>Story <strong>details</strong> &amp; updates</p>]]></description>
          </item>
          <item>
            <title>Guid fallback</title>
            <guid>https://example.com/article/2</guid>
            <content:encoded><![CDATA[<div>Only content encoded</div>]]></content:encoded>
          </item>
          <item>
            <title>Missing URL should be skipped</title>
          </item>
        </channel>
      </rss>`;

    const items = parseRssXml(xml);

    expect(items).toEqual([
      {
        title: 'Good & Happy News',
        url: 'https://example.com/article/1?utm_source=rss',
        publishedAt: 'Mon, 22 Apr 2026 10:00:00 GMT',
        description: 'Story details & updates'
      },
      {
        title: 'Guid fallback',
        url: 'https://example.com/article/2',
        publishedAt: null,
        description: 'Only content encoded'
      }
    ]);
  });

  it('parses Atom entries and skips invalid entries', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Atom entry one</title>
          <link rel="alternate" href="https://atom.example.com/post/1" />
          <published>2026-04-20T11:00:00Z</published>
          <summary><![CDATA[<p>Short <em>summary</em></p>]]></summary>
        </entry>
        <entry>
          <title>Atom entry two</title>
          <link href="https://atom.example.com/post/2" />
          <updated>2026-04-21T12:00:00Z</updated>
          <content>Body &amp; details</content>
        </entry>
        <entry>
          <title>Missing href</title>
          <link rel="alternate" />
        </entry>
      </feed>`;

    const items = parseRssXml(xml);

    expect(items).toEqual([
      {
        title: 'Atom entry one',
        url: 'https://atom.example.com/post/1',
        publishedAt: '2026-04-20T11:00:00Z',
        description: 'Short summary'
      },
      {
        title: 'Atom entry two',
        url: 'https://atom.example.com/post/2',
        publishedAt: '2026-04-21T12:00:00Z',
        description: 'Body & details'
      }
    ]);
  });
});
