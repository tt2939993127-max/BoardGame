import { test, expect } from '../framework';
import {
    dispatchDiceThroneCommand,
    readDiceThroneHarnessState,
} from '../helpers/dicethrone';

const OPEN_TIMEOUT_MS = 180000;

type DiceThroneEndgameHarnessState = {
    sys?: {
        phase?: string;
        gameover?: { winner?: string };
        eventStream?: { entries?: Array<{ event?: { type?: string } }> };
    };
    core?: {
        rollCount?: number;
        dice?: unknown[];
    };
};

test.describe('DiceThrone 终局攻击锁', () => {
    test('胜利弹窗出现后既拦住棋盘点击，也拒绝继续掷攻击骰', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await game.openTestGame('dicethrone', { playerID: '0' }, OPEN_TIMEOUT_MS);
        await game.setupScene({
            gameId: 'dicethrone',
            player0: { resources: { CP: 2, HP: 50 } },
            player1: { resources: { CP: 2, HP: 0 } },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'monk' },
                hostStarted: true,
                rollCount: 0,
                rollLimit: 3,
                rollDiceCount: 5,
                dice: [],
            },
            sys: {
                phase: 'offensiveRoll',
                currentPlayerIndex: 0,
                gameover: { winner: '0' },
                interaction: { current: undefined, queue: [] },
                responseWindow: { current: undefined },
            },
        });

        const endgameTitle = page.getByTestId('dt-endgame-title');
        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(endgameTitle).toBeVisible({ timeout: 10000 });
        await expect(rollButton).toBeVisible({ timeout: 10000 });

        const topmostAtRollButton = await rollButton.evaluate((button) => {
            const rect = button.getBoundingClientRect();
            const topmost = document.elementFromPoint(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
            );
            return topmost?.closest('[data-testid="endgame-overlay"]')?.getAttribute('data-testid') ?? null;
        });
        expect(topmostAtRollButton).toBe('endgame-overlay');

        await dispatchDiceThroneCommand(page, { type: 'ROLL_DICE', playerId: '0' });
        await expect(page.getByText('对局已结束', { exact: true })).toBeVisible();
        await expect(page.getByText('game_over', { exact: true })).toHaveCount(0);
        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneEndgameHarnessState>(page);
            return {
                phase: state.sys?.phase ?? null,
                winner: state.sys?.gameover?.winner ?? null,
                rollCount: state.core?.rollCount ?? null,
                diceCount: state.core?.dice?.length ?? null,
                hasRolledEvent: state.sys?.eventStream?.entries?.some((entry) => entry.event?.type === 'DICE_ROLLED') ?? false,
            };
        }).toEqual({
            phase: 'offensiveRoll',
            winner: '0',
            rollCount: 0,
            diceCount: 0,
            hasRolledEvent: false,
        });

        await game.screenshot('胜利弹窗出现后攻击骰无法再掷出', testInfo);
    });
});
