/**
 * 多客户端 E2E 测试辅助工具
 * 
 * 用于测试多人游戏场景，为每个玩家创建独立的浏览器上下文
 */

import type { Browser, BrowserContext, Page } from '@playwright/test';

export interface PlayerContext {
  context: BrowserContext;
  page: Page;
  playerId: string;
}

export interface MultiPlayerTestOptions {
  browser: Browser;
  baseURL?: string;
  gameId: string;
  matchId: string;
  /** 玩家数量 */
  numPlayers: number;
  /** 是否禁用音频 */
  disableAudio?: boolean;
  /** 是否禁用教程 */
  disableTutorial?: boolean;
}

/**
 * 多客户端测试管理器
 */
export class MultiPlayerTest {
  private players: Map<string, PlayerContext> = new Map();
  private options: MultiPlayerTestOptions;

  constructor(options: MultiPlayerTestOptions) {
    this.options = options;
  }

  /**
   * 初始化所有玩家客户端
   */
  async initialize(): Promise<void> {
    const { browser, baseURL, gameId, matchId, numPlayers, disableAudio, disableTutorial } = this.options;

    for (let i = 0; i < numPlayers; i++) {
      const playerId = String(i);
      const context = await browser.newContext({ baseURL });

      // 设置初始化脚本
      if (disableAudio) {
        await context.addInitScript(() => {
          localStorage.setItem('audio_muted', 'true');
          localStorage.setItem('audio_master_volume', '0');
          (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
        });
      }

      if (disableTutorial) {
        await context.addInitScript(() => {
          localStorage.setItem('tutorial_skip', '1');
        });
      }

      // 阻止音频请求
      await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());

      const page = await context.newPage();
      
      // 监听错误
      page.on('pageerror', (error) => {
        console.log(`[Player ${playerId} pageerror]`, error.message);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          console.log(`[Player ${playerId} console-error]`, message.text());
        }
      });

      // 导航到游戏页面
      await page.goto(`/play/${gameId}/match/${matchId}?playerID=${playerId}`, { 
        waitUntil: 'domcontentloaded' 
      });

      this.players.set(playerId, { context, page, playerId });
    }
  }

  /**
   * 获取指定玩家的 Page 对象
   */
  getPlayer(playerId: string): Page {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    return player.page;
  }

  /**
   * 获取所有玩家的 Page 对象
   */
  getAllPlayers(): Page[] {
    return Array.from(this.players.values()).map(p => p.page);
  }

  /**
   * 等待所有玩家的页面加载完成
   */
  async waitForAllPlayersReady(): Promise<void> {
    const promises = Array.from(this.players.values()).map(async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');
    });
    await Promise.all(promises);
  }

  /**
   * 清理所有客户端
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.players.values()).map(async ({ context }) => {
      await context.close();
    });
    await Promise.all(promises);
    this.players.clear();
  }

  /**
   * 获取玩家数量
   */
  get playerCount(): number {
    return this.players.size;
  }
}

/**
 * 创建多客户端测试实例
 */
export async function createMultiPlayerTest(
  options: MultiPlayerTestOptions
): Promise<MultiPlayerTest> {
  const test = new MultiPlayerTest(options);
  await test.initialize();
  return test;
}
