import { test, expect } from '../framework';
import { TOKEN_IDS } from '../../src/games/dicethrone/domain/ids';
import { ZHANSHUJIA_PASSIVE_ABILITIES } from '../../src/games/dicethrone/heroes/zhanshujia/tokens';

const randomValueForDieFace = (value: number): number => {
    const normalized = Math.max(1, Math.min(6, Math.floor(value)));
    return ((normalized - 1) / 6) + 0.001;
};

async function dragHandCardToPlay(page: any, cardId: string): Promise<void> {
    const handCard = page.locator(`[data-testid="hand-area"] [data-card-id="${cardId}"]`).first();
    await expect(handCard).toBeVisible({ timeout: 10000 });
    await expect(handCard).toHaveAttribute('data-can-drag', 'true', { timeout: 10000 });
    const cardBox = await page.evaluate((nextCardId: string) => {
        const node = document.querySelector(`[data-testid="hand-area"] [data-card-id="${nextCardId}"]`) as HTMLElement | null;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const startX = rect.x + (rect.width / 2);
        const startY = rect.y + (rect.height * 0.78);
        const hit = document.elementFromPoint(startX, startY) as HTMLElement | null;
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            hitCardId: hit?.closest('[data-card-id]')?.getAttribute('data-card-id') ?? null,
        };
    }, cardId);
    if (!cardBox || cardBox.width <= 0 || cardBox.height <= 0 || cardBox.hitCardId !== cardId) {
        throw new Error(`未能获取手牌 ${cardId} 的拖拽区域`);
    }

    const startX = cardBox.x + (cardBox.width / 2);
    const startY = cardBox.y + (cardBox.height * 0.78);
    const endY = Math.max(24, startY - 240);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 12 });
    const draggedCardBox = await handCard.boundingBox();
    if (!draggedCardBox || cardBox.y - draggedCardBox.y < 180) {
        throw new Error(`手牌 ${cardId} 没有真正拖到打出距离`);
    }
    await page.mouse.up();
    await page.mouse.move(2, 2);
}

test.describe('DiceThrone - 选择骰子修改', () => {
    test('card-me-too 复制骰面时重复点源骰不会提前完成，点目标骰后才结算', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone', { playerID: '0' });

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: ['card-me-too'],
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollConfirmed: false,
                dice: [
                    { id: 0, value: 6, isKept: false },
                    { id: 1, value: 5, isKept: false },
                    { id: 2, value: 4, isKept: false },
                    { id: 3, value: 2, isKept: false },
                    { id: 4, value: 3, isKept: false },
                ],
            },
        });

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-me-too'),
                diceCount: state?.core?.dice?.length ?? 0,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'offensiveRoll',
            hasCard: true,
            diceCount: 5,
        });

        const diceTray = page.getByTestId('dicethrone-2d-dice-tray');
        await expect(diceTray).toBeVisible({ timeout: 10000 });
        await expect(diceTray.getByTestId('dice-2d')).toHaveCount(5);
        await expect.poll(async () => diceTray.getByTestId('dice-2d').evaluateAll((dice) => (
            dice.every((die) => (
                die.getAttribute('data-sprite-ready') === 'true'
                && die.getAttribute('data-sprite-url')?.includes('/dicethrone/images/monk/')
            ))
        ))).toBe(true);
        await expect(diceTray.locator('canvas')).toHaveCount(0);
        await game.screenshot('01-真人自己的2D骰图已加载', testInfo);

        await dragHandCardToPlay(page, 'card-me-too');

        await expect.poll(async () => {
            const interaction = (await game.getState())?.sys?.interaction?.current;
            const meta = interaction?.data?.meta;
            return {
                dtType: meta?.dtType ?? null,
                mode: meta?.dieModifyConfig?.mode ?? null,
                selectCount: meta?.selectCount ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            dtType: 'modifyDie',
            mode: 'copy',
            selectCount: 2,
        });

        await game.screenshot('me-too-copy-source-ready', testInfo);

        const sourceDieButton = page.locator('[data-testid="die-button-0"]');
        await expect(sourceDieButton).toBeVisible({ timeout: 5000 });
        await sourceDieButton.click();
        await sourceDieButton.click();

        await expect.poll(async () => {
            const state = await game.getState();
            const lastEvents = (state?.sys?.eventStream?.entries ?? []).slice(-8);
            return {
                interactionKind: state?.sys?.interaction?.current?.kind ?? null,
                dtType: state?.sys?.interaction?.current?.data?.meta?.dtType ?? null,
                diceValues: (state?.core?.dice ?? []).map((die: any) => die.value),
                modifiedCount: lastEvents.filter((entry: any) => entry.event?.type === 'DIE_MODIFIED').length,
            };
        }, { timeout: 5000 }).toMatchObject({
            interactionKind: 'multistep-choice',
            dtType: 'modifyDie',
            diceValues: [6, 5, 4, 2, 3],
            modifiedCount: 0,
        });

        await game.screenshot('me-too-copy-duplicate-source-still-waiting', testInfo);

        const targetDieButton = page.locator('[data-testid="die-button-3"]');
        await expect(targetDieButton).toBeVisible({ timeout: 5000 });
        await targetDieButton.click();

        await expect.poll(async () => {
            const state = await game.getState();
            const lastEvents = (state?.sys?.eventStream?.entries ?? []).slice(-8);
            return {
                targetDie: state?.core?.dice?.[3]?.value ?? null,
                interactionKind: state?.sys?.interaction?.current?.kind ?? null,
                handIds: (state?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id),
                lastEventTypes: lastEvents.map((entry: any) => entry.event?.type),
            };
        }, { timeout: 5000 }).toMatchObject({
            targetDie: 6,
            interactionKind: null,
            handIds: [],
        });

        await game.screenshot('me-too-copy-settled', testInfo);

        const finalState = await game.getState();
        const finalHandIds = (finalState?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id);
        const finalEventTypes = (finalState?.sys?.eventStream?.entries ?? [])
            .slice(-8)
            .map((entry: any) => entry.event?.type);

        expect(finalState?.core?.dice?.[3]?.value ?? null).toBe(6);
        expect(finalHandIds).not.toContain('card-me-too');
        expect(finalEventTypes).toContain('CARD_PLAYED');
        expect(finalEventTypes).toContain('DIE_MODIFIED');
    });

    test('card-play-six 应通过 framework 场景完成改骰到 6', async ({ page, game }) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: ['card-play-six'],
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollConfirmed: false,
                dice: [
                    { id: 0, value: 2, isKept: false },
                    { id: 1, value: 3, isKept: false },
                    { id: 2, value: 4, isKept: false },
                    { id: 3, value: 5, isKept: false },
                    { id: 4, value: 1, isKept: false },
                ],
            },
        });

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-play-six'),
                diceCount: state?.core?.dice?.length ?? 0,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'offensiveRoll',
            hasCard: true,
            diceCount: 5,
        });

        await dragHandCardToPlay(page, 'card-play-six');

        await expect.poll(async () => {
            const interaction = (await game.getState())?.sys?.interaction?.current;
            const meta = interaction?.data?.meta;
            return {
                dtType: meta?.dtType ?? null,
                mode: meta?.dieModifyConfig?.mode ?? null,
                targetValue: meta?.dieModifyConfig?.targetValue ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            dtType: 'modifyDie',
            mode: 'set',
            targetValue: 6,
        });

        const dieButton = page.locator('[data-testid="die-button-0"]');
        await expect(dieButton).toBeVisible({ timeout: 5000 });
        await dieButton.click();

        await expect.poll(async () => {
            const state = await game.getState();
            const lastEvents = (state?.sys?.eventStream?.entries ?? []).slice(-6);
            return {
                firstDie: state?.core?.dice?.[0]?.value ?? null,
                interactionKind: state?.sys?.interaction?.current?.kind ?? null,
                handIds: (state?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id),
                lastEventTypes: lastEvents.map((entry: any) => entry.event?.type),
            };
        }, { timeout: 5000 }).toMatchObject({
            firstDie: 6,
            interactionKind: null,
            handIds: [],
        });

        const finalState = await game.getState();
        const finalHandIds = (finalState?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id);
        const finalEventTypes = (finalState?.sys?.eventStream?.entries ?? [])
            .slice(-6)
            .map((entry: any) => entry.event?.type);

        expect(finalState?.core?.dice?.[0]?.value ?? null).toBe(6);
        expect(finalHandIds).not.toContain('card-play-six');
        expect(finalEventTypes).toContain('CARD_PLAYED');
        expect(finalEventTypes).toContain('DIE_MODIFIED');
    });

    test('主要阶段待结算奖励骰不得放行掷骰时机牌', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: ['card-play-six'],
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                hostStarted: true,
                rollCount: 0,
                rollLimit: 3,
                rollConfirmed: true,
                dice: [],
                pendingBonusDiceSettlement: {
                    id: 'e2e-main1-bonus-die-modification',
                    sourceAbilityId: 'e2e-bonus-die',
                    attackerId: '0',
                    targetId: '1',
                    dice: [
                        {
                            index: 0,
                            value: 3,
                            face: 'palm',
                            effectKey: 'bonusDie.effect.damage',
                            effectParams: { value: 3 },
                            presentationKind: 'choice',
                        },
                    ],
                    rerollCostTokenId: 'taiji',
                    rerollCostAmount: 1,
                    rerollCount: 0,
                    maxRerollCount: 0,
                    readyToSettle: false,
                    showTotal: true,
                    resolutionMode: 'damage',
                    allowDiceModification: true,
                },
                currentRollContext: {
                    id: 'bonus:e2e-main1-bonus-die-modification',
                    kind: 'bonus',
                    ownerPlayerId: '0',
                    targetPlayerId: '1',
                    sourceAbilityId: 'e2e-bonus-die',
                    dice: [{
                        id: 0,
                        definitionId: 'bonus:e2e-bonus-die',
                        value: 3,
                        symbol: 'palm',
                        symbols: ['palm'],
                        isKept: false,
                        ownerId: '0',
                    }],
                    status: 'open',
                    policy: {
                        modifiableBy: 'owner',
                        rerollableBy: 'owner',
                        allowPassiveReroll: true,
                        allowDiceCardTargeting: true,
                        ultimateLocked: false,
                        blocksPhaseFlow: true,
                    },
                    settlement: {
                        mode: 'damage',
                        metadata: {
                            pendingBonusDiceSettlementId: 'e2e-main1-bonus-die-modification',
                        },
                    },
                    display: { surface: 'bonusOverlay', replayOnly: false },
                },
            },
        });

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-play-six'),
                bonusDieValue: state?.core?.pendingBonusDiceSettlement?.dice?.[0]?.value ?? null,
                allowDiceModification: state?.core?.pendingBonusDiceSettlement?.allowDiceModification ?? false,
                currentRollKind: state?.core?.currentRollContext?.kind ?? null,
                allowDiceCardTargeting: state?.core?.currentRollContext?.policy?.allowDiceCardTargeting ?? false,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'main1',
            hasCard: true,
            bonusDieValue: 3,
            allowDiceModification: true,
            currentRollKind: 'bonus',
            allowDiceCardTargeting: true,
        });

        const eventCountBeforeAttempt = await page.evaluate(() => (
            (window as any).__BG_TEST_HARNESS__?.state?.get?.()?.sys?.eventStream?.entries?.length ?? 0
        ));

        await dragHandCardToPlay(page, 'card-play-six');

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-play-six'),
                bonusDieValue: state?.core?.pendingBonusDiceSettlement?.dice?.[0]?.value ?? null,
                interactionKind: state?.sys?.interaction?.current?.kind ?? null,
            };
        }, { timeout: 5000 }).toEqual({
            hasCard: true,
            bonusDieValue: 3,
            interactionKind: null,
        });

        const finalState = await game.getState();
        const finalHandIds = (finalState?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id);
        const newEventTypes = (finalState?.sys?.eventStream?.entries ?? [])
            .slice(eventCountBeforeAttempt)
            .map((entry: any) => entry.event?.type);

        expect(finalState?.sys?.phase ?? null).toBe('main1');
        expect(finalState?.core?.pendingBonusDiceSettlement?.dice?.[0]?.value ?? null).toBe(3);
        expect(finalHandIds).toContain('card-play-six');
        expect(newEventTypes).not.toContain('CARD_PLAYED');
        expect(newEventTypes).not.toContain('DIE_MODIFIED');

        await game.screenshot('main1-bonus-die-roll-card-rejected', testInfo);
    });

    test('终极来源的未结算骰允许改骰并在确认后结算', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: ['card-play-six'],
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'monk', '1': 'barbarian' },
                hostStarted: true,
                rollCount: 1,
                rollLimit: 3,
                rollDiceCount: 1,
                rollConfirmed: false,
                dice: [],
                pendingBonusDiceSettlement: {
                    id: 'e2e-ultimate-locked-die',
                    sourceAbilityId: 'e2e-ultimate-locked',
                    attackerId: '0',
                    targetId: '1',
                    dice: [{
                        index: 0,
                        value: 3,
                        face: 'palm',
                        effectKey: 'bonusDie.effect.damage',
                        effectParams: { value: 3 },
                    }],
                    rerollCostTokenId: '',
                    rerollCostAmount: 0,
                    rerollCount: 0,
                    maxRerollCount: 0,
                    readyToSettle: false,
                    resolutionMode: 'none',
                    allowDiceModification: true,
                },
                currentRollContext: {
                    id: 'bonus:e2e-ultimate-locked-die',
                    kind: 'bonus',
                    ownerPlayerId: '0',
                    targetPlayerId: '1',
                    sourceAbilityId: 'e2e-ultimate-locked',
                    dice: [{
                        id: 0,
                        definitionId: 'bonus:e2e-ultimate-locked',
                        value: 3,
                        symbol: 'palm',
                        symbols: ['palm'],
                        isKept: false,
                        ownerId: '0',
                    }],
                    status: 'open',
                    policy: {
                        modifiableBy: 'owner',
                        rerollableBy: 'owner',
                        allowPassiveReroll: true,
                        allowDiceCardTargeting: true,
                        ultimateLocked: false,
                        blocksPhaseFlow: true,
                    },
                    settlement: { mode: 'none' },
                    display: { surface: 'bonusOverlay', replayOnly: false },
                },
            },
        });

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-play-six'),
                contextStatus: state?.core?.currentRollContext?.status ?? null,
                allowDiceCardTargeting: state?.core?.currentRollContext?.policy?.allowDiceCardTargeting ?? null,
            };
        }, { timeout: 10000 }).toMatchObject({
            hasCard: true,
            contextStatus: 'open',
            allowDiceCardTargeting: true,
        });

        await dragHandCardToPlay(page, 'card-play-six');

        const dieButton = page.locator('[data-testid="die-button-0"]').first();
        await expect(dieButton).toBeVisible({ timeout: 5000 });
        await expect(dieButton).toHaveAttribute('data-clickable', 'true');
        await dieButton.click();

        await expect.poll(async () => {
            const state = await game.getState();
            const eventTypes = (state?.sys?.eventStream?.entries ?? [])
                .slice(-8)
                .map((entry: any) => entry.event?.type);
            return {
                hasCard: !!state?.core?.players?.['0']?.hand?.some((card: any) => card.id === 'card-play-six'),
                interactionKind: state?.sys?.interaction?.current?.kind ?? null,
                eventTypes,
                bonusDieValue: state?.core?.pendingBonusDiceSettlement?.dice?.[0]?.value ?? null,
                contextStatus: state?.core?.currentRollContext?.status ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            hasCard: false,
            interactionKind: null,
            bonusDieValue: 6,
            contextStatus: 'open',
        });

        await game.screenshot('终极来源骰-改骰后等待确认', testInfo);
        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]').first();
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await confirmButton.click();

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                pendingBonusDiceSettlement: state?.core?.pendingBonusDiceSettlement ?? null,
                currentRollContext: state?.core?.currentRollContext ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            pendingBonusDiceSettlement: null,
            currentRollContext: null,
        });

        await game.screenshot('终极来源骰-改骰后确认结算', testInfo);
    });

    test('野蛮人临时奖励骰确认后恢复主攻击骰，不切给僧侣或对手回合', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone');
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 0, HP: 50 },
            },
            player1: {
                resources: { CP: 0, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'monk' },
                hostStarted: true,
            },
        });

        await page.evaluate(() => {
            const attackDice = [6, 5, 4, 3, 2].map((value, index) => ({
                id: index,
                definitionId: 'barbarian-dice',
                value,
                symbol: null,
                symbols: [],
                isKept: false,
                ownerId: '0',
                displayOnly: false,
            }));
            const parentRollContext = {
                id: 'roll:offensive:0:1',
                kind: 'offensive',
                ownerPlayerId: '0',
                targetPlayerId: '1',
                phase: 'offensiveRoll',
                dice: attackDice,
                status: 'open',
                policy: {
                    modifiableBy: 'owner',
                    rerollableBy: 'owner',
                    allowPassiveReroll: true,
                    allowDiceCardTargeting: true,
                    ultimateLocked: false,
                    blocksPhaseFlow: true,
                },
                settlement: { mode: 'selectAttack' },
                display: { surface: 'diceTray', replayOnly: false },
            };
            const temporaryBonusDice = [{
                index: 0,
                value: 3,
                face: 'sabre',
                effectParams: { value: 3 },
            }];
            const temporaryRollContext = {
                id: 'bonus:e2e-temporary-barbarian-die',
                kind: 'bonus',
                ownerPlayerId: '0',
                targetPlayerId: '1',
                sourceAbilityId: 'e2e-temporary-barbarian-die',
                dice: temporaryBonusDice.map((die) => ({
                    id: die.index,
                    definitionId: 'barbarian-dice',
                    value: die.value,
                    symbol: die.face,
                    symbols: [die.face],
                    isKept: false,
                    ownerId: '0',
                    displayOnly: false,
                })),
                status: 'open',
                policy: {
                    modifiableBy: 'owner',
                    rerollableBy: 'owner',
                    allowPassiveReroll: true,
                    allowDiceCardTargeting: true,
                    ultimateLocked: false,
                    blocksPhaseFlow: true,
                },
                settlement: {
                    mode: 'attackBonus',
                    metadata: { pendingBonusDiceSettlementId: 'e2e-temporary-barbarian-die' },
                },
                display: { surface: 'diceTray', replayOnly: false },
                suspendedParent: parentRollContext,
            };
            (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
                sys: {
                    phase: 'offensiveRoll',
                    interaction: { current: undefined, queue: [] },
                },
                core: {
                    activePlayerId: '0',
                    dice: attackDice,
                    rollCount: 1,
                    rollLimit: 3,
                    rollDiceCount: 5,
                    rollConfirmed: false,
                    pendingBonusDiceSettlement: {
                        id: 'e2e-temporary-barbarian-die',
                        sourceAbilityId: 'e2e-temporary-barbarian-die',
                        attackerId: '0',
                        targetId: '1',
                        dice: temporaryBonusDice,
                        rerollCostTokenId: '',
                        rerollCostAmount: 0,
                        rerollCount: 0,
                        maxRerollCount: 0,
                        readyToSettle: false,
                        allowDiceModification: true,
                        displayOnly: false,
                        resolutionMode: 'attackBonus',
                    },
                    currentRollContext: temporaryRollContext,
                },
            });
        });

        const diceTray = page.getByTestId('dicethrone-2d-dice-tray');
        const temporaryDie = diceTray.getByTestId('die-button-0');
        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]').first();
        await expect(confirmButton).toBeVisible({ timeout: 10000 });
        await expect(confirmButton).toHaveText(/^(确认|Confirm)$/);
        await expect(diceTray.getByTestId('dice-2d')).toHaveCount(1);
        await expect(temporaryDie.getByTestId('dice-2d')).toHaveAttribute(
            'data-sprite-url',
            /\/dicethrone\/images\/barbarian\/(?:compressed\/)?dice\.(?:webp|png)(?:[?#].*)?$/,
        );
        await expect(page.locator('[data-tutorial-id="advance-phase-button"]')).toBeDisabled();
        await expect(page.getByTestId('restore-covered-roll-button')).toHaveCount(0);
        await game.screenshot('01-野蛮人临时奖励骰等待确认', testInfo);

        await confirmButton.click();
        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                activePlayerId: state?.core?.activePlayerId ?? null,
                pendingBonusDiceSettlement: state?.core?.pendingBonusDiceSettlement ?? null,
                currentRollContext: {
                    id: state?.core?.currentRollContext?.id ?? null,
                    kind: state?.core?.currentRollContext?.kind ?? null,
                    ownerPlayerId: state?.core?.currentRollContext?.ownerPlayerId ?? null,
                    dice: state?.core?.currentRollContext?.dice?.map((die: any) => die.value) ?? [],
                    hasSuspendedParent: Boolean(state?.core?.currentRollContext?.suspendedParent),
                },
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'offensiveRoll',
            activePlayerId: '0',
            pendingBonusDiceSettlement: null,
            currentRollContext: {
                id: 'roll:offensive:0:1',
                kind: 'offensive',
                ownerPlayerId: '0',
                dice: [6, 5, 4, 3, 2],
                hasSuspendedParent: false,
            },
        });
        await expect(diceTray.getByTestId('dice-2d')).toHaveCount(5);
        await expect(diceTray.locator('[data-sprite-url]')).toHaveCount(5);
        await expect.poll(() => diceTray.locator('[data-sprite-url]').evaluateAll((dice) => (
            dice.every((die) => die.getAttribute('data-sprite-url')?.includes('/dicethrone/images/barbarian/'))
        ))).toBe(true);
        await game.screenshot('02-确认后恢复野蛮人主攻击骰且未切换回合', testInfo);
    });

    test('闪避骰进入当前骰区后，战术优势可重掷并重新计算免伤', async ({ page, game }, testInfo) => {
        await game.openTestGame('dicethrone', { playerID: '1', seat1: 'human' });
        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { CP: 2, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main2',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'monk' },
                hostStarted: true,
            },
        });
        await game.waitForPhase('main2', 5000);

        await page.evaluate((scenario) => {
            const harness = (window as Window & {
                __BG_TEST_HARNESS__?: {
                    dice?: { setValues?: (values: number[]) => void };
                    state?: {
                        get?: () => any;
                        set?: (state: any) => void | Promise<void>;
                    };
                };
            }).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            if (!state || !harness?.state?.set) {
                throw new Error('TestHarness state 不可用');
            }

            harness.dice?.setValues?.([1, 6]);
            const nextState = structuredClone(state);
            nextState.sys = {
                ...(nextState.sys ?? {}),
                phase: 'defensiveRoll',
                interaction: {
                    current: {
                        id: 'dt-token-response-evasion-current-roll',
                        kind: 'dt:token-response',
                        playerId: '1',
                        data: { pendingDamageId: 'e2e-evasion-current-roll' },
                    },
                    queue: [],
                },
            };
            nextState.core = {
                ...(nextState.core ?? {}),
                activePlayerId: '0',
                hostStarted: true,
                rollCount: 1,
                rollLimit: 1,
                rollConfirmed: true,
                selectedCharacters: {
                    ...(nextState.core?.selectedCharacters ?? {}),
                    '0': 'barbarian',
                    '1': 'monk',
                },
                pendingAttack: {
                    attackerId: '0',
                    defenderId: '1',
                    sourceAbilityId: 'e2e-evasion-current-roll-attack',
                    isDefendable: true,
                    damage: 5,
                    bonusDamage: 0,
                    attackModifierBonusDamage: 0,
                    damageResolved: false,
                    resolvedDamage: 0,
                    preDefenseResolved: false,
                    offensiveRollEndTokenResolved: false,
                },
                pendingDamage: {
                    id: 'e2e-evasion-current-roll',
                    sourcePlayerId: '0',
                    targetPlayerId: '1',
                    originalDamage: 5,
                    currentDamage: 5,
                    sourceAbilityId: 'e2e-evasion-current-roll-attack',
                    responseType: 'beforeDamageReceived',
                    responderId: '1',
                    isFullyEvaded: false,
                },
                players: {
                    ...(nextState.core?.players ?? {}),
                    '1': {
                        ...(nextState.core?.players?.['1'] ?? {}),
                        passiveAbilities: scenario.passiveAbilities,
                        tokens: {
                            ...(nextState.core?.players?.['1']?.tokens ?? {}),
                            [scenario.evasiveTokenId]: 1,
                            [scenario.tacticalAdvantageTokenId]: 1,
                        },
                    },
                },
            };
            return harness.state.set(nextState);
        }, {
            passiveAbilities: ZHANSHUJIA_PASSIVE_ABILITIES,
            evasiveTokenId: TOKEN_IDS.EVASIVE,
            tacticalAdvantageTokenId: TOKEN_IDS.TACTICAL_ADVANTAGE,
        });

        const injectedState = await game.getState();
        expect({
            activePlayerId: injectedState?.core?.activePlayerId ?? null,
            pendingDamageId: injectedState?.core?.pendingDamage?.id ?? null,
            interactionKind: injectedState?.sys?.interaction?.current?.kind ?? null,
            interactionPlayerId: injectedState?.sys?.interaction?.current?.playerId ?? null,
            evasiveTokens: injectedState?.core?.players?.['1']?.tokens?.[TOKEN_IDS.EVASIVE] ?? null,
            hasEvasiveDefinition: injectedState?.core?.tokenDefinitions?.some((token: { id?: string }) => token.id === TOKEN_IDS.EVASIVE) ?? false,
        }).toMatchObject({
            activePlayerId: '0',
            pendingDamageId: 'e2e-evasion-current-roll',
            interactionKind: 'dt:token-response',
            interactionPlayerId: '1',
            evasiveTokens: 1,
            hasEvasiveDefinition: true,
        });

        const tokenResponse = page.getByTestId('token-response-modal');
        await expect(tokenResponse).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId(`token-response-use-${TOKEN_IDS.EVASIVE}`)).toBeVisible();
        await page.getByTestId(`token-response-use-${TOKEN_IDS.EVASIVE}`).click();

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                rollKind: state?.core?.currentRollContext?.kind ?? null,
                dieValue: state?.core?.currentRollContext?.dice?.[0]?.value ?? null,
                currentDamage: state?.core?.pendingDamage?.currentDamage ?? null,
                isFullyEvaded: state?.core?.pendingDamage?.isFullyEvaded ?? null,
                tacticalAdvantage: state?.core?.players?.['1']?.tokens?.[TOKEN_IDS.TACTICAL_ADVANTAGE] ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            rollKind: 'evasion',
            dieValue: 1,
            currentDamage: 0,
            isFullyEvaded: true,
            tacticalAdvantage: 1,
        });
        await expect(tokenResponse).toBeVisible();
        await game.screenshot('闪避骰-成功后可干预', testInfo);

        const tacticalReroll = page.getByTestId('passive-action-zhanshujia-tactical-advantage-1');
        await expect(tacticalReroll).toBeVisible({ timeout: 5000 });
        await tacticalReroll.click();

        const evasionDie = page.locator('[data-testid="die-button-0"]').first();
        await expect(evasionDie).toBeVisible({ timeout: 5000 });
        await expect(evasionDie).toHaveAttribute('data-clickable', 'true');
        await expect(evasionDie.getByTestId('dice-2d')).toHaveAttribute(
            'data-sprite-url',
            /\/dicethrone\/images\/monk\/(?:compressed\/)?dice\.(?:webp|png)(?:[?#].*)?$/,
        );
        await evasionDie.click();

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                rollKind: state?.core?.currentRollContext?.kind ?? null,
                dieValue: state?.core?.currentRollContext?.dice?.[0]?.value ?? null,
                currentDamage: state?.core?.pendingDamage?.currentDamage ?? null,
                isFullyEvaded: state?.core?.pendingDamage?.isFullyEvaded ?? null,
                tacticalAdvantage: state?.core?.players?.['1']?.tokens?.[TOKEN_IDS.TACTICAL_ADVANTAGE] ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            rollKind: 'evasion',
            dieValue: 6,
            currentDamage: 5,
            isFullyEvaded: false,
            tacticalAdvantage: 0,
        });
        await expect.poll(async () => evasionDie.getByTestId('dice-2d').evaluate((die) => {
            const cube = die.querySelector('[data-testid="dice-2d-cube"]');
            return {
                rollAnimation: die.getAttribute('data-roll-animation'),
                animationName: cube instanceof HTMLElement ? getComputedStyle(cube).animationName : null,
            };
        }), { timeout: 5000 }).toMatchObject({
            rollAnimation: 'settled',
            animationName: 'none',
        });
        await game.screenshot('闪避骰-战术优势重掷后', testInfo);
    });
});
