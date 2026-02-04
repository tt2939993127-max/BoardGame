export type PlayerRefMode = 'current' | 'next' | 'prev' | 'offset' | 'index' | 'id';

export interface ResolvePlayerContextOptions {
  items: Record<string, unknown>[];
  playerRef?: PlayerRefMode;
  offset?: number;
  index?: number;
  playerRefId?: string;
  currentPlayerId?: string;
  playerIds?: string[];
  idField?: string;
}

export interface ResolvedPlayerContext {
  playerIds: string[];
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  resolvedPlayerId: string | null;
  resolvedPlayerIndex: number;
  resolvedPlayer?: Record<string, unknown>;
}

function resolvePlayerIdFromItem(
  item: Record<string, unknown>,
  index: number,
  idField?: string
): string {
  const fromField = idField ? item[idField] : undefined;
  if (typeof fromField === 'string' || typeof fromField === 'number') {
    return String(fromField);
  }
  const fallback = item.playerId ?? item.id;
  if (typeof fallback === 'string' || typeof fallback === 'number') {
    return String(fallback);
  }
  return `player-${index}`;
}

function normalizeIndex(index: number, total: number): number {
  if (total <= 0) return -1;
  const mod = index % total;
  return mod < 0 ? mod + total : mod;
}

export function resolvePlayerContext({
  items,
  playerRef = 'current',
  offset = 0,
  index,
  playerRefId,
  currentPlayerId,
  playerIds,
  idField,
}: ResolvePlayerContextOptions): ResolvedPlayerContext {
  const normalizedPlayerIds = (playerIds ?? []).map(id => String(id)).filter(Boolean);
  const derivedPlayerIds = normalizedPlayerIds.length > 0
    ? normalizedPlayerIds
    : items.map((item, idx) => resolvePlayerIdFromItem(item, idx, idField));

  let resolvedCurrentPlayerId = currentPlayerId ? String(currentPlayerId) : null;
  let currentIndex = resolvedCurrentPlayerId ? derivedPlayerIds.indexOf(resolvedCurrentPlayerId) : -1;
  if (currentIndex < 0) {
    resolvedCurrentPlayerId = derivedPlayerIds[0] ?? null;
    currentIndex = resolvedCurrentPlayerId ? derivedPlayerIds.indexOf(resolvedCurrentPlayerId) : -1;
  }

  let resolvedPlayerId: string | null = null;
  let resolvedPlayerIndex = -1;

  if (playerRef === 'id') {
    resolvedPlayerId = playerRefId ? String(playerRefId) : null;
    resolvedPlayerIndex = resolvedPlayerId ? derivedPlayerIds.indexOf(resolvedPlayerId) : -1;
  } else if (derivedPlayerIds.length > 0) {
    let indexCandidate = currentIndex;
    if (playerRef === 'next') indexCandidate = currentIndex + 1;
    if (playerRef === 'prev') indexCandidate = currentIndex - 1;
    if (playerRef === 'offset') indexCandidate = currentIndex + offset;
    if (playerRef === 'index' && typeof index === 'number') indexCandidate = index;

    resolvedPlayerIndex = normalizeIndex(indexCandidate, derivedPlayerIds.length);
    resolvedPlayerId = resolvedPlayerIndex >= 0 ? derivedPlayerIds[resolvedPlayerIndex] : null;
  }

  const resolvedPlayer = resolvedPlayerId
    ? items.find((item, idx) => resolvePlayerIdFromItem(item, idx, idField) === resolvedPlayerId)
    : undefined;

  return {
    playerIds: derivedPlayerIds,
    currentPlayerId: resolvedCurrentPlayerId,
    currentPlayerIndex: currentIndex,
    resolvedPlayerId,
    resolvedPlayerIndex,
    resolvedPlayer,
  };
}
