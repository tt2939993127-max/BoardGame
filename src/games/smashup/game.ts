/**
 * 大杀四方 (Smash Up) - 游戏适配器组装
 */

import { createDefaultSystems, createGameAdapter, createFlowSystem } from '../../engine';
import { SmashUpDomain, SU_COMMANDS, type SmashUpCommand, type SmashUpCore, type SmashUpEvent } from './domain';
import { smashUpFlowHooks } from './domain/index';

const systems = [
    createFlowSystem<SmashUpCore>({ hooks: smashUpFlowHooks }),
    ...createDefaultSystems<SmashUpCore>(),
];

export const SmashUp = createGameAdapter<SmashUpCore, SmashUpCommand, SmashUpEvent>({
    domain: SmashUpDomain,
    systems,
    minPlayers: 2,
    maxPlayers: 4,
    commandTypes: Object.values(SU_COMMANDS),
});

export default SmashUp;
