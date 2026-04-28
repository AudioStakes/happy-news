export const REACTION_TAGS = [
  '癒された',
  '希望を感じた',
  '感動した',
  '元気が出た',
  'ほっこりした',
  '安心した',
  '世界も悪くないと思えた',
  'あまり響かなかった',
  '興味がなかった',
  '重かった'
] as const;

export type ReactionTag = (typeof REACTION_TAGS)[number];
