import { test, expect } from '../framework';
import type { Page } from '@playwright/test';
import type { MatchState } from '../../src/engine/types';
import type { DiceThroneCore } from '../../src/games/dicethrone/types';
import {
    dispatchDiceThroneCommand,
    readDiceThroneHarnessState,
    waitForDiceThronePhase,
} from '../helpers/dicethrone';

type DiceThroneMatchState = MatchState<DiceThroneCore>;

const OPEN_TIMEOUT_MS = 180000;
const TEST_TIMEOUT_MS = 120000;

async function changeFirstDieFromSixToFive(page: Page): Promise<void> {
    const dieButton = page.getByTestId('die-button-0').first();
    await expect(dieButton).toBeVisible({ timeout: 10000 });
    await expect(dieButton).toHaveAttribute('data-display-value', '6');

    const decrementButton = page.getByTestId('die-adjust-decrement-0').first();
    await expect(decrementButton).toBeVisible({ timeout: 10000 });
    await decrementButton.click();
    await expect(dieButton).toHaveAttribute('data-display-value', '5');

    const confirmModifyButton = page.getByRole('button', { name: /^(确认|Confirm)(?:\s*\(\d+\))?$/i }).first();
    await expect(confirmModifyButton).toBeEnabled({ timeout: 10000 });
    await confirmModifyButton.click();
}

test.describe('DiceThrone AI 终极招式发动前响应', () => {
    test('真人响应提示更显眼且可跳过并关闭响应窗口', async ({ page, game }, testInfo) => {
        test.setTimeout(TEST_TIMEOUT_MS);

        await game.openTestGame('dicethrone', { playerID: '1' }, OPEN_TIMEOUT_MS);
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 10, HP: 50 },
            },
            player1: {
                hand: ['card-surprise'],
                resources: { CP: 10, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'zhanshujia', '1': 'cursed_pirate' },
                seatControllers: {
                    '0': { type: 'local-ai', difficulty: 'expert' },
                    '1': { type: 'human' },
                },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollDiceCount: 5,
                rollConfirmed: true,
                dice: [
                    { id: 0, value: 6, isKept: false },
                    { id: 1, value: 6, isKept: false },
                    { id: 2, value: 6, isKept: false },
                    { id: 3, value: 6, isKept: false },
                    { id: 4, value: 6, isKept: false },
                ],
            },
            sys: {
                phase: 'offensiveRoll',
                currentPlayerIndex: 0,
                interaction: { current: undefined, queue: [] },
                responseWindow: { current: undefined },
            },
        });

        await waitForDiceThronePhase(page, 'offensiveRoll');
        await dispatchDiceThroneCommand(page, {
            type: 'SELECT_ABILITY',
            playerId: '0',
            payload: { abilityId: 'high-ground' },
        });

        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneMatchState>(page);
            const responseWindow = state.sys.responseWindow?.current;
            return {
                windowType: responseWindow?.windowType ?? null,
                responderQueue: responseWindow?.responderQueue ?? [],
                sourceAbilityId: state.core.pendingAttack?.sourceAbilityId ?? null,
            };
        }, { timeout: 10000 }).toEqual({
            windowType: 'afterRollConfirmed',
            responderQueue: ['1'],
            sourceAbilityId: 'high-ground',
        });

        const responseHint = page.getByTestId('dicethrone-response-window-hint');
        const responseHintPanel = page.getByTestId('dicethrone-response-window-hint-panel');
        const responsePassButton = page.getByTestId('dicethrone-response-pass-button');
        const diceTray = page.getByTestId('dicethrone-2d-dice-tray');
        const attackShowcase = page.getByTestId('attack-showcase-overlay');
        const continueButton = attackShowcase.getByRole('button', { name: /^(继续|Continue)$/i });
        await expect(continueButton).toBeVisible({ timeout: 10000 });
        await continueButton.click();
        await expect(attackShowcase).toBeHidden({ timeout: 10000 });
        await expect(responseHint).toBeVisible({ timeout: 10000 });
        await expect(responseHintPanel).toBeVisible({ timeout: 10000 });
        await expect(responsePassButton).toBeEnabled({ timeout: 10000 });
        await expect(diceTray).toBeVisible({ timeout: 10000 });
        await expect(diceTray.getByTestId('dice-2d')).toHaveCount(5);
        await expect.poll(async () => diceTray.getByTestId('dice-2d').evaluateAll((dice) => (
            dice.every((die) => die.getAttribute('data-sprite-ready') === 'true')
        ))).toBe(true);
        await expect(diceTray.locator('canvas')).toHaveCount(0);

        const responseVisual = await responseHintPanel.evaluate((panel) => {
            const hintStyle = getComputedStyle(panel);
            const panelRect = panel.getBoundingClientRect();
            const passButton = panel.querySelector('[data-testid="dicethrone-response-pass-button"]');
            if (!(passButton instanceof HTMLButtonElement)) {
                throw new Error('响应提示中的跳过按钮缺失');
            }
            const buttonStyle = getComputedStyle(passButton);
            return {
                panelBorderWidth: Number.parseFloat(hintStyle.borderTopWidth),
                panelShadow: hintStyle.boxShadow,
                panelBackgroundImage: hintStyle.backgroundImage,
                panelBorderRadius: Number.parseFloat(hintStyle.borderTopLeftRadius),
                panelHeight: panelRect.height,
                panelCenterOffsetX: Math.abs(
                    panelRect.left + panelRect.width / 2 - window.innerWidth / 2,
                ),
                buttonBorderWidth: Number.parseFloat(buttonStyle.borderTopWidth),
                buttonShadow: buttonStyle.boxShadow,
                buttonBorderRadius: Number.parseFloat(buttonStyle.borderTopLeftRadius),
                buttonHeight: passButton.getBoundingClientRect().height,
                buttonBackgroundImage: buttonStyle.backgroundImage,
            };
        });
        expect(responseVisual).toMatchObject({
            panelBorderWidth: 2,
            buttonBorderWidth: 2,
            panelBackgroundImage: 'none',
            buttonBackgroundImage: 'none',
        });
        expect(responseVisual.panelShadow).not.toBe('none');
        expect(responseVisual.buttonShadow).not.toBe('none');
        expect(responseVisual.panelBorderRadius).toBeGreaterThanOrEqual(responseVisual.panelHeight / 2);
        expect(responseVisual.panelCenterOffsetX).toBeLessThanOrEqual(1);
        expect(responseVisual.buttonBorderRadius).toBeGreaterThanOrEqual(8);
        expect(responseVisual.buttonHeight).toBeGreaterThanOrEqual(44);

        const diceTrayVisual = await diceTray.evaluate((tray) => {
            const trayStyle = getComputedStyle(tray);
            return {
                borderWidth: Number.parseFloat(trayStyle.borderTopWidth),
                boxShadow: trayStyle.boxShadow,
                backgroundImage: trayStyle.backgroundImage,
            };
        });
        expect(diceTrayVisual).toMatchObject({ borderWidth: 2, backgroundImage: 'none' });
        expect(diceTrayVisual.boxShadow).not.toBe('none');
        await game.screenshot('01-真人响应提示显眼且2D骰盘已就绪', testInfo);

        await responsePassButton.click();
        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneMatchState>(page);
            return state.sys.responseWindow?.current ?? null;
        }, { timeout: 10000 }).toBeNull();
        await expect(responseHint).toBeHidden({ timeout: 10000 });
        await game.screenshot('02-真人跳过响应后提示关闭', testInfo);
    });

    test('AI 选中制胜高地后，真人应能用惊不惊喜改骰取消终极招式', async ({ page, game }, testInfo) => {
        test.setTimeout(TEST_TIMEOUT_MS);

        await game.openTestGame('dicethrone', { playerID: '1' }, OPEN_TIMEOUT_MS);
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 10, HP: 50 },
            },
            player1: {
                hand: ['card-surprise'],
                resources: { CP: 10, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'zhanshujia', '1': 'cursed_pirate' },
                seatControllers: {
                    '0': { type: 'local-ai', difficulty: 'expert' },
                    '1': { type: 'human' },
                },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollDiceCount: 5,
                rollConfirmed: true,
                dice: [
                    { id: 0, value: 6, isKept: false },
                    { id: 1, value: 6, isKept: false },
                    { id: 2, value: 6, isKept: false },
                    { id: 3, value: 6, isKept: false },
                    { id: 4, value: 6, isKept: false },
                ],
            },
            sys: {
                phase: 'offensiveRoll',
                currentPlayerIndex: 0,
                interaction: { current: undefined, queue: [] },
                responseWindow: { current: undefined },
            },
        });

        await waitForDiceThronePhase(page, 'offensiveRoll');

        await dispatchDiceThroneCommand(page, {
            type: 'SELECT_ABILITY',
            playerId: '0',
            payload: { abilityId: 'high-ground' },
        });

        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneMatchState>(page);
            const responseWindow = state.sys.responseWindow?.current;
            return {
                windowType: responseWindow?.windowType ?? null,
                responderQueue: responseWindow?.responderQueue ?? [],
                attackerId: state.core.pendingAttack?.attackerId ?? null,
                defenderId: state.core.pendingAttack?.defenderId ?? null,
                sourceAbilityId: state.core.pendingAttack?.sourceAbilityId ?? null,
                isUltimate: state.core.pendingAttack?.isUltimate ?? false,
                rollConfirmed: state.core.rollConfirmed,
            };
        }, { timeout: 10000 }).toEqual({
            windowType: 'afterRollConfirmed',
            responderQueue: ['1'],
            attackerId: '0',
            defenderId: '1',
            sourceAbilityId: 'high-ground',
            isUltimate: true,
            rollConfirmed: true,
        });

        await game.screenshot('01-AI选中制胜高地后-真人发动前响应窗口', testInfo);

        const surpriseCard = page.locator('[data-testid="hand-area"] [data-card-id="card-surprise"]').first();
        await expect(surpriseCard).toBeVisible({ timeout: 10000 });
        await expect(surpriseCard).toHaveAttribute('data-is-flipped', 'true', { timeout: 15000 });
        await expect(surpriseCard).toHaveAttribute('data-can-drag', 'true', { timeout: 15000 });

        await dispatchDiceThroneCommand(page, {
            type: 'PLAY_CARD',
            playerId: '1',
            payload: { cardId: 'card-surprise' },
        });

        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneMatchState>(page);
            const interaction = state.sys.interaction?.current;
            return {
                kind: interaction?.kind ?? null,
                dtType: interaction?.data?.meta?.dtType ?? null,
                sourceId: interaction?.data?.sourceId ?? null,
                diceOwnerId: interaction?.data?.meta?.diceOwnerId ?? null,
                allowedDieIds: interaction?.data?.allowedDieIds ?? [],
                hasSurpriseInHand: state.core.players['1'].hand.some(card => card.id === 'card-surprise'),
                attackStillPending: Boolean(state.core.pendingAttack),
            };
        }, { timeout: 10000 }).toMatchObject({
            kind: 'multistep-choice',
            dtType: 'modifyDie',
            sourceId: 'card-surprise',
            diceOwnerId: null,
            allowedDieIds: expect.arrayContaining([0, 1, 2, 3, 4]),
            hasSurpriseInHand: false,
            attackStillPending: true,
        });

        await changeFirstDieFromSixToFive(page);

        await expect.poll(async () => {
            const state = await readDiceThroneHarnessState<DiceThroneMatchState>(page);
            const eventTypes = state.sys.eventStream?.entries.map(entry => entry.event.type) ?? [];
            return {
                diceValues: state.core.dice.map(die => die.value),
                pendingAttack: state.core.pendingAttack ?? null,
                rollConfirmed: state.core.rollConfirmed,
                responseWindow: state.sys.responseWindow?.current ?? null,
                interaction: state.sys.interaction?.current ?? null,
                handIds: state.core.players['1'].hand.map(card => card.id),
                discardIds: state.core.players['1'].discard.map(card => card.id),
                hasReselectionEvent: eventTypes.includes('ABILITY_RESELECTION_REQUIRED'),
            };
        }, { timeout: 10000 }).toEqual({
            diceValues: [5, 6, 6, 6, 6],
            pendingAttack: null,
            rollConfirmed: false,
            responseWindow: null,
            interaction: null,
            handIds: [],
            discardIds: ['card-surprise'],
            hasReselectionEvent: true,
        });

        await game.screenshot('02-真人惊不惊喜改骰后-制胜高地被取消', testInfo);
    });
});
