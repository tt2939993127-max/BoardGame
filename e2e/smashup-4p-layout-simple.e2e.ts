/**
 * 大杀四方四人局布局测试 - 简化版
 * 直接访问开发环境截图
 */

import { test } from './fixtures';

test.describe('大杀四方四人局布局', () => {
    test('四人局布局截图', async ({ page }) => {
        // 直接访问开发环境（假设已经有一个四人局在运行）
        // 如果没有，需要手动创建一个四人局
        await page.goto('http://localhost:3000/play/smashup/online');
        await page.waitForTimeout(3000);

        // 截图
        await page.screenshot({
            path: 'test-results/smashup-4p-layout-dev.png',
            fullPage: true,
        });

        console.log('✅ 截图已保存到 test-results/smashup-4p-layout-dev.png');
        console.log('提示：如果页面是空的，请先在开发环境创建一个四人局');
    });
});
