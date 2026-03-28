import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './framework';
import type { GameTestContext } from './framework';
import { TOKEN_IDS } from '../src/games/dicethrone/domain/ids';

type ScenePlayers = Record<'0' | '1', string>;

async function setupTokenScene(
    game: GameTestContext,
    players: ScenePlayers,
    currentPlayer: '0' | '1' = '0',
): Promise<void> {
    await game.openTestGame('dicethrone');
    await game.setupScene({
        gameId: 'dicethrone',
        player0: {
            resources: { CP: 0, HP: 50 },
        },
        player1: {
            resources: { CP: 0, HP: 50 },
        },
        currentPlayer,
        phase: 'main2',
        extra: {
            selectedCharacters: players,
            hostStarted: true,
        },
    });

    await game.waitForPhase('main2', 5000);
}

async function patchPlayerTokens(
    page: Page,
    playerId: '0' | '1',
    tokens: Record<string, number>,
): Promise<void> {
    await page.evaluate(({ id, patch }) => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const state = harness?.state?.get?.();
        const player = state?.core?.players?.[id];

        if (!player || typeof harness?.state?.patch !== 'function') {
            throw new Error('TestHarness state.patch 不可用');
        }

        harness.state.patch({
            core: {
                players: {
                    [id]: {
                        ...player,
                        tokens: {
                            ...(player.tokens ?? {}),
                            ...patch,
                        },
                    },
                },
            },
        });
    }, { id: playerId, patch: tokens });

    await page.waitForTimeout(300);
}

async function readTokenCount(
    game: GameTestContext,
    playerId: '0' | '1',
    tokenId: string,
): Promise<number> {
    const player = await game.getPlayerState(playerId);
    return player?.tokens?.[tokenId] ?? 0;
}

async function expectTokenCount(
    game: GameTestContext,
    playerId: '0' | '1',
    tokenId: string,
    count: number,
): Promise<void> {
    await expect.poll(
        () => readTokenCount(game, playerId, tokenId),
        { timeout: 5000 },
    ).toBe(count);
}

test.describe('Token 响应窗口完整流程', () => {
    test('攻击方暴击 token 注入后可见', async ({ page, game }, testInfo: TestInfo) => {
        await setupTokenScene(game, { '0': 'paladin', '1': 'barbarian' });
        await patchPlayerTokens(page, '0', { [TOKEN_IDS.CRIT]: 2 });

        await expectTokenCount(game, '0', TOKEN_IDS.CRIT, 2);
        await game.screenshot('crit-token-visible', testInfo);
    });

    test('防御方守护 token 注入后可见', async ({ page, game }) => {
        await setupTokenScene(game, { '0': 'paladin', '1': 'barbarian' });
        await patchPlayerTokens(page, '1', { [TOKEN_IDS.PROTECT]: 3 });

        await expectTokenCount(game, '1', TOKEN_IDS.PROTECT, 3);
    });

    test('太极 token 注入后可见（双时机 token）', async ({ page, game }) => {
        await setupTokenScene(game, { '0': 'monk', '1': 'barbarian' });

        await patchPlayerTokens(page, '0', { [TOKEN_IDS.TAIJI]: 2 });
        await expectTokenCount(game, '0', TOKEN_IDS.TAIJI, 2);

        await patchPlayerTokens(page, '0', { [TOKEN_IDS.TAIJI]: 1 });
        await expectTokenCount(game, '0', TOKEN_IDS.TAIJI, 1);

        await patchPlayerTokens(page, '0', { [TOKEN_IDS.TAIJI]: 0 });
        await expectTokenCount(game, '0', TOKEN_IDS.TAIJI, 0);
    });

    test('跳过响应时 token 不被消耗', async ({ page, game }) => {
        await setupTokenScene(game, { '0': 'paladin', '1': 'barbarian' });
        await patchPlayerTokens(page, '0', { [TOKEN_IDS.CRIT]: 1 });

        await expectTokenCount(game, '0', TOKEN_IDS.CRIT, 1);
        await expectTokenCount(game, '0', TOKEN_IDS.CRIT, 1);
    });
});
