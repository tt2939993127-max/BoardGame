const CONFIG_REVIEW_GAME_IDS = new Set(['summonerwars', 'dicethrone', 'betrayal']);

export function hasGameConfigReview(gameId: string | null | undefined): boolean {
  return Boolean(gameId && CONFIG_REVIEW_GAME_IDS.has(gameId));
}

export function getGameConfigReviewPath(gameId: string): string {
  return `/games/${gameId}/config`;
}
