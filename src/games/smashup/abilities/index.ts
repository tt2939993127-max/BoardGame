/**
 * 大杀四方 - 能力注册入口
 *
 * 在游戏初始化时调用 initAllAbilities() 注册所有派系能力。
 */

import { registerAlienAbilities } from './aliens';
import { registerAlienPromptContinuations } from './aliens';
import { registerPirateAbilities } from './pirates';
import { registerPiratePromptContinuations } from './pirates';
import { registerNinjaAbilities } from './ninjas';
import { registerNinjaPromptContinuations } from './ninjas';
import { registerDinosaurAbilities } from './dinosaurs';
import { registerDinosaurPromptContinuations } from './dinosaurs';
import { registerRobotAbilities } from './robots';
import { registerRobotPromptContinuations } from './robots';
import { registerWizardAbilities } from './wizards';
import { registerZombieAbilities } from './zombies';
import { registerZombiePromptContinuations } from './zombies';
import { registerTricksterAbilities } from './tricksters';
import { registerTricksterPromptContinuations } from './tricksters';
import { registerGhostAbilities } from './ghosts';
import { registerGhostPromptContinuations } from './ghosts';
import { registerBearCavalryAbilities } from './bear_cavalry';
import { registerBearCavalryPromptContinuations } from './bear_cavalry';
import { registerSteampunkAbilities } from './steampunks';
import { registerSteampunkPromptContinuations } from './steampunks';
import { registerKillerPlantAbilities } from './killer_plants';
import { registerInnsmouthAbilities } from './innsmouth';
import { registerMiskatonicAbilities } from './miskatonic';
import { registerMiskatonicPromptContinuations } from './miskatonic';
import { registerCthulhuAbilities } from './cthulhu';
import { registerCthulhuPromptContinuations } from './cthulhu';
import { registerElderThingAbilities } from './elder_things';
import { registerElderThingPromptContinuations } from './elder_things';
import { registerBaseAbilities } from '../domain/baseAbilities';
import { registerMultiBaseScoringContinuation } from '../domain/index';
import { registerAllOngoingModifiers } from './ongoing_modifiers';
import { clearPowerModifierRegistry } from '../domain/ongoingModifiers';

let initialized = false;

/** 注册所有派系能力（幂等，多次调用安全） */
export function initAllAbilities(): void {
    if (initialized) return;
    initialized = true;

    // 基础版 8 派系
    registerAlienAbilities();
    registerAlienPromptContinuations();
    registerPirateAbilities();
    registerPiratePromptContinuations();
    registerNinjaAbilities();
    registerNinjaPromptContinuations();
    registerDinosaurAbilities();
    registerDinosaurPromptContinuations();
    registerRobotAbilities();
    registerRobotPromptContinuations();
    registerWizardAbilities();
    registerZombieAbilities();
    registerZombiePromptContinuations();
    registerTricksterAbilities();
    registerTricksterPromptContinuations();

    // 基地能力
    registerBaseAbilities();

    // 多基地计分 Prompt 继续函数
    registerMultiBaseScoringContinuation();

    // 扩展派系
    registerGhostAbilities();
    registerGhostPromptContinuations();
    registerBearCavalryAbilities();
    registerBearCavalryPromptContinuations();
    registerSteampunkAbilities();
    registerSteampunkPromptContinuations();
    registerKillerPlantAbilities();

    // 克苏鲁扩展
    registerInnsmouthAbilities();
    registerMiskatonicAbilities();
    registerMiskatonicPromptContinuations();
    registerCthulhuAbilities();
    registerCthulhuPromptContinuations();
    registerElderThingAbilities();
    registerElderThingPromptContinuations();

    // 持续力量修正
    registerAllOngoingModifiers();
}

/** 重置初始化状态（测试用） */
export function resetAbilityInit(): void {
    initialized = false;
    clearPowerModifierRegistry();
}
