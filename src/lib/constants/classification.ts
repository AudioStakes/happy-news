export const ALLOWED_TOPICS = [
  '動物',
  '地域社会',
  '科学技術',
  '医療',
  '教育',
  '子ども',
  'スポーツ',
  '自然',
  '環境',
  'アート',
  '文化',
  '食',
  '仕事',
  '人助け',
  '寄付',
  '研究',
  'その他'
] as const;

export const ALLOWED_EMOTIONS = [
  '癒し',
  '希望',
  '感動',
  '安心',
  '元気',
  'ほっこり',
  '驚き',
  '誇らしい',
  'やさしさ'
] as const;

export const ALLOWED_STORY_TYPES = [
  '救出',
  '達成',
  '受賞',
  '再会',
  '回復',
  '発見',
  '開発',
  '支援',
  '寄付',
  '地域貢献',
  '挑戦',
  '成長',
  '保護',
  '改善',
  'その他'
] as const;

export const ALLOWED_RISK_FLAGS = [
  '事件',
  '事故',
  '災害',
  '病気',
  '死亡',
  '戦争',
  '政治対立',
  '炎上',
  '犯罪',
  '差別',
  '重い話題',
  '広告色が強い'
] as const;

export const NEWS_STATUSES = ['unclassified', 'candidate', 'rejected', 'archived'] as const;

export const CLASSIFIED_BY_VALUES = ['chatgpt_manual', 'keyword_rule', 'admin'] as const;

export const IMPORT_BATCH_STATUSES = ['pending', 'validated', 'imported', 'failed'] as const;

export const USER_PREFERENCE_TARGET_TYPES = ['topic', 'emotion', 'story_type', 'risk_flag'] as const;

export type NewsStatus = (typeof NEWS_STATUSES)[number];
export type ClassifiedBy = (typeof CLASSIFIED_BY_VALUES)[number];
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];
export type UserPreferenceTargetType = (typeof USER_PREFERENCE_TARGET_TYPES)[number];
