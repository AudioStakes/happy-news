import {
  ALLOWED_EMOTIONS,
  ALLOWED_RISK_FLAGS,
  ALLOWED_STORY_TYPES,
  ALLOWED_TOPICS
} from '$lib/constants/classification';

export const MAX_CLASSIFICATION_SELECTION = 30;

export type ClassificationPromptNewsItem = {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  description: string | null;
  language: string;
  country: string;
};

export function buildClassificationPrompt(items: ClassificationPromptNewsItem[]): string {
  if (items.length === 0) {
    throw new Error('At least one news item is required to build a classification prompt.');
  }

  if (items.length > MAX_CLASSIFICATION_SELECTION) {
    throw new Error(`You can classify up to ${MAX_CLASSIFICATION_SELECTION} items at once.`);
  }

  const serializedItems = JSON.stringify(
    items.map((item) => ({
      news_id: item.id,
      title: item.title,
      source_name: item.sourceName,
      published_at: item.publishedAt,
      rss_description: item.description,
      url: item.url,
      language: item.language,
      country: item.country
    })),
    null,
    2
  );

  return `あなたは「Happy News」推薦アプリ向けのニュース分類担当です。

目的:
- 提供されたRSSメタデータのみを分類し、後続のハッピーニュース推薦に使えるJSONを作成してください。

厳守ルール:
- 入力として渡されたメタデータのみを使用すること。
- URL先の記事ページを取得・閲覧しないこと。
- 記事本文の推測や要約をしないこと。
- RSS description は補助的なメタデータであり、不完全な可能性があることを前提に扱うこと。
- 不確実な場合は保守的に判定すること。
- SQLは絶対に出力しないこと。
- 出力はJSONのみ。説明文、Markdown、コードフェンス、注釈は一切出力しないこと。

分類フィールド:
- news_id
- is_happy_candidate
- happy_score
- topics
- emotions
- story_types
- risk_flags
- negative_context_level
- commercial_pr_level

許可された値:
- topics: ${JSON.stringify(ALLOWED_TOPICS)}
- emotions: ${JSON.stringify(ALLOWED_EMOTIONS)}
- story_types: ${JSON.stringify(ALLOWED_STORY_TYPES)}
- risk_flags: ${JSON.stringify(ALLOWED_RISK_FLAGS)}

値の制約:
- happy_score: 0〜100 の整数
- negative_context_level: 0〜5 の整数
- commercial_pr_level: 0〜5 の整数

出力JSONスキーマ:
{
  "results": [
    {
      "news_id": 123,
      "is_happy_candidate": true,
      "happy_score": 85,
      "topics": ["動物", "地域社会"],
      "emotions": ["癒し", "ほっこり"],
      "story_types": ["救出", "再会"],
      "risk_flags": [],
      "negative_context_level": 1,
      "commercial_pr_level": 0
    }
  ]
}

分類対象ニュースメタデータ(JSON):
${serializedItems}`;
}
