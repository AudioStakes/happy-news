import { NEWS_STATUSES, type NewsStatus } from '$lib/constants/classification';

const NEWS_STATUS_SET = new Set<string>(NEWS_STATUSES);

export function isNewsStatus(value: string): value is NewsStatus {
  return NEWS_STATUS_SET.has(value);
}

export function parseNewsStatusFilter(rawStatus: string | null): {
  value: NewsStatus | null;
  error: string | null;
} {
  if (!rawStatus) {
    return { value: null, error: null };
  }

  const trimmed = rawStatus.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }

  if (isNewsStatus(trimmed)) {
    return { value: trimmed, error: null };
  }

  return {
    value: null,
    error: `Invalid status filter "${trimmed}". Showing all statuses instead.`
  };
}
