import type { UGCGameState } from '../sdk/types';

export const BUILDER_PREVIEW_CONFIG_KEY = 'builderPreviewConfig';

export interface BuilderPreviewConfig {
  layout: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: Record<string, unknown>;
    renderComponentId?: string;
  }>;
  renderComponents: Array<{
    id: string;
    name: string;
    targetSchema: string;
    renderCode: string;
    backRenderCode?: string;
  }>;
  instances: Record<string, Record<string, unknown>[]>;
  layoutGroups?: Array<{ id: string; name: string; hidden: boolean }>;
  schemaDefaults?: Record<string, string>;
}

const buildStandardCardCatalog = () => {
  const suits = ['黑桃', '红心', '梅花', '方块'];
  const ranks = [
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: 'J', value: 11 },
    { label: 'Q', value: 12 },
    { label: 'K', value: 13 },
    { label: 'A', value: 14 },
    { label: '2', value: 15 },
  ];
  const catalog: Record<string, Record<string, unknown>> = {};
  let index = 1;
  suits.forEach(suit => {
    ranks.forEach(rank => {
      const id = `card-${index++}`;
      const name = `${suit}${rank.label}`;
      catalog[id] = {
        id,
        suit,
        rank: rank.label,
        rankValue: rank.value,
        display: name,
        name,
      };
    });
  });
  const smallJokerId = `card-${index++}`;
  catalog[smallJokerId] = {
    id: smallJokerId,
    suit: '王',
    rank: '小王',
    rankValue: 16,
    display: '小王',
    name: '小王',
  };
  const bigJokerId = `card-${index++}`;
  catalog[bigJokerId] = {
    id: bigJokerId,
    suit: '王',
    rank: '大王',
    rankValue: 17,
    display: '大王',
    name: '大王',
  };
  return catalog;
};

const deriveInstancesFromRuntime = (
  state: UGCGameState,
  config: BuilderPreviewConfig
): BuilderPreviewConfig['instances'] | null => {
  const publicZones = state.publicZones || {};
  const hands = publicZones.hands as Record<string, Array<Record<string, unknown>>> | undefined;
  const landlordCards = publicZones.landlordCards as Array<Record<string, unknown>> | undefined;
  const lastPlay = publicZones.lastPlay as { playerId?: string; cardIds?: Array<string | number> } | null | undefined;
  const playerOrder = (publicZones.playerOrder as Array<string | number> | undefined)?.map(id => String(id))
    || Object.keys(state.players || {});
  const playerMap = state.players || {};

  const cardSchemaIds = new Set<string>();
  const playerSchemaIds = new Set<string>();
  config.layout.forEach(comp => {
    const schemaId = (comp.data.bindSchema || comp.data.targetSchema) as string | undefined;
    if (!schemaId) return;
    if (comp.type === 'player-area') {
      playerSchemaIds.add(String(schemaId));
      return;
    }
    if (['hand-zone', 'play-zone', 'deck-zone', 'discard-zone'].includes(comp.type)) {
      cardSchemaIds.add(String(schemaId));
    }
  });

  if (cardSchemaIds.size === 0 && playerSchemaIds.size === 0) {
    return null;
  }

  const nextInstances: BuilderPreviewConfig['instances'] = {
    ...(config.instances || {}),
  };

  if (playerSchemaIds.size > 0) {
    const basePlayers = nextInstances[Array.from(playerSchemaIds)[0]] || [];
    const baseById = new Map(
      basePlayers
        .map(item => (item && typeof item === 'object' && 'id' in item ? [String((item as { id?: unknown }).id), item] : null))
        .filter((item): item is [string, Record<string, unknown>] => Boolean(item))
    );
    const resolvedPlayers = playerOrder.map((playerId, index) => {
      const base = baseById.get(playerId) || {};
      const playerState = playerMap[playerId] as { handCount?: number; public?: { role?: string } } | undefined;
      const role = playerState?.public?.role
        || (publicZones.landlordId === playerId ? '地主' : '农民');
      const cardCount = hands && hands[playerId]
        ? hands[playerId].length
        : (playerState?.handCount ?? (base.cardCount as number | undefined) ?? 0);
      const name = (base.name as string | undefined) || `玩家${index + 1}`;
      const seat = (base.seat as number | undefined) ?? index + 1;
      return {
        ...base,
        id: playerId,
        name,
        role,
        seat,
        cardCount,
      };
    });
    playerSchemaIds.forEach(schemaId => {
      nextInstances[schemaId] = resolvedPlayers;
    });
  }

  if (cardSchemaIds.size > 0) {
    const catalog = buildStandardCardCatalog();
    const cardItems: Record<string, unknown>[] = [];
    if (hands && typeof hands === 'object') {
      Object.entries(hands).forEach(([playerId, cards]) => {
        if (!Array.isArray(cards)) return;
        cards.forEach(card => {
          const cardId = String(card.id ?? '');
          const base = cardId ? catalog[cardId] || {} : {};
          const name = (card.name as string | undefined)
            || (base.name as string | undefined)
            || (card.display as string | undefined)
            || cardId;
          cardItems.push({
            ...base,
            ...card,
            id: cardId || card.id,
            name,
            ownerId: playerId,
            zone: 'hand',
          });
        });
      });
    }
    if (Array.isArray(landlordCards)) {
      const landlordId = String(publicZones.landlordId || 'landlord');
      landlordCards.forEach(card => {
        const cardId = String(card.id ?? '');
        const base = cardId ? catalog[cardId] || {} : {};
        const name = (card.name as string | undefined)
          || (base.name as string | undefined)
          || (card.display as string | undefined)
          || cardId;
        cardItems.push({
          ...base,
          ...card,
          id: cardId || card.id,
          name,
          ownerId: landlordId,
          zone: 'landlord',
        });
      });
    }
    if (lastPlay && Array.isArray(lastPlay.cardIds)) {
      const tableOwner = String(lastPlay.playerId || 'table');
      lastPlay.cardIds.forEach(rawId => {
        const cardId = String(rawId);
        const base = catalog[cardId] || {};
        cardItems.push({
          ...base,
          id: cardId,
          name: (base.name as string | undefined) || cardId,
          ownerId: tableOwner,
          zone: 'table',
        });
      });
    }
    cardSchemaIds.forEach(schemaId => {
      nextInstances[schemaId] = cardItems;
    });
  }

  return nextInstances;
};

export function attachBuilderPreviewConfig(
  state: UGCGameState,
  config: BuilderPreviewConfig
): UGCGameState {
  return {
    ...state,
    publicZones: {
      ...(state.publicZones || {}),
      [BUILDER_PREVIEW_CONFIG_KEY]: config,
    },
  };
}

export function extractBuilderPreviewConfig(
  state: UGCGameState | null
): BuilderPreviewConfig | null {
  if (!state) return null;
  const publicZones = state.publicZones || {};
  const config = publicZones[BUILDER_PREVIEW_CONFIG_KEY];
  if (!config || typeof config !== 'object') return null;
  const runtimeInstances = publicZones.instances;
  const derivedInstances = deriveInstancesFromRuntime(state, config as BuilderPreviewConfig);
  const resolvedInstances = runtimeInstances && typeof runtimeInstances === 'object'
    ? (runtimeInstances as BuilderPreviewConfig['instances'])
    : derivedInstances;
  if (resolvedInstances) {
    return {
      ...(config as BuilderPreviewConfig),
      instances: resolvedInstances,
    };
  }
  return config as BuilderPreviewConfig;
}
