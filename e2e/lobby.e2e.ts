import type { Page } from '@playwright/test';
import { test, expect } from './framework';
import { getGameServerBaseURL, setChineseLocale } from './helpers/common';

function isRetryableNavigationError(error: unknown): boolean {
    return error instanceof Error
        && (
            error.message.includes('ERR_ABORTED')
            || error.message.includes('frame was detached')
            || error.message.includes('ERR_CONNECTION_REFUSED')
        );
}

async function gotoLobbyWithRetry(page: Page): Promise<void> {
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await page.goto('/', { waitUntil: 'commit', timeout: 10000 });
            return;
        } catch (error) {
            if (!isRetryableNavigationError(error) || attempt === maxAttempts) {
                throw error;
            }

            await page.waitForTimeout(2000);
        }
    }
}

async function ensureLobbyReady(page: Page): Promise<void> {
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        await gotoLobbyWithRetry(page);

        try {
            await expect(page.getByRole('heading', { name: '井字棋' })).toBeVisible({ timeout: 10000 });
            return;
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }
            await page.waitForTimeout(1500);
        }
    }
}

const MOBILE_AUTHOR_ENTRY_TEST_NAME = '移动端游戏详情隐藏描述和推荐人数，作者入口位于右上角且无包围框';
const MOBILE_PACKAGE_ENTRY_TEST_NAME = '移动端 package-managed 游戏详情在左下角显示包管理入口';

test.describe('Lobby E2E', () => {
    test.describe.configure({ timeout: 90000 });

    test.beforeEach(async ({ page }, testInfo) => {
        await setChineseLocale(page);
        if (testInfo.title === MOBILE_AUTHOR_ENTRY_TEST_NAME || testInfo.title === MOBILE_PACKAGE_ENTRY_TEST_NAME) {
            return;
        }
        await ensureLobbyReady(page);
    });

    test('分类筛选会显示对应的中文游戏列表', async ({ page }) => {
        await page.getByRole('button', { name: '工具' }).click();
        await expect(page.getByRole('heading', { name: '素材切片机' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '王权骰铸' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: '井字棋' })).toHaveCount(0);

        await page.getByRole('button', { name: '全部游戏' }).click();
        await expect(page.getByRole('heading', { name: '王权骰铸' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '井字棋' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '素材切片机' })).toHaveCount(0);
    });

    test('游戏详情弹窗会显示当前中文动作入口', async ({ page }) => {
        await page.getByRole('heading', { name: '井字棋' }).click();
        await expect(page).toHaveURL(/game=tictactoe/);

        await expect(page.getByRole('button', { name: '创建房间' })).toBeVisible();
        await expect(page.getByRole('button', { name: '单机模式' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '对战AI' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '本地对战设置' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '教程模式' })).toBeVisible();

        await page.getByRole('button', { name: '排行榜' }).click();
        await expect(page.getByRole('heading', { name: '胜场排行', level: 4 })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('加载中...')).toHaveCount(0, { timeout: 10000 });
    });

    test('AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片', async ({ page, game }, testInfo) => {
        await page.evaluate(() => {
            localStorage.removeItem('ai-repo-workbench:mvp-journal');
        });

        await page.getByRole('button', { name: '工具' }).click();
        const toolCard = page.getByRole('heading', { name: 'AI 仓库工作台' });
        await expect(toolCard).toBeVisible();

        await toolCard.click();
        await expect(page).toHaveURL(/\/dev\/ai-repo-workbench/);
        await expect(page.getByTestId('workbench-page-heading')).toHaveText('AI 仓库工作台');
        await expect(page.getByTestId('workbench-journal-mode')).toContainText('server-file + git worktree');
        await expect(page.getByTestId('start-new-faction-run')).toBeEnabled();
        await page.getByTestId('reset-workbench-journal').click();
        await expect(page.getByTestId('start-new-faction-run')).toBeEnabled();
        await expect(page.getByTestId('repo-session-card')).toBeVisible();
        await expect(page.getByTestId('managed-worktree-list')).toBeVisible();
        await expect(page.getByTestId('template-new-faction-card')).toContainText('new-faction');
        await expect(page.getByTestId('toggle-button-run-e2e-validation')).toContainText('已关闭');

        await page.getByTestId('managed-worktree-branch-input').fill('feat/managed-worktree-e2e');
        await page.getByTestId('managed-worktree-path-input').fill('D:\\gongzuo\\webgame\\BoardGame-wt-managed-worktree-e2e');
        await page.getByTestId('register-managed-worktree').click();
        await expect(page.getByTestId('managed-worktree-list')).toContainText('feat/managed-worktree-e2e');
        await expect(page.getByTestId('managed-worktree-list')).toContainText('已聚焦');

        await page.getByTestId('start-new-faction-run').click();
        await expect(page.getByTestId('decision-request-panel')).toBeVisible();
        await expect(page.getByTestId('flowise-shell-panel')).toBeVisible();
        await expect(page.getByTestId('node-status-panel')).toBeVisible();
        await expect(page.getByTestId('node-status-select-rule-source')).toContainText('等待决策');

        await game.screenshot('ai-repo-workbench-node-graph-waiting-decision', testInfo);

        await page.getByTestId('decision-option-wiki').click();
        await page.getByTestId('submit-rule-source-decision').click();

        await expect(page.getByTestId('node-status-publish-artifact-bundle')).toContainText('已完成', { timeout: 10000 });
        await expect(page.getByTestId('node-status-run-e2e-validation')).toContainText('已跳过');
        await expect(page.getByTestId('artifact-bundle-panel')).toContainText('ArtifactBundle');
        await expect(page.getByTestId('artifact-bundle-panel')).toContainText('skipped');
        await expect(page.getByText('规则来源索引')).toBeVisible();
        await expect(page.getByText('派系定义快照')).toBeVisible();

        await game.screenshot('ai-repo-workbench-node-graph-complete', testInfo);
    });

    test('创建房间时会显示进入对局 loading', async ({ page, game }, testInfo) => {
        let delayedOnce = false;
        await page.route('**/games/tictactoe/create', async (route) => {
            if (!delayedOnce) {
                delayedOnce = true;
                await page.waitForTimeout(1200);
            }
            await route.continue();
        });

        await page.getByRole('heading', { name: '井字棋' }).click();
        await expect(page).toHaveURL(/game=tictactoe/);
        await page.getByRole('button', { name: '创建房间' }).click();
        await expect(page.getByRole('heading', { name: '创建房间' })).toBeVisible();

        await page.getByRole('button', { name: '确认创建' }).click();

        await expect(page.getByText('创建中')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('正在创建房间并进入对局...')).toBeVisible();

        await game.screenshot('lobby-tictactoe-create-room-loading', testInfo);

        await expect(page).toHaveURL(/\/play\/tictactoe\/match\//, { timeout: 15000 });
    });

    test('大杀四方创建房间弹窗可直接配置 AI 人数和模组，并为游客保存偏好', async ({ page, game }, testInfo) => {
        await page.evaluate(() => {
            localStorage.removeItem('local_ai_match_preferences:smashup');
            Object.keys(localStorage)
                .filter((key) => key.startsWith('match_ai_creds_'))
                .forEach((key) => localStorage.removeItem(key));
        });

        await page.getByRole('heading', { name: '大杀四方' }).click();
        await expect(page).toHaveURL(/game=smashup/);
        await page.getByRole('button', { name: '创建房间' }).click();

        await expect(page.getByRole('heading', { name: '创建房间' })).toBeVisible();
        await page.getByRole('button', { name: '3人' }).click();
        await page.getByTestId('setup-option-toggle-expansions-titans').click();
        await page.getByRole('button', { name: /加入 AI/ }).click();
        await expect(page.getByRole('button', { name: /加入 AI/ })).toContainText('已开启');
        await expect(page.getByRole('button', { name: '1 号位（房主）' })).toBeDisabled();
        await page.getByRole('button', { name: '3 号位' }).click();

        await game.screenshot('lobby-smashup-create-room-ai-config-modal', testInfo);

        await page.getByRole('button', { name: '确认创建' }).click();

        await expect(page).toHaveURL(/\/play\/smashup\/match\//);
        await expect(page.getByRole('heading', { name: '选择你的派系' })).toBeVisible({ timeout: 15000 });

        const matchId = page.url().match(/\/play\/smashup\/match\/([^?]+)/)?.[1];
        expect(matchId).toBeTruthy();
        if (!matchId) {
            throw new Error('未能从 URL 提取 matchId');
        }

        const response = await page.request.get(`${getGameServerBaseURL()}/games/smashup/${matchId}`);
        expect(response.ok()).toBeTruthy();
        const payload = await response.json() as {
            setupData?: {
                enableAi?: boolean;
                setupSelections?: { expansions?: string[] };
                seatControllers?: Record<string, { type?: string }>;
            };
        };

        expect(payload.setupData?.enableAi).toBe(true);
        expect(payload.setupData?.setupSelections?.expansions ?? []).toEqual([]);
        expect(payload.setupData?.seatControllers?.['1']?.type).toBe('local-ai');
        expect(payload.setupData?.seatControllers?.['2']?.type).toBe('local-ai');

        const storedPreferences = await page.evaluate(() => {
            const raw = localStorage.getItem('local_ai_match_preferences:smashup');
            return raw ? JSON.parse(raw) : null;
        });
        expect(storedPreferences).not.toBeNull();
        expect(storedPreferences?.numPlayers).toBe(3);
        expect(storedPreferences?.setupSelections?.expansions ?? []).toEqual([]);
        expect(storedPreferences?.seatControllers?.['1']?.type).toBe('local-ai');
        expect(storedPreferences?.seatControllers?.['2']?.type).toBe('local-ai');

        const aiSeatCredentials = await page.evaluate(() => {
            const key = Object.keys(localStorage).find((item) => item.startsWith('match_ai_creds_'));
            if (!key) return null;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        });
        expect(aiSeatCredentials?.['1']).toBeTruthy();
        expect(aiSeatCredentials?.['2']).toBeTruthy();

        await game.screenshot('lobby-smashup-create-room-ai-config-result', testInfo);
    });

    test(MOBILE_AUTHOR_ENTRY_TEST_NAME, async ({ page, game }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?game=tictactoe', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/game=tictactoe/);

        const sidebar = page.getByTestId('game-details-sidebar');
        const mobileAuthorButton = page.getByTestId('game-details-author-button-mobile');

        await expect(sidebar).toBeVisible({ timeout: 15000 });
        await expect(mobileAuthorButton).toBeVisible();
        await expect(page.getByTestId('game-details-description')).toBeHidden();
        await expect(page.getByTestId('game-details-player-recommendation')).toBeHidden();

        const sidebarBox = await sidebar.boundingBox();
        const buttonBox = await mobileAuthorButton.boundingBox();
        expect(sidebarBox).not.toBeNull();
        expect(buttonBox).not.toBeNull();

        if (!sidebarBox || !buttonBox) {
            throw new Error('移动端作者入口或详情侧栏未正确渲染，无法校验位置');
        }

        const topOffset = buttonBox.y - sidebarBox.y;
        const rightOffset = sidebarBox.x + sidebarBox.width - (buttonBox.x + buttonBox.width);
        const buttonCenterX = buttonBox.x + buttonBox.width / 2;
        const sidebarCenterX = sidebarBox.x + sidebarBox.width / 2;

        expect(topOffset).toBeGreaterThanOrEqual(0);
        expect(topOffset).toBeLessThan(24);
        expect(rightOffset).toBeGreaterThanOrEqual(0);
        expect(rightOffset).toBeLessThan(24);
        expect(buttonCenterX).toBeGreaterThan(sidebarCenterX);

        const mobileAuthorButtonStyles = await mobileAuthorButton.evaluate((element) => {
            const styles = window.getComputedStyle(element);
            return {
                backgroundColor: styles.backgroundColor,
                borderTopWidth: styles.borderTopWidth,
                borderTopStyle: styles.borderTopStyle,
                boxShadow: styles.boxShadow,
            };
        });
        const normalizedBoxShadow = mobileAuthorButtonStyles.boxShadow.replace(/\s+/g, ' ').trim();

        expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(mobileAuthorButtonStyles.backgroundColor);
        expect(mobileAuthorButtonStyles.borderTopWidth).toBe('0px');
        expect(mobileAuthorButtonStyles.borderTopStyle).toBe('none');
        expect(
            normalizedBoxShadow === 'none'
            || /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)*$/.test(normalizedBoxShadow)
        ).toBeTruthy();

        await game.screenshot('lobby-mobile-author-entry-right-top', testInfo);

        await mobileAuthorButton.click();
        await expect(page.getByTestId('game-details-author-modal')).toBeVisible();

        await game.screenshot('lobby-mobile-author-modal-open', testInfo);
    });

    test(MOBILE_PACKAGE_ENTRY_TEST_NAME, async ({ page, game }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await ensureLobbyReady(page);
        await page.getByRole('heading', { name: /Tic-Tac-Toe/i }).click();
        await expect(page).toHaveURL(/game=tictactoe/);

        const modalRoot = page.getByTestId('game-details-modal-root');
        const packageCard = page.getByTestId('game-details-mobile-package-card');
        const installButton = page.getByRole('button', { name: /Install Pack/i });

        await expect(modalRoot).toBeVisible({ timeout: 15000 });
        await expect(packageCard).toBeVisible();
        await expect(page.getByText(/Not installed/i)).toBeVisible();
        await expect(installButton).toBeVisible();

        const modalBox = await modalRoot.boundingBox();
        const cardBox = await packageCard.boundingBox();
        expect(modalBox).not.toBeNull();
        expect(cardBox).not.toBeNull();

        if (!modalBox || !cardBox) {
            throw new Error('移动端详情弹窗或包管理入口未正确渲染，无法校验左下角位置');
        }

        const leftOffset = cardBox.x - modalBox.x;
        const bottomOffset = modalBox.y + modalBox.height - (cardBox.y + cardBox.height);

        expect(leftOffset).toBeGreaterThanOrEqual(0);
        expect(leftOffset).toBeLessThan(36);
        expect(bottomOffset).toBeGreaterThanOrEqual(0);
        expect(bottomOffset).toBeLessThan(36);

        await game.screenshot('lobby-mobile-package-entry-left-bottom', testInfo);

        await installButton.click();
        await expect(page.getByText(/Download Tic-Tac-Toe packages/i)).toBeVisible();
        await expect(page.getByText(/Estimated Download/i)).toBeVisible();
        await expect(page.getByText('Code Pack', { exact: true })).toBeVisible();
        await expect(page.getByText('Asset Pack', { exact: true })).toBeVisible();

        await game.screenshot('lobby-mobile-package-entry-confirm-modal', testInfo);

        await page.getByRole('button', { name: /Confirm Download/i }).click();
        await expect(page.getByTestId('game-details-mobile-package-progress-track')).toBeVisible();
        await expect(page.getByText(/Reading Manifest/i)).toBeVisible();

        await game.screenshot('lobby-mobile-package-entry-progress-card', testInfo);

        await expect(page.getByText(/The real downloader is not wired in yet/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
        await expect(page.getByTestId('game-details-mobile-package-card')).toHaveAttribute('data-status', 'failed');

        await game.screenshot('lobby-mobile-package-entry-failed-retry', testInfo);
    });

    test('Dice Throne 更新日志 tab 会请求公开接口并结束 loading', async ({ page }) => {
        await page.getByRole('heading', { name: /Dice Throne/i }).click();
        await expect(page).toHaveURL(/game=dicethrone/);

        const changelogResponsePromise = page.waitForResponse((response) => {
            return response.url().includes('/game-changelogs/dicethrone') && response.request().method() === 'GET';
        });

        await page.getByRole('button', { name: /Updates/i }).click();

        const changelogResponse = await changelogResponsePromise;
        expect(changelogResponse.status()).toBe(200);

        const payload = await changelogResponse.json();
        expect(Array.isArray(payload.changelogs)).toBeTruthy();

        await expect(page.getByText(/Loading changelog/i)).toHaveCount(0, { timeout: 10000 });

        if (payload.changelogs.length > 0) {
            await expect(page.getByText(payload.changelogs[0].title)).toBeVisible({ timeout: 10000 });
            return;
        }

        await expect(page.getByText(/No updates yet|Failed to load changelog/i)).toBeVisible({ timeout: 10000 });
    });

    test('Dice Throne 直达链接会直接打开详情弹窗', async ({ page }) => {
        await page.goto('/?game=dicethrone', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/game=dicethrone/);
        await expect(page.getByTestId('game-details-modal-root')).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /Local Match Setup/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Play AI/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Tutorial/i })).toBeVisible();
    });

    test('Dice Throne 更新日志 tab 会渲染接口返回的已发布内容', async ({ page, game }, testInfo) => {
        await page.route('**/game-changelogs/dicethrone', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    changelogs: [
                        {
                            id: 'cl-dicethrone-1',
                            gameId: 'dicethrone',
                            title: 'Balance Update',
                            versionLabel: 'v0.1.3',
                            content: 'Pyromancer burn tooltip now matches the published rules.',
                            pinned: true,
                            published: true,
                            publishedAt: '2026-03-12T00:00:00.000Z',
                            createdAt: '2026-03-12T00:00:00.000Z',
                            updatedAt: '2026-03-12T00:00:00.000Z',
                        },
                    ],
                }),
            });
        });

        await page.getByRole('heading', { name: /Dice Throne/i }).click();
        await expect(page).toHaveURL(/game=dicethrone/);

        await page.getByRole('button', { name: /Updates/i }).click();

        await expect(page.getByText('Balance Update')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('v0.1.3')).toBeVisible();
        await expect(page.getByText('Pinned')).toBeVisible();
        await expect(page.getByText('Pyromancer burn tooltip now matches the published rules.')).toBeVisible();

        await game.screenshot('lobby-dicethrone-changelog-renders-published-entry', testInfo);
    });
});
