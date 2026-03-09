export function isLikelyNetworkError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';

  const lower = message.toLowerCase();
  return (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('offline') ||
    lower.includes('timeout') ||
    message.includes('离线') ||
    message.includes('联网')
  );
}

export function getCommunicationOfflineMessage(action: string): string {
  return `当前离线，仅可查看历史内容，${action}需联网`;
}
