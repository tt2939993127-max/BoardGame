import type { PlayerId } from '../../../engine/types';
import type { TurnPhase } from '../domain/types';

export interface CanPlayHandCardsForCurrentBoardParams {
    isSpectator: boolean;
    isActivePlayer: boolean;
    isResponder: boolean;
    isDirectDiceActor: boolean;
    currentPhase: TurnPhase;
    rootPid: PlayerId;
    rollerId?: PlayerId;
}

export interface CanInteractHandForCurrentBoardParams {
    isSpectator: boolean;
}

export const canInteractHandForCurrentBoard = ({
    isSpectator,
}: CanInteractHandForCurrentBoardParams): boolean => !isSpectator;

export const canPlayHandCardsForCurrentBoard = ({
    isSpectator,
}: CanPlayHandCardsForCurrentBoardParams): boolean => {
    // 即时牌可以在任意时机尝试打出；实际时机、目标和响应者资格统一由领域层
    // checkPlayCard 裁定。这里不能因“不是当前回合”把整只手牌提前封死。
    return !isSpectator;
};

export const canSellHandCardsForCurrentBoard = ({
    isSpectator,
    isActivePlayer,
}: Pick<CanPlayHandCardsForCurrentBoardParams, 'isSpectator' | 'isActivePlayer'>): boolean => (
    !isSpectator && isActivePlayer
);
