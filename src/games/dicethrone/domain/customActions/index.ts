import { registerMonkCustomActions } from './monk';
import { registerBarbarianCustomActions } from './barbarian';
import { registerPyromancerCustomActions } from './pyromancer';
import { registerMoonElfCustomActions } from './moon_elf';
import { registerCommonCustomActions } from './common';
import { registerShadowThiefCustomActions } from './shadow_thief';

let initialized = false;

/**
 * 初始化所有 Custom Action 处理器
 * 确保只调用一次
 */
export function initializeCustomActions(): void {
    if (initialized) {
        return;
    }

    // 注册通用处理器（骰子修改、状态操作等）
    registerCommonCustomActions();

    // 注册僧侣处理器
    registerMonkCustomActions();

    // 注册野蛮人处理器
    registerBarbarianCustomActions();

    // 注册烈火术士处理器
    registerPyromancerCustomActions();


    // 注册月精灵处理器
    registerMoonElfCustomActions();

    // 注册影子盗贼处理器
    registerShadowThiefCustomActions();

    initialized = true;
}

// 导出各英雄的注册函数，供需要单独注册时使用
export { registerMonkCustomActions } from './monk';
export { registerBarbarianCustomActions } from './barbarian';
export { registerPyromancerCustomActions } from './pyromancer';
export { registerMoonElfCustomActions } from './moon_elf';
export { registerShadowThiefCustomActions } from './shadow_thief';
export { registerCommonCustomActions } from './common';


