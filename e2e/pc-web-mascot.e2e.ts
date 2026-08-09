import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from './framework';
import { setChineseLocale, waitForFrontendAssets } from './helpers/common';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from './framework/evidenceScreenshots';

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

async function ensureDirForScreenshot(path: string) {
    await mkdir(dirname(path), { recursive: true });
}

test('PC Web 首页右下角显示看板娘且游戏页不显示', async ({ page, context }, testInfo) => {
    await clearEvidenceScreenshotsForTest(testInfo);
    await setChineseLocale(context);
    await page.setViewportSize(DESKTOP_VIEWPORT);

    await page.goto('/?homeStyle=classic', { waitUntil: 'domcontentloaded' });
    await waitForFrontendAssets(page, 45000);

    const mascot = page.getByTestId('pc-web-mascot');
    await expect(mascot).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => mascot.locator('img').evaluate((img) => {
        const element = img as HTMLImageElement;
        return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
    }), {
        timeout: 15000,
        message: '看板娘图片未完成加载',
    }).toBe(true);

    const mascotBox = await mascot.boundingBox();
    expect(mascotBox).not.toBeNull();
    expect(mascotBox!.x).toBeGreaterThan(DESKTOP_VIEWPORT.width * 0.78);
    expect(mascotBox!.y + mascotBox!.height).toBeLessThanOrEqual(DESKTOP_VIEWPORT.height);
    expect(mascotBox!.width).toBeGreaterThan(120);
    expect(mascotBox!.height).toBeGreaterThan(240);

    const visiblePath = getEvidenceScreenshotPath(testInfo, 'desktop-visible');
    await ensureDirForScreenshot(visiblePath);
    await page.screenshot({ path: visiblePath, fullPage: false });

    await page.getByTestId('pc-web-mascot-button').click();
    await page.waitForTimeout(120);
    await expect(page.locator('.pc-web-mascot__scale')).toHaveCSS('animation-name', 'pc-web-mascot-scale');
    await expect(page.getByTestId('pc-web-mascot-tip')).toHaveText('欢迎进群交流：');
    await expect(page.getByTestId('pc-web-mascot-group-copy')).toHaveText('1081373485');

    await expect.poll(() => page.getByTestId('pc-web-mascot-tip').innerText(), {
        timeout: 6500,
        message: '看板娘第二条提示未轮播出来',
    }).toBe('遇到卡死时，悬浮球可以强制结束阶段。');
    const tipTwoPath = getEvidenceScreenshotPath(testInfo, 'desktop-tip-2');
    await ensureDirForScreenshot(tipTwoPath);
    await page.screenshot({ path: tipTwoPath, fullPage: false });

    await expect.poll(() => page.getByTestId('pc-web-mascot-tip').innerText(), {
        timeout: 6500,
        message: '看板娘第三条提示未轮播出来',
    }).toBe('点击对手分数/头像可以切换视角，可以看弃牌堆。');
    await expect(page.getByTestId('pc-web-mascot-group-copy')).toHaveCount(0);
    const tipThreePath = getEvidenceScreenshotPath(testInfo, 'desktop-tip-3');
    await ensureDirForScreenshot(tipThreePath);
    await page.screenshot({ path: tipThreePath, fullPage: false });

    await expect.poll(() => page.getByTestId('pc-web-mascot-tip').innerText(), {
        timeout: 6500,
        message: '看板娘提示未循环回到第一条',
    }).toBe('欢迎进群交流：');
    await expect(page.getByTestId('pc-web-mascot-group-copy')).toHaveText('1081373485');

    const clickedPath = getEvidenceScreenshotPath(testInfo, 'desktop-click-scale');
    await ensureDirForScreenshot(clickedPath);
    await page.screenshot({ path: clickedPath, fullPage: false });

    await page.goto('/play/tictactoe?skipInitialization=true', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('pc-web-mascot')).toHaveCount(0);

    const gamePath = getEvidenceScreenshotPath(testInfo, 'game-route-hidden');
    await ensureDirForScreenshot(gamePath);
    await page.screenshot({ path: gamePath, fullPage: false });
});
