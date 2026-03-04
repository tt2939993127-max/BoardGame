/**
 * E2E 测试状态同步工具
 * 
 * 提供智能状态轮询，替代固定时间等待（waitForTimeout）
 */

import type { Page } from '@playwright/test';

export interface WaitForStateOptions {
  /** 超时时间（毫秒），默认 5000 */
  timeout?: number;
  /** 轮询间隔（毫秒），默认 100 */
  interval?: number;
  /** 错误消息前缀 */
  message?: string;
}

/**
 * 等待状态满足条件
 * 
 * @example
 * ```typescript
 * // 等待阶段变为 'attack'
 * await waitForState(page, async () => {
 *   const phase = await getCurrentPhase(page);
 *   return phase === 'attack';
 * }, { message: '等待进入攻击阶段' });
 * ```
 */
export async function waitForState(
  page: Page,
  condition: () => Promise<boolean>,
  options: WaitForStateOptions = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = '等待状态同步' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const satisfied = await condition();
      if (satisfied) {
        return;
      }
    } catch (error) {
      // 忽略检查过程中的错误，继续轮询
    }
    await page.waitForTimeout(interval);
  }

  throw new Error(`${message}超时（${timeout}ms）`);
}

/**
 * 等待核心状态字段满足条件
 * 
 * @example
 * ```typescript
 * // 等待当前玩家变为 '1'
 * await waitForCoreState(page, (core) => core.currentPlayer === '1');
 * ```
 */
export async function waitForCoreState<T = any>(
  page: Page,
  condition: (core: T) => boolean,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForState(
    page,
    async () => {
      const core = await page.evaluate(() => {
        return (window as any).__BG_STATE__?.core;
      });
      return core && condition(core);
    },
    options
  );
}

/**
 * 等待系统状态字段满足条件
 * 
 * @example
 * ```typescript
 * // 等待交互队列为空
 * await waitForSystemState(page, (sys) => sys.interaction.queue.length === 0);
 * ```
 */
export async function waitForSystemState<T = any>(
  page: Page,
  condition: (sys: T) => boolean,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForState(
    page,
    async () => {
      const sys = await page.evaluate(() => {
        return (window as any).__BG_STATE__?.sys;
      });
      return sys && condition(sys);
    },
    options
  );
}

/**
 * 等待阶段变化
 * 
 * @example
 * ```typescript
 * await waitForPhaseChange(page, 'attack');
 * ```
 */
export async function waitForPhaseChange(
  page: Page,
  expectedPhase: string,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForSystemState(
    page,
    (sys: any) => sys.phase === expectedPhase,
    { ...options, message: `等待阶段变为 ${expectedPhase}` }
  );
}

/**
 * 等待交互队列为空
 * 
 * @example
 * ```typescript
 * await waitForInteractionComplete(page);
 * ```
 */
export async function waitForInteractionComplete(
  page: Page,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForSystemState(
    page,
    (sys: any) => !sys.interaction?.active && sys.interaction?.queue?.length === 0,
    { ...options, message: '等待交互完成' }
  );
}

/**
 * 等待游戏结束
 * 
 * @example
 * ```typescript
 * await waitForGameOver(page);
 * ```
 */
export async function waitForGameOver(
  page: Page,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForSystemState(
    page,
    (sys: any) => sys.gameover !== null && sys.gameover !== undefined,
    { ...options, message: '等待游戏结束' }
  );
}

/**
 * 等待状态应用完成
 * 
 * 用于 applyCoreState 后等待状态同步
 * 
 * @example
 * ```typescript
 * await applyCoreState(page, newState);
 * await waitForStateApplied(page, (core) => core.currentPlayer === '1');
 * ```
 */
export async function waitForStateApplied<T = any>(
  page: Page,
  condition: (core: T) => boolean,
  options: WaitForStateOptions = {}
): Promise<void> {
  return waitForCoreState(
    page,
    condition,
    { ...options, message: '等待状态应用完成' }
  );
}
