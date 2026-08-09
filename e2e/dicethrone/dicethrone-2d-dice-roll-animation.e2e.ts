import { test, expect } from '../framework';

test.describe('DiceThrone - 默认 2D 骰子立体翻滚回归', () => {
    test('真人点击投掷后，右侧 2D 骰盘恢复旧 CSS 六面体翻滚并停稳', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone', { playerID: '0' });
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                seatControllers: {
                    '0': { type: 'human' },
                    '1': { type: 'local-ai', difficulty: 'expert' },
                },
                hostStarted: true,
                rollCount: 0,
                rollLimit: 3,
                rollConfirmed: false,
                dice: [
                    { id: 0, value: 1, isKept: false },
                    { id: 1, value: 2, isKept: false },
                    { id: 2, value: 3, isKept: false },
                    { id: 3, value: 4, isKept: false },
                    { id: 4, value: 5, isKept: false },
                ],
            },
        });

        const diceTray = page.getByTestId('dicethrone-2d-dice-tray');
        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(diceTray).toBeVisible({ timeout: 10000 });
        await expect(diceTray.getByTestId('dice-2d')).toHaveCount(5);
        await expect.poll(async () => diceTray.getByTestId('dice-2d').evaluateAll((dice) => (
            dice.every((die) => die.getAttribute('data-sprite-ready') === 'true')
        ))).toBe(true);
        await expect(diceTray.locator('canvas')).toHaveCount(0);
        await expect(rollButton).toBeEnabled({ timeout: 10000 });

        await rollButton.click();
        await expect.poll(async () => diceTray.getByTestId('dice-2d').evaluateAll((dice) => {
            return dice.every((die) => {
                const cube = die.querySelector('[data-testid="dice-2d-cube"]');
                return cube instanceof HTMLElement
                    && die.getAttribute('data-visual-mode') === 'css-2d-cube'
                    && die.getAttribute('data-roll-animation') === 'dice2d-cube-tumble'
                    && getComputedStyle(cube).animationName === 'dice2d-cube-tumble';
            });
        }), {
            timeout: 5000,
            message: '真实投掷期间，5 颗默认 2D 骰子都必须执行旧 CSS 六面体翻滚',
        }).toBe(true);
        await game.screenshot('01-真人投掷中2D骰子恢复立体翻滚', testInfo);

        await expect.poll(async () => diceTray.getByTestId('dice-2d').evaluateAll((dice) => {
            return dice.every((die) => {
                const cube = die.querySelector('[data-testid="dice-2d-cube"]');
                return cube instanceof HTMLElement
                    && die.getAttribute('data-roll-animation') === 'settled'
                    && getComputedStyle(cube).animationName === 'none';
            });
        }), {
            timeout: 10000,
            message: '投掷结束后，2D 骰子必须停止翻滚并回到对应骰面',
        }).toBe(true);
        await game.screenshot('02-真人投掷后2D骰子停稳', testInfo);

        await expect.poll(async () => {
            const state = await game.getState();
            return state?.core?.rollCount ?? 0;
        }, { timeout: 10000 }).toBe(1);
    });
});
