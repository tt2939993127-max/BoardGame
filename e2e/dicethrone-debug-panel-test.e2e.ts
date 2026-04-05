import { test, expect } from './framework';

type DebugTestHarness = {
    state?: {
        get?: () => {
            core?: {
                players?: Record<string, {
                    abilityLevels?: Record<string, number>;
                }>;
            };
        } | null;
        patch?: (patch: unknown) => void;
    };
};

test.describe('DiceThrone 调试面板', () => {
    test('状态页会反映注入后的生命值变更', async ({ page, game }) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 0, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'paladin' },
                hostStarted: true,
            },
        });

        await page.getByTestId('debug-toggle').click();
        await expect(page.getByTestId('debug-panel')).toBeVisible({ timeout: 5000 });

        const stateTab = page.getByTestId('debug-tab-state');
        if (await stateTab.isVisible().catch(() => false)) {
            await stateTab.click();
        }

        await page.waitForFunction(
            () => {
                const raw = document.querySelector('[data-testid="debug-state-json"]')?.textContent;
                if (!raw) return false;
                try {
                    const parsed = JSON.parse(raw);
                    const core = parsed?.core ?? parsed?.G?.core ?? parsed;
                    const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;
                    return hp === 50;
                } catch {
                    return false;
                }
            },
            { timeout: 5000, polling: 200 },
        );

        await page.evaluate(() => {
            (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
                core: {
                    players: {
                        '0': {
                            resources: { HP: 10 },
                        },
                    },
                },
            });
        });

        await page.waitForFunction(
            () => {
                const raw = document.querySelector('[data-testid="debug-state-json"]')?.textContent;
                if (!raw) return false;
                try {
                    const parsed = JSON.parse(raw);
                    const core = parsed?.core ?? parsed?.G?.core ?? parsed;
                    const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;
                    return hp === 10;
                } catch {
                    return false;
                }
            },
            { timeout: 5000, polling: 200 },
        );

        const rawState = await page.getByTestId('debug-state-json').innerText();
        const parsed = JSON.parse(rawState);
        const core = parsed?.core ?? parsed?.G?.core ?? parsed;
        const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;

        expect(hp).toBe(10);
    });

    test('布局编辑器里 v2 技能升级卡应铺满槽位', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'gunslinger', '1': 'barbarian' },
                hostStarted: true,
            },
        });

        await page.waitForSelector('[data-ability-slot="fist"]', { timeout: 10000 });
        await page.evaluate(() => {
            const harness = (window as Window & { __BG_TEST_HARNESS__?: DebugTestHarness }).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            if (!state) {
                throw new Error('State not available');
            }

            harness.state?.patch?.({
                core: {
                    players: {
                        '0': {
                            abilityLevels: {
                                ...(state.core?.players?.['0']?.abilityLevels ?? {}),
                                revolver: 2,
                            },
                        },
                    },
                },
            });
        });

        await expect(page.locator('[data-upgrade-preview-slot="fist"] > *')).toBeVisible({ timeout: 5000 });

        await page.getByTestId('debug-toggle').click();
        await expect(page.getByTestId('debug-panel')).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: /开启布局编辑|退出布局编辑/i }).click();

        const preview = page.locator('[data-upgrade-preview-slot="fist"]').first();
        await expect(preview).toBeVisible({ timeout: 5000 });

        const metrics = await preview.evaluate((el) => {
            const child = el.firstElementChild as HTMLElement | null;
            if (!child) return null;
            const containerRect = el.getBoundingClientRect();
            const childRect = child.getBoundingClientRect();
            return {
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                childWidth: childRect.width,
                childHeight: childRect.height,
            };
        });

        expect(metrics).not.toBeNull();
        expect(Math.abs((metrics?.childWidth ?? 0) - (metrics?.containerWidth ?? 0))).toBeLessThan(1);
        expect(Math.abs((metrics?.childHeight ?? 0) - (metrics?.containerHeight ?? 0))).toBeLessThan(1);

        await page.getByTestId('debug-toggle').click();
        await game.screenshot('dicethrone-v2-layout-editor-upgrade-card-fill', testInfo);
    });
});
