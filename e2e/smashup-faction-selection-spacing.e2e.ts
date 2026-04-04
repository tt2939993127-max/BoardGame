import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './framework';
import { setChineseLocale } from './helpers/common';

const MOBILE_VIEWPORT = { width: 800, height: 450 } as const;
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 } as const;

function createPlayerState(
  playerId: string,
  vp: number,
  factions: [string, string],
) {
  return {
    id: playerId,
    vp,
    hand: [],
    deck: [],
    discard: [],
    factions,
    minionsPlayed: 1,
    minionLimit: 1,
    actionsPlayed: 1,
    actionLimit: 1,
  };
}

function buildFactionSelectionScene() {
  return {
    gameId: 'smashup',
    currentPlayer: '0' as const,
    phase: 'factionSelect' as const,
    extra: {
      core: {
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        turnNumber: 1,
        nextUid: 1000,
        players: {
          '0': createPlayerState('0', 0, ['aliens', 'pirates']),
          '1': createPlayerState('1', 0, ['ninjas', 'dinosaurs']),
        },
        factionSelection: {
          takenFactions: [],
          playerSelections: {
            '0': [],
            '1': [],
          },
          completedPlayers: [],
        },
      },
    },
  };
}

async function waitForFactionSelectionReady(page: Page) {
  const title = page.locator('h1').filter({ hasText: /Draft Your Factions|选择你的派系/i });
  await expect(title).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => {
    const bodyText = document.body?.innerText ?? '';
    return !bodyText.includes('Loading match resources...')
      && !bodyText.includes('正在加载对局资源...');
  }, { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function readFactionSelectionMetrics(page: Page) {
  return page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid^="faction-option-"]'),
    ).slice(0, 6);
    const boxes = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    });
    const stage = document.querySelector<HTMLElement>('[data-testid="faction-selection-main-stage"]');
    const stageRect = stage?.getBoundingClientRect() ?? null;
    const rail = document.querySelector<HTMLElement>('[data-testid="faction-selection-player-rail"]');
    const railRect = rail?.getBoundingClientRect() ?? null;
    const playerCard = document.querySelector<HTMLElement>('[data-testid="faction-selection-player-card-0"]');
    const playerCardRect = playerCard?.getBoundingClientRect() ?? null;
    const firstTop = boxes[0]?.top ?? 0;

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      docScrollWidth: document.documentElement.scrollWidth,
      firstWidth: boxes[0]?.width ?? 0,
      firstWidthRatio: boxes[0] ? boxes[0].width / window.innerWidth : 0,
      row1Aligned: boxes.slice(1, 5).every((box) => Math.abs(box.top - firstTop) < 6),
      sixthWrapped: (boxes[5]?.top ?? 0) > firstTop + 6,
      stageRect: stageRect
        ? {
            left: stageRect.left,
            top: stageRect.top,
            right: stageRect.right,
            bottom: stageRect.bottom,
            width: stageRect.width,
            height: stageRect.height,
          }
        : null,
      railRect: railRect
        ? {
            left: railRect.left,
            top: railRect.top,
            right: railRect.right,
            bottom: railRect.bottom,
            width: railRect.width,
            height: railRect.height,
          }
        : null,
      playerCardWidth: playerCardRect?.width ?? 0,
      playerCardWidthRatio: playerCardRect ? playerCardRect.width / window.innerWidth : 0,
      playerCardBottom: playerCardRect?.bottom ?? 0,
    };
  });
}

test.describe('SmashUp 派系选择页移动端等比缩放', () => {
  test('手机横屏应保持与 PC 同构的五列选派布局，并输出移动端/桌面端对照截图', async ({ page, game }, testInfo) => {
    const evidenceDir = join(process.cwd(), 'test-results', 'evidence-screenshots', 'smashup-faction-selection-spacing');
    mkdirSync(evidenceDir, { recursive: true });

    await setChineseLocale(page.context());

    await page.setViewportSize(MOBILE_VIEWPORT);
    await game.openTestGame('smashup', { skipInitialization: true }, 20000);
    await game.setupScene(buildFactionSelectionScene());
    await waitForFactionSelectionReady(page);

    const mobileMetrics = await readFactionSelectionMetrics(page);
    expect(mobileMetrics.docScrollWidth, '移动端不应横向溢出').toBeLessThanOrEqual(mobileMetrics.innerWidth + 1);
    expect(mobileMetrics.firstWidth, '移动端派系卡应成功渲染').toBeGreaterThan(0);
    expect(mobileMetrics.row1Aligned, '移动端首行前五张卡应保持同一行').toBe(true);
    expect(mobileMetrics.sixthWrapped, '移动端第六张卡应落到下一行，保持与 PC 一致的五列布局').toBe(true);
    expect(mobileMetrics.stageRect, '移动端应启用主选派缩放舞台').not.toBeNull();
    expect(mobileMetrics.stageRect?.left ?? -1, '移动端缩放舞台左侧不应出屏').toBeGreaterThanOrEqual(-1);
    expect(mobileMetrics.stageRect?.right ?? 9999, '移动端缩放舞台右侧不应出屏').toBeLessThanOrEqual(mobileMetrics.innerWidth + 1);
    expect(mobileMetrics.railRect, '移动端玩家卡片栏应存在').not.toBeNull();
    expect(mobileMetrics.railRect?.bottom ?? 9999, '移动端玩家卡片栏底部不应被裁剪').toBeLessThanOrEqual(mobileMetrics.innerHeight + 1);
    expect(mobileMetrics.playerCardWidth, '移动端玩家卡片应成功渲染').toBeGreaterThan(0);
    expect(mobileMetrics.playerCardBottom, '移动端玩家卡片底部不应出屏').toBeLessThanOrEqual(mobileMetrics.innerHeight + 1);

    await page.screenshot({ path: join(evidenceDir, 'mobile-landscape-800x450.png'), fullPage: false });
    await page.screenshot({ path: testInfo.outputPath('mobile-landscape-800x450.png'), fullPage: false });

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await game.openTestGame('smashup', { skipInitialization: true }, 20000);
    await game.setupScene(buildFactionSelectionScene());
    await waitForFactionSelectionReady(page);

    const desktopMetrics = await readFactionSelectionMetrics(page);
    expect(desktopMetrics.docScrollWidth, 'PC 端不应横向溢出').toBeLessThanOrEqual(desktopMetrics.innerWidth + 1);
    expect(desktopMetrics.row1Aligned, 'PC 端首行前五张卡应保持同一行').toBe(true);
    expect(desktopMetrics.sixthWrapped, 'PC 端第六张卡应落到下一行').toBe(true);
    expect(desktopMetrics.stageRect, 'PC 端不应启用移动缩放舞台').toBeNull();

    const widthRatioDelta = Math.abs(mobileMetrics.firstWidthRatio - desktopMetrics.firstWidthRatio);
    expect(widthRatioDelta, '移动端派系卡宽度占比应接近 PC，同构缩放不应改成另一套手机稿').toBeLessThan(0.035);
    const playerCardRatioDelta = Math.abs(mobileMetrics.playerCardWidthRatio - desktopMetrics.playerCardWidthRatio);
    expect(playerCardRatioDelta, '移动端底部玩家卡片也必须跟随桌面构图等比缩小').toBeLessThan(0.03);

    await page.screenshot({ path: join(evidenceDir, 'desktop-reference-1920x1080.png'), fullPage: false });
    await page.screenshot({ path: testInfo.outputPath('desktop-reference-1920x1080.png'), fullPage: false });
  });
});
