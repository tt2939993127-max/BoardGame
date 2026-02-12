/**
 * 大杀四方 - 能力注册入口
 *
 * 在游戏初始化时调�?initAllAbilities() 注册所有派系能力�?
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
import { registerWizardAbilities, registerWizardPromptContinuations } from './wizards';
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
import { registerKillerPlantAbilities, registerKillerPlantPromptContinuations } from './killer_plants';
import { registerInnsmouthAbilities, registerInnsmouthPromptContinuations } from './innsmouth';
import { registerMiskatonicAbilities } from './miskatonic';
import { registerMiskatonicPromptContinuations } from './miskatonic';
import { registerCthulhuAbilities } from './cthulhu';
import { registerCthulhuPromptContinuations } from './cthulhu';
import { registerElderThingAbilities } from './elder_things';
import { registerElderThingPromptContinuations } from './elder_things';
import { registerBaseAbilities, registerBasePromptContinuations } from '../domain/baseAbilities';
import { registerMultiBaseScoringContinuation } from '../domain/index';
import { registerAllOngoingModifiers } from './ongoing_modifiers';
import { clearPowerModifierRegistry } from '../domain/ongoingModifiers';
import { clearOngoingEffectRegistry } from '../domain/ongoingEffects';

let initialized = false;

/** 注册所有派系能力（幂等，多次调用安全） */
export function initAllAbilities(): void {
    if (initialized) return;
    initialized = true;

    // 基础�?8 派系
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
    registerWizardPromptContinuations();
    registerZombieAbilities();
    registerZombiePromptContinuations();
    registerTricksterAbilities();
    registerTricksterPromptContinuations();

    // 基地能力
    registerBaseAbilities();
    registerBasePromptContinuations();

    // 多基地计�?Prompt 继续函数
    registerMultiBaseScoringContinuation();

    // 扩展派系
    registerGhostAbilities();
    registerGhostPromptContinuations();
    registerBearCavalryAbilities();
    registerBearCavalryPromptContinuations();
    registerSteampunkAbilities();
    registerSteampunkPromptContinuations();
    registerKillerPlantAbilities();
    registerKillerPlantPromptContinuations();

    // 克苏鲁扩�?
    registerInnsmouthAbilities();
    registerInnsmouthPromptContinuations();
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
    clearOngoingEffectRegistry();
}
