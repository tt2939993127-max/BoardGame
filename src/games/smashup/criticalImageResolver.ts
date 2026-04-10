import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import { getSmashUpAtlasImagesByKind } from './domain/atlasCatalog';

const ALL_CARD_ATLAS = getSmashUpAtlasImagesByKind('card');
const ALL_BASE_ATLAS = getSmashUpAtlasImagesByKind('base');
type LightweightResolverState = {
    sys?: {
        phase?: string;
        tutorial?: {
            active?: boolean;
        };
    };
    core?: unknown;
};

export const smashUpCriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
    _locale?: string,
    playerID?: string | null,
): CriticalImageResolverResult => {
    const state = gameState as LightweightResolverState | undefined;
    const perspectiveKey = playerID ?? 'spectator';

    if (state?.sys?.tutorial?.active && state.sys.phase === 'factionSelect') {
        return {
            critical: [],
            warm: [],
            phaseKey: `tutorial-factionSelect:${perspectiveKey}`,
        };
    }

    return {
        critical: [...ALL_CARD_ATLAS, ...ALL_BASE_ATLAS],
        warm: [],
        phaseKey: state?.core
            ? `prefetch:${state.sys?.phase ?? 'unknown'}:${perspectiveKey}`
            : `init:${perspectiveKey}`,
    };
};

export default smashUpCriticalImageResolver;
