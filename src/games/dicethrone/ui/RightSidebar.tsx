import React, { useMemo } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointerClick } from 'lucide-react';
import type { AbilityCard, Die, PlayerId, TurnPhase } from '../types';
import type { InteractionDescriptor } from '../../../engine/systems/InteractionSystem';
import type { MultistepChoiceData } from '../../../engine/systems/InteractionSystem';
import { useMultistepInteraction } from '../../../engine/systems/useMultistepInteraction';
import type { DiceModifyResult, DiceModifyStep, DiceSelectResult, DiceSelectStep } from '../domain/systems';
import {
    diceModifyReducer, diceModifyToCommands,
    diceSelectReducer, diceSelectToCommands,
} from '../domain/systems';
import { DiceActions, DiceTray, getDtMeta } from './DiceTray';
import { DiscardPile } from './DiscardPile';
import { GameButton } from './components/GameButton';
import { UI_Z_INDEX } from '../../../core';
import { ActiveModifierBadge } from './ActiveModifierBadge';
import type { ActiveModifier } from '../hooks/useActiveModifiers';
import { PassiveAbilityPanel, type PassiveAbilityPanelProps } from './PassiveAbilityPanel';
import { buildRuntimeInlineUnitValue } from '../../mobileSupport';

export const RightSidebar = ({
    dice,
    rollCount,
    rollLimit,
    rollConfirmed,
    currentPhase,
    canInteractDice,
    isRolling,
    setIsRolling,
    rerollingDiceIds,
    setRerollingDiceIds,
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
    onInspectRecentCards,
    canUndoDiscard,
    onUndoDiscard,
    discardHighlighted,
    sellButtonVisible,
    interaction,
    dispatch,
    activeModifiers,
    attackModifierBonusDamage,
    passiveAbilityProps,
    rootPlayerId,
    teamIdByPlayerId,
}: {
    dice: Die[];
    rollCount: number;
    rollLimit: number;
    rollConfirmed: boolean;
    currentPhase: TurnPhase;
    canInteractDice: boolean;
    isRolling: boolean;
    setIsRolling: (isRolling: boolean) => void;
    rerollingDiceIds?: number[];
    setRerollingDiceIds: (ids: number[]) => void;
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
    onInspectRecentCards?: (cards: AbilityCard[]) => void;
    canUndoDiscard: boolean;
    onUndoDiscard: () => void;
    discardHighlighted: boolean;
    sellButtonVisible: boolean;
    interaction?: InteractionDescriptor;
    dispatch: (type: string, payload?: unknown) => void;
    activeModifiers?: ActiveModifier[];
    attackModifierBonusDamage?: number;
    passiveAbilityProps?: Omit<PassiveAbilityPanelProps, never> | null;
    rootPlayerId: PlayerId;
    teamIdByPlayerId?: Record<PlayerId, string>;
}) => {
    const inlineUnit = buildRuntimeInlineUnitValue;
    const isDiceMultistep = interaction?.kind === 'multistep-choice' &&
        ((interaction.data as any)?.meta?.dtType === 'modifyDie' ||
         (interaction.data as any)?.meta?.dtType === 'selectDie');

    const diceInteraction = useMemo(() => {
        if (!isDiceMultistep || !interaction) return undefined;
        const data = interaction.data as MultistepChoiceData<DiceModifyStep | DiceSelectStep, DiceModifyResult | DiceSelectResult>;
        if (typeof data?.localReducer === 'function' && typeof data?.toCommands === 'function') {
            return interaction as InteractionDescriptor<MultistepChoiceData<DiceModifyStep | DiceSelectStep, DiceModifyResult | DiceSelectResult>>;
        }
        const meta = (data as any)?.meta;
        if (!meta) return undefined;
        let hydratedData: MultistepChoiceData<DiceModifyStep | DiceSelectStep, DiceModifyResult | DiceSelectResult>;
        if (meta.dtType === 'modifyDie') {
            const config = meta.dieModifyConfig;
            const isManualConfirmMode = config?.mode === 'any' || config?.mode === 'adjust';
            hydratedData = {
                ...data,
                initialResult: data.initialResult ?? { modifications: {}, modCount: 0, totalAdjustment: 0 },
                localReducer: (current: any, step: any) => diceModifyReducer(current, step, config),
                toCommands: diceModifyToCommands as any,
                maxSteps: isManualConfirmMode ? undefined : data.maxSteps,
                minSteps: isManualConfirmMode ? 1 : data.minSteps,
            };
        } else {
            hydratedData = {
                ...data,
                initialResult: data.initialResult ?? { selectedDiceIds: [] },
                localReducer: diceSelectReducer as any,
                toCommands: diceSelectToCommands as any,
            };
        }
        return {
            ...interaction,
            data: hydratedData,
        } as InteractionDescriptor<MultistepChoiceData<DiceModifyStep | DiceSelectStep, DiceModifyResult | DiceSelectResult>>;
    }, [isDiceMultistep, interaction]);

    const multistepInteraction = useMultistepInteraction(diceInteraction, dispatch);

    const { t } = useTranslation('game-dicethrone');
    const advanceButtonSizeClassName = '!min-h-0';

    const interactionHint = useMemo(() => {
        if (!isDiceMultistep || !interaction) return null;
        const dtMeta = getDtMeta(interaction);
        if (!dtMeta) return null;

        const isModifyMode = dtMeta.dtType === 'modifyDie';
        const isSelectMode = dtMeta.dtType === 'selectDie';
        const config = isModifyMode ? (dtMeta as any).dieModifyConfig : undefined;
        const mode = config?.mode as string | undefined;

        const result = multistepInteraction?.result as any;
        const modCount = result?.modCount ?? 0;
        const selectCount = result?.selectedDiceIds?.length ?? 0;
        const currentCount = isSelectMode ? selectCount : modCount;
        const maxCount = dtMeta.selectCount ?? 1;

        if (isModifyMode && mode === 'copy') {
            if (currentCount === 0) return t('interaction.hint_copy_step1');
            if (currentCount === 1) {
                const sourceValue = Object.values(result?.modifications ?? {})[0];
                return t('interaction.hint_copy_step2', { value: sourceValue });
            }
            return t('interaction.hint_done');
        }
        if (isModifyMode && mode === 'set') {
            if (currentCount >= maxCount) return t('interaction.hint_done');
            return t('interaction.hint_set', { value: config?.targetValue ?? '?' });
        }
        if (isModifyMode && mode === 'adjust') return t('interaction.hint_adjust');
        if (isModifyMode && mode === 'any') {
            if (currentCount >= maxCount) return t('interaction.hint_done');
            return t('interaction.hint_any');
        }
        if (isSelectMode) {
            if (currentCount >= maxCount) return t('interaction.hint_done');
            let key = dtMeta.targetOpponentDice ? 'interaction.hint_select_opponent' : 'interaction.hint_select';
            if (dtMeta.diceOwnerId) {
                const ownerTeamId = teamIdByPlayerId?.[dtMeta.diceOwnerId];
                const rootTeamId = teamIdByPlayerId?.[rootPlayerId];
                if (dtMeta.diceOwnerId === rootPlayerId) {
                    key = 'interaction.hint_select';
                } else if (ownerTeamId && rootTeamId && ownerTeamId === rootTeamId) {
                    key = 'interaction.hint_select_ally';
                } else {
                    key = 'interaction.hint_select_opponent';
                }
            }
            return t(key, { current: currentCount, max: maxCount });
        }
        return null;
    }, [isDiceMultistep, interaction, multistepInteraction?.result, rootPlayerId, t, teamIdByPlayerId]);

    return (
        <div
            className="absolute top-0 flex flex-col items-center pointer-events-auto"
            style={{
                zIndex: UI_Z_INDEX.hud,
                right: inlineUnit(1.5),
                bottom: inlineUnit(1.5),
                width: inlineUnit(15),
            }}
        >
            <div className="flex-grow" />
            <div className="relative w-full flex flex-col items-center" style={{ gap: inlineUnit(0.75) }}>
                <div className="relative">
                    {(activeModifiers && activeModifiers.length > 0) || (attackModifierBonusDamage && attackModifierBonusDamage > 0) ? (
                        <div
                            className="pointer-events-none absolute left-1/2 bottom-full flex -translate-x-1/2 items-center justify-center whitespace-nowrap"
                            style={{
                                zIndex: UI_Z_INDEX.hint,
                                marginBottom: inlineUnit(0.55),
                                gap: inlineUnit(0.35),
                            }}
                        >
                            {activeModifiers && activeModifiers.length > 0 && (
                                <ActiveModifierBadge
                                    modifiers={activeModifiers}
                                    bonusDamage={attackModifierBonusDamage ?? 0}
                                />
                            )}
                        </div>
                    ) : null}
                    {isDiceMultistep && interactionHint && (
                        <div
                            className="absolute right-full top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                            style={{ marginRight: inlineUnit(0.6) }}
                        >
                            <div
                                className="flex min-w-0 items-center overflow-hidden border border-amber-500/50 bg-amber-950/95 shadow-lg shadow-amber-900/40 backdrop-blur-sm whitespace-nowrap"
                                style={{
                                    maxWidth: inlineUnit(8.8),
                                    gap: inlineUnit(0.4),
                                    borderRadius: inlineUnit(0.5),
                                    paddingLeft: inlineUnit(0.6),
                                    paddingRight: inlineUnit(0.6),
                                    paddingTop: inlineUnit(0.4),
                                    paddingBottom: inlineUnit(0.4),
                                }}
                            >
                                <MousePointerClick
                                    className="text-amber-400 shrink-0"
                                    style={{ width: inlineUnit(1), height: inlineUnit(1) }}
                                />
                                <span
                                    className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-amber-200 font-medium leading-snug"
                                    style={{ fontSize: inlineUnit(0.75) }}
                                >
                                    {interactionHint}
                                </span>
                            </div>
                        </div>
                    )}
                    <DiceTray
                        dice={dice}
                        rollCount={rollCount}
                        onToggleLock={(id) => {
                            if (!canInteractDice) return;
                            onToggleLock(id);
                        }}
                        currentPhase={currentPhase}
                        canInteract={canInteractDice}
                        isRolling={isRolling}
                        rerollingDiceIds={rerollingDiceIds}
                        locale={locale}
                        interaction={isDiceMultistep ? interaction : undefined}
                        multistepInteraction={isDiceMultistep ? multistepInteraction : undefined}
                        isPassiveRerollMode={!!passiveAbilityProps?.rerollSelectingAction}
                    />
                </div>
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
                    interaction={isDiceMultistep ? interaction : undefined}
                    multistepInteraction={isDiceMultistep ? multistepInteraction : undefined}
                    setRerollingDiceIds={setRerollingDiceIds}
                />
                <div className={`w-full flex justify-center ${showAdvancePhaseButton ? '' : 'invisible pointer-events-none'}`}>
                    <GameButton
                        onClick={onAdvance}
                        disabled={!isAdvanceButtonEnabled}
                        variant={isAdvanceButtonEnabled ? "primary" : "secondary"}
                        clickSoundKey={null}
                        className={advanceButtonSizeClassName}
                        size="sm"
                        style={{
                            width: inlineUnit(10.2),
                            height: inlineUnit(2.5),
                            borderRadius: inlineUnit(0.5),
                            paddingLeft: inlineUnit(0.5),
                            paddingRight: inlineUnit(0.5),
                            paddingTop: 0,
                            paddingBottom: 0,
                            fontSize: inlineUnit(0.75),
                        }}
                        data-tutorial-id="advance-phase-button"
                    >
                        {advanceLabel}
                    </GameButton>
                </div>
                {passiveAbilityProps && passiveAbilityProps.passives.length > 0 && (
                    <PassiveAbilityPanel {...passiveAbilityProps} />
                )}
                <div className="flex justify-center" style={{ width: inlineUnit(10.2) }}>
                    <DiscardPile
                        ref={discardPileRef}
                        cards={discardCards}
                        locale={locale}
                        onInspectRecent={onInspectRecentCards}
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
