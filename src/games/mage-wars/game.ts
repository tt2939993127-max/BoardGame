import { createBaseSystems, createFlowSystem, createGameEngine } from '../../engine';
import { registerCriticalImageResolver } from '../../core';
import { MageWarsDomain, MAGE_WARS_COMMANDS } from './domain';
import type { MageWarsCommand, MageWarsCore, MageWarsEvent } from './domain';
import { mageWarsFlowHooks } from './domain/flowHooks';
import { mageWarsCriticalImageResolver } from './criticalImageResolver';
import { MAGE_WARS_AUDIO_CONFIG } from './audio.config';
import { registerCardPreviewGetter } from '../../components/game/registry/cardPreviewRegistry';
import { getMageWarsCardPreviewRef } from './ui/cardAtlas';

const systems = [
    createFlowSystem<MageWarsCore>({ hooks: mageWarsFlowHooks }),
    ...createBaseSystems<MageWarsCore>({
        actionLog: {
            commandAllowlist: [],
            formatEntry: () => null,
        },
        undo: {
            snapshotCommandAllowlist: [],
        },
    }),
];

export const engineConfig = createGameEngine<MageWarsCore, MageWarsCommand, MageWarsEvent>({
    domain: MageWarsDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 2,
    commandTypes: Object.values(MAGE_WARS_COMMANDS),
});

registerCriticalImageResolver('mage-wars', mageWarsCriticalImageResolver);
registerCardPreviewGetter('mage-wars', getMageWarsCardPreviewRef, { maxDim: 220 });

export default engineConfig;
export { MAGE_WARS_AUDIO_CONFIG as audioConfig };
export type { MageWarsCore as MageWarsState } from './domain';
