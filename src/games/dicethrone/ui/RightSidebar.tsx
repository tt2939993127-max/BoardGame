import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AbilityCard, Die, TurnPhase } from '../types';
import { DiceActions, DiceTray } from './DiceTray';
import { DiscardPile } from './DiscardPile';
import type { CardAtlasConfig } from './cardAtlas';

export const RightSidebar = ({
    dice,
    rollCount,
    rollLimit,
    rollConfirmed,
    currentPhase,
    canInteractDice,
    isRolling,
    setIsRolling,
    locale,
    onToggleLock,
    onRoll,
    onConfirm,
    showAdvancePhaseButton,
    advanceLabel,
    isAdvanceButtonEnabled,
    onAdvance,
    discardPileRef,
    discardCards,
    cardAtlas,
    onInspectCard,
    canUndoDiscard,
    onUndoDiscard,
    discardHighlighted,
    sellButtonVisible,
}: {
    dice: Die[];
    rollCount: number;
    rollLimit: number;
    rollConfirmed: boolean;
    currentPhase: TurnPhase;
    canInteractDice: boolean;
    isRolling: boolean;
    setIsRolling: Dispatch<SetStateAction<boolean>>;
    locale?: string;
    onToggleLock: (id: number) => void;
    onRoll: () => void;
    onConfirm: () => void;
    showAdvancePhaseButton: boolean;
    advanceLabel: string;
    isAdvanceButtonEnabled: boolean;
    onAdvance: () => void;
    discardPileRef: RefObject<HTMLDivElement | null>;
    discardCards: AbilityCard[];
    cardAtlas?: CardAtlasConfig;
    onInspectCard?: (card: AbilityCard) => void;
    canUndoDiscard: boolean;
    onUndoDiscard: () => void;
    discardHighlighted: boolean;
    sellButtonVisible: boolean;
}) => {

    return (
        <div className="absolute right-[1.5vw] top-0 bottom-[1.5vw] w-[15vw] flex flex-col items-center pointer-events-auto z-[60]">
            <div className="flex-grow" />
            <div className="w-full flex flex-col items-center gap-[0.75vw]">
                <DiceTray
                    dice={dice}
                    onToggleLock={(id) => {
                        if (!canInteractDice) return;
                        onToggleLock(id);
                    }}
                    currentPhase={currentPhase}
                    canInteract={canInteractDice}
                    isRolling={isRolling}
                    locale={locale}
                />
                <DiceActions
                    rollCount={rollCount}
                    rollLimit={rollLimit}
                    rollConfirmed={rollConfirmed}
                    onRoll={onRoll}
                    onConfirm={onConfirm}
                    currentPhase={currentPhase}
                    canInteract={canInteractDice}
                    isRolling={isRolling}
                    setIsRolling={setIsRolling}
                />
                {showAdvancePhaseButton && (
                    <div className="w-full flex justify-center">
                        <button
                            onClick={onAdvance}
                            className={`w-[10.2vw] py-[0.7vw] rounded-[0.6vw] font-bold text-[0.75vw] uppercase tracking-wider transition-[background-color,color] duration-200 ${isAdvanceButtonEnabled ? 'bg-slate-800 text-amber-200 border border-amber-500/60 hover:bg-amber-600 hover:text-white' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                        >{advanceLabel}</button>
                    </div>
                )}
                <div className="w-[10.2vw] flex justify-center">
                    <DiscardPile
                        ref={discardPileRef}
                        cards={discardCards}
                        locale={locale}
                        atlas={cardAtlas}
                        onInspect={onInspectCard}
                        canUndo={canUndoDiscard}
                        onUndo={onUndoDiscard}
                        isHighlighted={discardHighlighted}
                        showSellButton={sellButtonVisible}
                    />
                </div>
            </div>
        </div>
    );
};
