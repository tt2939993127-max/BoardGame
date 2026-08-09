import { describe, expect, it } from 'vitest';
import type { MatchState, RandomFn } from '../../../engine/types';
import { execute } from '../domain/execute';
import { getCustomActionHandler, resolveEffectsToEvents } from '../domain/effects';
import { initializeCustomActions } from '../domain/customActions';
import { validateCommand } from '../domain/commandValidation';
import { isPassiveActionUsable } from '../domain/passiveAbility';
import { reduce } from '../domain/reducer';
import type {
    DiceThroneCore,
    DiceThroneEvent,
    Die,
    HeroState,
    PendingBonusDiceSettlement,
} from '../domain/types';
import { RESOURCE_IDS } from '../domain/resources';
import { TOKEN_IDS } from '../domain/ids';
import { COMMON_CARDS } from '../domain/commonCards';
import { checkPlayCard } from '../domain/rules';
import { ZHANSHUJIA_PASSIVE_ABILITIES } from '../heroes/zhanshujia/tokens';
import { createEvasionRollContext, createMainRollContext } from '../domain/rollContext';

initializeCustomActions();

const queuedRandom = (values: number[]): RandomFn => {
    let index = 0;
    const fallback = values.length > 0 ? values[values.length - 1] : 1;
    return {
        random: () => 0,
        d: (max) => Math.min(Math.max(1, values[index++] ?? fallback), max),
        range: (min) => min,
        shuffle: (items) => [...items],
    };
};

const createDie = (id: number, value = 1): Die => ({
    id,
    definitionId: 'zhanshujia-dice',
    value,
    symbol: 'sabre',
    symbols: ['sabre'],
    isKept: false,
});

const createHero = (id: string, withTacticalAdvantage = false): HeroState => ({
    id,
    characterId: withTacticalAdvantage ? 'zhanshujia' : 'monk',
    resources: { [RESOURCE_IDS.HP]: 50, [RESOURCE_IDS.CP]: 5 },
    hand: [],
    deck: [],
    discard: [],
    statusEffects: {},
    tokens: withTacticalAdvantage ? { [TOKEN_IDS.TACTICAL_ADVANTAGE]: 1 } : {},
    tokenStackLimits: {},
    damageShields: [],
    abilities: [],
    abilityLevels: {},
    upgradeCardByAbilityId: {},
    passiveAbilities: withTacticalAdvantage ? ZHANSHUJIA_PASSIVE_ABILITIES : undefined,
});

const createCore = (): DiceThroneCore => ({
    players: {
        '0': createHero('0', true),
        '1': createHero('1'),
    },
    selectedCharacters: { '0': 'zhanshujia', '1': 'monk' },
    readyPlayers: { '0': true, '1': true },
    hostPlayerId: '0',
    hostStarted: true,
    dice: [0, 1, 2, 3, 4].map((id) => createDie(id)),
    rollCount: 0,
    rollLimit: 3,
    rollDiceCount: 5,
    rollConfirmed: false,
    activePlayerId: '0',
    startingPlayerId: '0',
    turnNumber: 1,
    pendingAttack: null,
    tokenDefinitions: [],
});

const roll = (
    state: DiceThroneCore,
    results: number[],
): DiceThroneCore => reduce(state, {
    type: 'DICE_ROLLED',
    payload: { results, rollerId: '0', phase: 'offensiveRoll' },
    timestamp: 1,
} as DiceThroneEvent);

const createBonusSettlement = (): PendingBonusDiceSettlement => ({
    id: 'bonus-test-1',
    sourceAbilityId: 'test-bonus',
    attackerId: '0',
    targetId: '1',
    dice: [{
        index: 0,
        value: 3,
        face: 'sabre',
        effectParams: { value: 3 },
    }],
    rerollCostTokenId: TOKEN_IDS.TACTICAL_ADVANTAGE,
    rerollCostAmount: 1,
    rerollCount: 0,
    readyToSettle: false,
    allowDiceModification: true,
});

describe('DiceThrone 单槽当前骰区', () => {
    it('主骰投掷会创建当前骰区，再次投掷会覆盖旧骰区', () => {
        const first = roll(createCore(), [1, 2, 3, 4, 5]);
        const firstContext = first.currentRollContext;

        expect(firstContext).toMatchObject({
            kind: 'offensive',
            ownerPlayerId: '0',
            phase: 'offensiveRoll',
        });
        expect(firstContext?.dice.map((die) => die.value)).toEqual([1, 2, 3, 4, 5]);
        expect(firstContext).not.toHaveProperty('coveredPreviousRollRef');

        const second = roll(first, [6, 5, 4, 3, 2]);

        expect(second.currentRollContext?.id).not.toBe(firstContext?.id);
        expect(second.currentRollContext?.dice.map((die) => die.value)).toEqual([6, 5, 4, 3, 2]);
        expect(second.currentRollContext).not.toHaveProperty('coveredPreviousRollRef');
        expect(second).not.toHaveProperty('rollContextRecovery');
    });

    it('修改主骰会同步更新当前骰区', () => {
        const rolled = roll(createCore(), [1, 2, 3, 4, 5]);
        const modified = reduce(rolled, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 1,
                newValue: 6,
                playerId: '0',
                ownerId: '0',
                target: 'activeDie',
            },
            timestamp: 2,
        } as DiceThroneEvent);

        expect(modified.dice[0].value).toBe(6);
        expect(modified.currentRollContext?.dice[0]?.value).toBe(6);
    });

    it('可改奖励骰会覆盖主骰当前区，后续改骰不会误改旧主骰', () => {
        const rolled = roll(createCore(), [1, 2, 3, 4, 5]);
        const rolledContextId = rolled.currentRollContext?.id;

        const bonusOpened = reduce(rolled, {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement: createBonusSettlement() },
            timestamp: 3,
        } as DiceThroneEvent);

        expect(bonusOpened.currentRollContext).toMatchObject({
            id: 'bonus:bonus-test-1',
            kind: 'bonus',
            ownerPlayerId: '0',
            targetPlayerId: '1',
        });
        expect(bonusOpened.currentRollContext).not.toHaveProperty('coveredPreviousRollRef');
        expect(bonusOpened).not.toHaveProperty('rollContextRecovery');
        expect(bonusOpened.currentRollContext?.dice.map((die) => die.value)).toEqual([3]);

        const modified = reduce(bonusOpened, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 3,
                newValue: 5,
                playerId: '0',
                ownerId: '0',
                target: 'pendingBonusDie',
            },
            timestamp: 4,
        } as DiceThroneEvent);

        expect(modified.pendingBonusDiceSettlement?.dice[0]?.value).toBe(5);
        expect(modified.currentRollContext?.dice[0]?.value).toBe(5);
        expect(modified.dice[0].value).toBe(1);
    });

    it('奖励骰结算后保留最终骰面为右侧骰盘的只读回看，直到下一次投掷覆盖它', () => {
        const settlement: PendingBonusDiceSettlement = {
            ...createBonusSettlement(),
            dice: [
                ...createBonusSettlement().dice,
                { index: 1, value: 4, face: 'sabre', effectParams: { value: 4 } },
            ],
        };
        const opened = reduce(createCore(), {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement },
            timestamp: 3,
        } as DiceThroneEvent);
        const modified = reduce(opened, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 3,
                newValue: 6,
                playerId: '0',
                ownerId: '0',
                target: 'pendingBonusDie',
            },
            timestamp: 4,
        } as DiceThroneEvent);

        const settled = reduce(modified, {
            type: 'BONUS_DICE_SETTLED',
            payload: { displayOnly: true },
            timestamp: 5,
        } as DiceThroneEvent);

        expect(settled.pendingBonusDiceSettlement).toBeUndefined();
        expect(settled.currentRollContext).toMatchObject({
            id: 'bonus:bonus-test-1',
            kind: 'bonus',
            status: 'settled',
            display: { replayOnly: true },
            dice: [{ value: 6 }, { value: 4 }],
        });
    });

    it('奖励骰被新投掷覆盖后，旧奖励骰字段不再是可操作当前骰', () => {
        const rolled = roll(createCore(), [1, 2, 3, 4, 5]);
        const bonusOpened = reduce(rolled, {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement: createBonusSettlement() },
            timestamp: 3,
        } as DiceThroneEvent);

        const covered = roll(bonusOpened, [6, 5, 4, 3, 2]);

        expect(covered.pendingBonusDiceSettlement?.id).toBe('bonus-test-1');
        expect(covered.currentRollContext).toMatchObject({
            kind: 'offensive',
            dice: [{ value: 6 }, { value: 5 }, { value: 4 }, { value: 3 }, { value: 2 }],
        });
        expect(covered.currentRollContext).not.toHaveProperty('coveredPreviousRollRef');
        expect(covered).not.toHaveProperty('rollContextRecovery');
        expect(validateCommand(covered, {
            type: 'SKIP_BONUS_DICE_REROLL',
            playerId: '0',
            payload: {},
        } as any, 'main1').valid).toBe(false);
        expect(validateCommand(covered, {
            type: 'REROLL_BONUS_DIE',
            playerId: '0',
            payload: { dieIndex: 0 },
        } as any, 'main1').valid).toBe(false);

        const modified = reduce(covered, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 3,
                newValue: 5,
                playerId: '0',
                ownerId: '0',
                target: 'pendingBonusDie',
            },
            timestamp: 4,
        } as DiceThroneEvent);

        expect(modified.pendingBonusDiceSettlement?.dice[0]?.value).toBe(3);
        expect(modified.currentRollContext?.kind).toBe('offensive');
        expect(modified.currentRollContext?.dice[0]?.value).toBe(6);
    });

    it('当前可改奖励骰允许在主要阶段打出改骰牌', () => {
        const opened = reduce(createCore(), {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement: createBonusSettlement() },
            timestamp: 3,
        } as DiceThroneEvent);
        const playSix = COMMON_CARDS.find((card) => card.id === 'card-play-six');

        expect(playSix).toBeDefined();
        if (!playSix) return;

        expect(opened.currentRollContext).toMatchObject({
            kind: 'bonus',
            policy: { allowRollCards: true },
        });
        expect(checkPlayCard(opened, '0', playSix, 'main1')).toEqual({ ok: true });
    });

    it('新投掷覆盖后不产生无规则来源的玩家恢复步骤', () => {
        const first = roll(createCore(), [1, 2, 3, 4, 5]);
        const covered = roll(first, [6, 5, 4, 3, 2]);
        expect(covered.currentRollContext?.id).not.toBe(first.currentRollContext?.id);
        expect(covered.currentRollContext?.dice.map((die) => die.value)).toEqual([6, 5, 4, 3, 2]);
        expect(covered.currentRollContext).not.toHaveProperty('coveredPreviousRollRef');
        expect(covered).not.toHaveProperty('rollContextRecovery');
    });

    it('终极成功发动后的结算骰会进入当前骰区但禁止改骰和重掷', () => {
        const settlement: PendingBonusDiceSettlement = {
            ...createBonusSettlement(),
            id: 'ultimate-roll-test',
            allowDiceModification: false,
            ultimateLocked: true,
            rerollCostTokenId: TOKEN_IDS.TACTICAL_ADVANTAGE,
            rerollCostAmount: 1,
            maxRerollCount: 1,
        };
        const opened = reduce({ ...createCore(), rollCount: 1 }, {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement },
            timestamp: 3,
        } as DiceThroneEvent);

        expect(opened.currentRollContext).toMatchObject({
            id: 'bonus:ultimate-roll-test',
            kind: 'bonus',
            status: 'locked',
            policy: {
                modifiableBy: 'none',
                rerollableBy: 'none',
                allowPassiveReroll: false,
                allowRollCards: false,
                ultimateLocked: true,
            },
        });
        expect(validateCommand(opened, {
            type: 'REROLL_BONUS_DIE',
            playerId: '0',
            payload: { dieIndex: 0 },
        } as any, 'main1')).toMatchObject({ valid: false, error: 'dice_locked' });
        expect(validateCommand(opened, {
            type: 'MODIFY_DIE',
            playerId: '0',
            payload: { dieId: 0, newValue: 6 },
        } as any, 'main1', {
            id: 'ultimate-roll-modify',
            playerId: '0',
            sourceCardId: 'card-test',
            type: 'modifyDie',
            titleKey: 'interaction.selectDieToModify',
            selectCount: 1,
            selected: [],
            allowedDieIds: [0],
        } as any)).toMatchObject({ valid: false, error: 'dice_locked' });
        expect(validateCommand(opened, {
            type: 'SKIP_BONUS_DICE_REROLL',
            playerId: '0',
            payload: {},
        } as any, 'main1').valid).toBe(true);

        const playSix = COMMON_CARDS.find((card) => card.id === 'card-play-six');
        expect(playSix).toBeDefined();
        if (!playSix) return;
        expect(checkPlayCard(opened, '0', playSix, 'offensiveRoll')).toMatchObject({
            ok: false,
            reason: 'rollContextLocked',
        });
    });

    it('战术家的战术优势可在非投掷阶段重掷当前奖励骰', () => {
        const rolled = roll(createCore(), [1, 2, 3, 4, 5]);
        const bonusOpened = reduce(rolled, {
            type: 'BONUS_DICE_REROLL_REQUESTED',
            payload: { settlement: createBonusSettlement() },
            timestamp: 3,
        } as DiceThroneEvent);

        expect(isPassiveActionUsable(
            bonusOpened,
            '0',
            'zhanshujia-tactical-advantage',
            1,
            'main1',
        )).toBe(true);

        const events = execute(
            { core: bonusOpened, sys: { phase: 'main1' } } as MatchState<DiceThroneCore>,
            {
                type: 'USE_PASSIVE_ABILITY',
                playerId: '0',
                payload: {
                    passiveId: 'zhanshujia-tactical-advantage',
                    actionIndex: 1,
                    targetDieId: 0,
                },
            } as any,
            queuedRandom([6]),
        );
        const rerolled = events.find((event) => event.type === 'DIE_REROLLED');

        expect(rerolled).toMatchObject({
            payload: {
                dieId: 0,
                oldValue: 3,
                newValue: 6,
                target: 'pendingBonusDie',
            },
        });

        const afterReroll = events.reduce((current, event) => reduce(current, event), bonusOpened);
        expect(afterReroll.pendingBonusDiceSettlement?.dice[0]?.value).toBe(6);
        expect(afterReroll.currentRollContext?.dice[0]?.value).toBe(6);
        expect(afterReroll.dice[0].value).toBe(1);
    });

    it('闪避骰进入当前骰区后，战术家重掷会重新决定免伤结果', () => {
        let state = createCore();
        state.players['1'].passiveAbilities = ZHANSHUJIA_PASSIVE_ABILITIES;
        state.players['1'].tokens[TOKEN_IDS.TACTICAL_ADVANTAGE] = 1;
        state.pendingDamage = {
            id: 'damage-evasion-test',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 5,
            currentDamage: 5,
            responseType: 'beforeDamageReceived',
            responderId: '1',
            isFullyEvaded: false,
        };

        state = reduce(state, {
            type: 'TOKEN_USED',
            payload: {
                playerId: '1',
                tokenId: TOKEN_IDS.EVASIVE,
                amount: 1,
                effectType: 'evasionAttempt',
                evasionRoll: { value: 1, success: true },
            },
            timestamp: 5,
        } as DiceThroneEvent);

        expect(state.currentRollContext).toMatchObject({
            kind: 'evasion',
            ownerPlayerId: '1',
            targetPlayerId: '1',
            sourceTokenId: TOKEN_IDS.EVASIVE,
            dice: [{ id: 0, definitionId: 'monk-dice', value: 1 }],
        });
        expect(state.pendingDamage?.isFullyEvaded).toBe(true);
        expect(state.pendingDamage?.currentDamage).toBe(0);

        const events = execute(
            { core: state, sys: { phase: 'main1' } } as MatchState<DiceThroneCore>,
            {
                type: 'USE_PASSIVE_ABILITY',
                playerId: '1',
                payload: {
                    passiveId: 'zhanshujia-tactical-advantage',
                    actionIndex: 1,
                    targetDieId: 0,
                },
            } as any,
            queuedRandom([6]),
        );
        const afterReroll = events.reduce((current, event) => reduce(current, event), state);

        expect(events.find((event) => event.type === 'DIE_REROLLED')).toMatchObject({
            payload: { target: 'evasionDie', newValue: 6 },
        });
        expect(afterReroll.currentRollContext?.dice[0]?.value).toBe(6);
        expect(afterReroll.pendingDamage?.isFullyEvaded).toBe(false);
        expect(afterReroll.pendingDamage?.currentDamage).toBe(5);
    });

    it('目标骰与技能 rollDie 都覆盖为唯一当前骰区', () => {
        const targetingState: DiceThroneCore = {
            ...createCore(),
            dice: [createDie(0)],
            rollDiceCount: 1,
        };
        const targetingRolled = reduce(targetingState, {
            type: 'DICE_ROLLED',
            payload: { results: [6], rollerId: '0', phase: 'targetingRoll' },
            timestamp: 6,
        } as DiceThroneEvent);

        expect(targetingRolled.currentRollContext).toMatchObject({
            kind: 'targeting',
            ownerPlayerId: '0',
            phase: 'targetingRoll',
            dice: [{ id: 0, value: 6 }],
        });

        const rollDieEvents = resolveEffectsToEvents([
            {
                action: {
                    type: 'rollDie',
                    target: 'self',
                    diceCount: 1,
                    conditionalEffects: [{ face: 'sabre', bonusDamage: 2, effectKey: 'bonusDie.effect.sabre' }],
                },
                timing: 'immediate',
            },
        ] as any, 'immediate', {
            attackerId: '0',
            defenderId: '1',
            sourceAbilityId: 'roll-context-test',
            state: targetingRolled,
            damageDealt: 0,
            timestamp: 7,
        }, { random: queuedRandom([2]) });
        const rollDieOpened = rollDieEvents.reduce((state, event) => reduce(state, event), targetingRolled);

        expect(rollDieOpened.currentRollContext).toMatchObject({
            kind: 'bonus',
            ownerPlayerId: '0',
            sourceAbilityId: 'roll-context-test',
            dice: [{ id: 0, value: 2 }],
        });
        expect(rollDieOpened.currentRollContext).not.toHaveProperty('coveredPreviousRollRef');
        expect(rollDieOpened).not.toHaveProperty('rollContextRecovery');
    });

    it('策略声明任意人可改的闪避骰允许响应方修改', () => {
        const state: DiceThroneCore = {
            ...createCore(),
            currentRollContext: createEvasionRollContext({
                ownerPlayerId: '1',
                diceDefinitionId: 'monk-dice',
                targetPlayerId: '1',
                sourceTokenId: TOKEN_IDS.EVASIVE,
                value: 1,
                successRange: [1, 2],
                damageBeforeEvasion: 5,
                pendingDamageId: 'damage-any-modify',
            }),
        };
        const responseModifyInteraction = {
            id: 'response-modify-evasion',
            playerId: '0',
            sourceCardId: 'card-test',
            type: 'modifyDie',
            titleKey: 'interaction.selectDieToModify',
            selectCount: 1,
            selected: [],
            allowedDieIds: [0],
        } as any;

        expect(validateCommand(state, {
            type: 'MODIFY_DIE',
            playerId: '0',
            payload: { dieId: 0, newValue: 6 },
        } as any, 'main1', responseModifyInteraction)).toEqual({ valid: true });
    });

    it('2v2 当前骰区的队友与对手被动重掷权限都由同一策略裁决', () => {
        const context = createEvasionRollContext({
            ownerPlayerId: '0',
            diceDefinitionId: 'zhanshujia-dice',
            targetPlayerId: '1',
            sourceTokenId: TOKEN_IDS.EVASIVE,
            value: 1,
            successRange: [1, 2],
            damageBeforeEvasion: 5,
            pendingDamageId: 'damage-allies-policy',
        });
        const state: DiceThroneCore = {
            ...createCore(),
            players: {
                '0': createHero('0', true),
                '1': createHero('1', true),
                '2': createHero('2', true),
                '3': createHero('3'),
            },
            selectedCharacters: { '0': 'zhanshujia', '1': 'monk', '2': 'monk', '3': 'monk' },
            readyPlayers: { '0': true, '1': true, '2': true, '3': true },
            seatingOrder: ['0', '1', '2', '3'],
            teamIdByPlayerId: { '0': 'A', '1': 'B', '2': 'A', '3': 'B' },
            currentRollContext: {
                ...context,
                policy: { ...context.policy, rerollableBy: 'allies' },
            },
        };

        expect(isPassiveActionUsable(state, '2', 'zhanshujia-tactical-advantage', 1, 'main1')).toBe(true);
        expect(isPassiveActionUsable(state, '1', 'zhanshujia-tactical-advantage', 1, 'main1')).toBe(false);
    });

    it('枪手摊牌会先进入 compare 当前骰区，确认时按修改后的骰面决定胜负', () => {
        const handler = getCustomActionHandler('gunslinger-showdown-bonus');
        expect(handler).toBeDefined();
        if (!handler) return;

        const events = handler({
            ctx: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'showdown',
                state: createCore(),
                damageDealt: 4,
                timestamp: 10,
            },
            attackerId: '0',
            targetId: '1',
            sourceAbilityId: 'showdown',
            state: createCore(),
            damageDealt: 4,
            timestamp: 10,
            random: queuedRandom([2, 5]),
            action: {
                type: 'custom',
                target: 'self',
                customActionId: 'gunslinger-showdown-bonus',
                params: { amount: 2 },
            },
        } as any);

        const opened = events.reduce((current, event) => reduce(current, event), createCore());

        expect(opened.currentRollContext).toMatchObject({
            kind: 'compare',
            ownerPlayerId: '0',
            targetPlayerId: '1',
            sourceAbilityId: 'showdown',
            dice: [
                { id: 0, value: 2, ownerId: '0' },
                { id: 1, value: 5, ownerId: '1' },
            ],
            settlement: {
                mode: 'compare',
                metadata: {
                    compareKind: 'gunslingerShowdown',
                    bonusDamageOnWin: 2,
                },
            },
        });

        const modified = reduce(opened, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 2,
                newValue: 6,
                playerId: '0',
                ownerId: '0',
                target: 'activeDie',
            },
            timestamp: 11,
        } as DiceThroneEvent);

        const confirmEvents = execute(
            { core: modified, sys: { phase: 'main1' } } as MatchState<DiceThroneCore>,
            {
                type: 'CONFIRM_COMPARE_ROLL',
                playerId: '0',
                payload: {},
            } as any,
            queuedRandom([]),
        );

        expect(confirmEvents).toContainEqual(expect.objectContaining({
            type: 'CHOICE_REQUESTED',
            payload: expect.objectContaining({
                sourceAbilityId: 'showdown',
                compareRoll: expect.objectContaining({
                    contestants: [
                        expect.objectContaining({ playerId: '0', roll: 6 }),
                        expect.objectContaining({ playerId: '1', roll: 5 }),
                    ],
                    resultTextKey: 'compareRoll.gunslingerShowdown.win',
                    confirmValue: { value: 2, customId: 'gunslinger-showdown-apply-bonus' },
                }),
            }),
        }));
    });

    it('枪手对决会先进入 compare 当前骰区，确认时按修改后的骰面决定胜负', () => {
        const handler = getCustomActionHandler('gunslinger-duel-resolve');
        expect(handler).toBeDefined();
        if (!handler) return;

        const baseState: DiceThroneCore = {
            ...createCore(),
            activePlayerId: '1',
            rollDiceCount: 1,
            dice: [createDie(0, 2), ...[1, 2, 3, 4].map((id) => createDie(id, 1))],
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'revolver',
                defenseAbilityId: 'duel',
                isDefendable: true,
            },
        };
        baseState.dice[0] = { ...baseState.dice[0], ownerId: '1' };
        baseState.currentRollContext = createMainRollContext(baseState, {
            phase: 'defensiveRoll',
            ownerPlayerId: '1',
            dice: [
                baseState.dice[0],
                { ...createDie(1, 5), ownerId: '0' },
            ],
        });

        const events = handler({
            ctx: {
                attackerId: '1',
                defenderId: '0',
                sourceAbilityId: 'duel',
                state: baseState,
                damageDealt: 0,
                timestamp: 20,
            },
            attackerId: '1',
            targetId: '0',
            sourceAbilityId: 'duel',
            state: baseState,
            damageDealt: 0,
            timestamp: 20,
            random: queuedRandom([]),
            action: {
                type: 'custom',
                target: 'self',
                customActionId: 'gunslinger-duel-resolve',
            },
        } as any);

        const opened = events.reduce((current, event) => reduce(current, event), baseState);

        expect(opened.currentRollContext).toMatchObject({
            kind: 'compare',
            ownerPlayerId: '1',
            targetPlayerId: '0',
            sourceAbilityId: 'duel',
            dice: [
                { id: 0, value: 2, ownerId: '1' },
                { id: 1, value: 5, ownerId: '0' },
            ],
            settlement: {
                mode: 'compare',
                metadata: {
                    compareKind: 'gunslingerDuel',
                    winOnTie: false,
                },
            },
        });

        const modified = reduce(opened, {
            type: 'DIE_MODIFIED',
            payload: {
                dieId: 0,
                oldValue: 2,
                newValue: 6,
                playerId: '1',
                ownerId: '1',
                target: 'activeDie',
            },
            timestamp: 21,
        } as DiceThroneEvent);

        const confirmEvents = execute(
            { core: modified, sys: { phase: 'defensiveRoll' } } as MatchState<DiceThroneCore>,
            {
                type: 'CONFIRM_COMPARE_ROLL',
                playerId: '1',
                payload: {},
            } as any,
            queuedRandom([]),
        );

        expect(confirmEvents).toContainEqual(expect.objectContaining({
            type: 'CHOICE_REQUESTED',
            payload: expect.objectContaining({
                playerId: '1',
                sourceAbilityId: 'duel',
                titleKey: 'choices.gunslingerDuel.title',
                options: [
                    expect.objectContaining({ customId: 'gunslinger-duel-deal-3' }),
                    expect.objectContaining({ customId: 'gunslinger-duel-prevent-half' }),
                ],
                compareRoll: expect.objectContaining({
                    contestants: [
                        expect.objectContaining({ playerId: '1', roll: 6 }),
                        expect.objectContaining({ playerId: '0', roll: 5 }),
                    ],
                    resultTextKey: 'compareRoll.gunslingerDuel.win',
                    resultTone: 'success',
                }),
            }),
        }));
    });
});
