/**
 * DiceThrone Move 映射与解析
 * 从 Board.tsx 提取
 */

export type DiceThroneMoveMap = {
    advancePhase: () => void;
    rollDice: () => void;
    toggleDieLock: (id: number) => void;
    confirmRoll: () => void;
    selectAbility: (abilityId: string) => void;
    playCard: (cardId: string) => void;
    sellCard: (cardId: string) => void;
    undoSellCard?: () => void;
    resolveChoice: (statusId: string) => void;
    responsePass: (forPlayerId?: string) => void;
    // 卡牌交互相关
    modifyDie: (dieId: number, newValue: number) => void;
    rerollDie: (dieId: number) => void;
    removeStatus: (targetPlayerId: string, statusId?: string) => void;
    transferStatus: (fromPlayerId: string, toPlayerId: string, statusId: string) => void;
    confirmInteraction: (interactionId: string, selectedDiceIds?: number[]) => void;
    cancelInteraction: () => void;
    // Token 响应相关
    useToken: (tokenId: string, amount: number) => void;
    skipTokenResponse: () => void;
    usePurify: (statusId: string) => void;
    // 击倒移除
    payToRemoveKnockdown: () => void;
    // 奖励骰重掷
    rerollBonusDie: (dieIndex: number) => void;
    skipBonusDiceReroll: () => void;
    // 选角相关
    selectCharacter: (characterId: string) => void;
    hostStartGame: () => void;
    playerReady: () => void;
};

const requireMove = <T extends (...args: unknown[]) => void>(value: unknown, name: string): T => {
    if (typeof value !== 'function') {
        throw new Error(`[DiceThroneBoard] 缺少 move: ${name}`);
    }
    return value as T;
};

export const resolveMoves = (raw: Record<string, unknown>): DiceThroneMoveMap => {
    // 统一把 payload 包装成领域命令结构，避免 die_not_found 等校验失败
    const advancePhase = requireMove(raw.advancePhase ?? raw.ADVANCE_PHASE, 'advancePhase');
    const rollDice = requireMove(raw.rollDice ?? raw.ROLL_DICE, 'rollDice');
    const toggleDieLock = requireMove(raw.toggleDieLock ?? raw.TOGGLE_DIE_LOCK, 'toggleDieLock');
    const confirmRoll = requireMove(raw.confirmRoll ?? raw.CONFIRM_ROLL, 'confirmRoll');
    const selectAbility = requireMove(raw.selectAbility ?? raw.SELECT_ABILITY, 'selectAbility');
    const playCard = requireMove(raw.playCard ?? raw.PLAY_CARD, 'playCard');
    const sellCard = requireMove(raw.sellCard ?? raw.SELL_CARD, 'sellCard');
    const undoSellCardRaw = (raw.undoSellCard ?? raw.UNDO_SELL_CARD) as ((payload?: unknown) => void) | undefined;
    const resolveChoice = requireMove(raw.resolveChoice ?? raw.RESOLVE_CHOICE, 'resolveChoice');

    const responsePassRaw = (raw.responsePass ?? raw.RESPONSE_PASS) as ((payload?: unknown) => void) | undefined;
    // 卡牌交互 moves
    const modifyDieRaw = (raw.modifyDie ?? raw.MODIFY_DIE) as ((payload: unknown) => void) | undefined;
    const rerollDieRaw = (raw.rerollDie ?? raw.REROLL_DIE) as ((payload: unknown) => void) | undefined;
    const removeStatusRaw = (raw.removeStatus ?? raw.REMOVE_STATUS) as ((payload: unknown) => void) | undefined;
    const transferStatusRaw = (raw.transferStatus ?? raw.TRANSFER_STATUS) as ((payload: unknown) => void) | undefined;
    const confirmInteractionRaw = (raw.confirmInteraction ?? raw.CONFIRM_INTERACTION) as ((payload: unknown) => void) | undefined;
    const cancelInteractionRaw = (raw.cancelInteraction ?? raw.CANCEL_INTERACTION) as ((payload: unknown) => void) | undefined;
    // Token 响应 moves
    const useTokenRaw = (raw.useToken ?? raw.USE_TOKEN) as ((payload: unknown) => void) | undefined;
    const skipTokenResponseRaw = (raw.skipTokenResponse ?? raw.SKIP_TOKEN_RESPONSE) as ((payload: unknown) => void) | undefined;
    const usePurifyRaw = (raw.usePurify ?? raw.USE_PURIFY) as ((payload: unknown) => void) | undefined;
    const payToRemoveKnockdownRaw = (raw.payToRemoveKnockdown ?? raw.PAY_TO_REMOVE_KNOCKDOWN) as ((payload: unknown) => void) | undefined;
    // 奖励骰重掷 moves
    const rerollBonusDieRaw = (raw.rerollBonusDie ?? raw.REROLL_BONUS_DIE) as ((payload: unknown) => void) | undefined;
    const skipBonusDiceRerollRaw = (raw.skipBonusDiceReroll ?? raw.SKIP_BONUS_DICE_REROLL) as ((payload: unknown) => void) | undefined;
    const selectCharacterRaw = (raw.selectCharacter ?? raw.SELECT_CHARACTER) as ((payload: unknown) => void) | undefined;
    const hostStartGameRaw = (raw.hostStartGame ?? raw.HOST_START_GAME) as ((payload: unknown) => void) | undefined;
    const playerReadyRaw = (raw.playerReady ?? raw.PLAYER_READY) as ((payload: unknown) => void) | undefined;

    return {
        advancePhase: () => advancePhase({}),
        rollDice: () => rollDice({}),
        toggleDieLock: (id) => toggleDieLock({ dieId: id }),
        confirmRoll: () => confirmRoll({}),
        selectAbility: (abilityId) => selectAbility({ abilityId }),
        playCard: (cardId) => playCard({ cardId }),
        sellCard: (cardId) => sellCard({ cardId }),
        undoSellCard: undoSellCardRaw ? () => undoSellCardRaw({}) : undefined,
        resolveChoice: (statusId) => resolveChoice({ statusId }),
        responsePass: (forPlayerId) => responsePassRaw?.(forPlayerId ? { forPlayerId } : {}),
        // 卡牌交互
        modifyDie: (dieId, newValue) => modifyDieRaw?.({ dieId, newValue }),
        rerollDie: (dieId) => rerollDieRaw?.({ dieId }),
        removeStatus: (targetPlayerId, statusId) => removeStatusRaw?.({ targetPlayerId, statusId }),
        transferStatus: (fromPlayerId, toPlayerId, statusId) => transferStatusRaw?.({ fromPlayerId, toPlayerId, statusId }),
        confirmInteraction: (interactionId, selectedDiceIds) => confirmInteractionRaw?.({ interactionId, selectedDiceIds }),
        cancelInteraction: () => cancelInteractionRaw?.({}),
        // Token 响应
        useToken: (tokenId, amount) => useTokenRaw?.({ tokenId, amount }),
        skipTokenResponse: () => skipTokenResponseRaw?.({}),
        usePurify: (statusId) => usePurifyRaw?.({ statusId }),
        // 击倒移除
        payToRemoveKnockdown: () => payToRemoveKnockdownRaw?.({}),
        // 奖励骰重掷
        rerollBonusDie: (dieIndex) => rerollBonusDieRaw?.({ dieIndex }),
        skipBonusDiceReroll: () => skipBonusDiceRerollRaw?.({}),
        selectCharacter: (characterId) => selectCharacterRaw?.({ characterId }),
        hostStartGame: () => hostStartGameRaw?.({}),
        playerReady: () => playerReadyRaw?.({}),
    };
};
