import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { GameButton } from './components/GameButton';
import type { Die, TurnPhase, PendingInteraction } from '../types';
import { Dice3D } from './Dice3D';

/** 骰子交互模式的配置 */
export interface DiceInteractionConfig {
    /** 当前交互 */
    interaction: PendingInteraction;
    /** 已修改的骰子 ID 列表（用于 any 模式追踪） */
    modifiedDice?: string[];
    /** 累计调整量（用于 adjust 模式） */
    totalAdjustment?: number;
    /** 选择骰子回调 */
    onSelectDie: (dieId: number) => void;
    /** 修改骰子数值回调 */
    onModifyDie: (dieId: number, newValue: number) => void;
    /** 确认交互 */
    onConfirm: () => void;
    /** 取消交互 */
    onCancel: () => void;
}

export const DiceTray = ({
    dice,
    onToggleLock,
    currentPhase: _currentPhase,
    canInteract,
    isRolling,
    rerollingDiceIds,
    locale,
    interactionConfig,
    isPassiveRerollMode,
}: {
    dice: Die[];
    onToggleLock: (id: number) => void;
    currentPhase: TurnPhase;
    canInteract: boolean;
    isRolling: boolean;
    /** 正在重掷的骰子 ID 列表 */
    rerollingDiceIds?: number[];
    locale?: string;
    /** 骰子交互模式配置（有值时进入交互模式） */
    interactionConfig?: DiceInteractionConfig;
    /** 被动重掷选择模式（翡翠色高亮） */
    isPassiveRerollMode?: boolean;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const diceSize = '4vw';
    const interaction = interactionConfig?.interaction;
    const isInteractionMode = Boolean(interaction);
    const selectedDice = interaction?.selected ?? [];
    const dieModifyConfig = interaction?.dieModifyConfig;
    const modifiedDice = interactionConfig?.modifiedDice ?? [];
    const isAnyMode = dieModifyConfig?.mode === 'any';
    const isAdjustMode = dieModifyConfig?.mode === 'adjust';
    const adjustRange = dieModifyConfig?.adjustRange ?? { min: -1, max: 1 };
    const totalAdjustment = interactionConfig?.totalAdjustment ?? 0;
    // adjust 模式：根据 adjustRange 判断是否还能继续调整
    const canAdjustDown = isAdjustMode && totalAdjustment > adjustRange.min;
    const canAdjustUp = isAdjustMode && totalAdjustment < adjustRange.max;
    const maxModifyCount = interaction?.selectCount ?? 1;

    const handleDieClick = (dieId: number) => {
        if (isRolling) return;
        if (isInteractionMode && interactionConfig) {
            // 交互模式：选择骰子
            interactionConfig.onSelectDie(dieId);
        } else if (canInteract) {
            // 正常模式：锁定骰子
            onToggleLock(dieId);
        }
    };

    const handleAdjust = (dieId: number, delta: number, currentValue: number) => {
        if (!interactionConfig) return;
        // adjust 模式：检查是否还能在该方向调整
        if (isAdjustMode) {
            if (delta < 0 && !canAdjustDown) return;
            if (delta > 0 && !canAdjustUp) return;
        }
        const newValue = currentValue + delta;
        if (newValue >= 1 && newValue <= 6) {
            interactionConfig.onModifyDie(dieId, newValue);
        }
    };

    // Removed unused handleSetValue

    const isSelected = (dieId: number) => selectedDice.includes(String(dieId));
    const canSelectMore = (interaction?.selectCount ?? 0) > selectedDice.length;

    return (
        <div
            className={`
            flex flex-col items-center p-[0.6vw] rounded-[1.5vw] gap-[0.5vw] w-[5.8vw] shrink-0 relative transition-all duration-300
            border-t-[0.12vw] border-l-[0.1vw] border-b-[0.2vw] border-r-[0.12vw]
            ${isInteractionMode
                ? 'bg-slate-950 border-transparent ring-[0.2vw] ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                : isPassiveRerollMode
                    ? 'bg-slate-950 border-transparent ring-[0.2vw] ring-emerald-500 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                    : 'bg-gradient-to-b from-[#1a1e36] via-[#0d0e1a] to-[#05060a] border-indigo-300/30 border-black/80 shadow-[inset_0_5px_12px_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.4)]'}
        `}
            data-tutorial-id="dice-tray"
        >
            {/* Glossy overlay for metallic feel without expensive blur */}
            <div className="absolute inset-0 rounded-[1.5vw] bg-gradient-to-tr from-white/0 via-white/5 to-transparent pointer-events-none" />

            {/* Internal rim highlight - sharpen the 3D edge */}
            <div className={`absolute inset-[0.1vw] rounded-[1.4vw] pointer-events-none border-[0.05vw] ${isInteractionMode ? 'border-amber-400/20' : 'border-t-white/20 border-l-white/10 border-transparent'} `} />

            {/* Deep recess shadow at the top */}
            <div className="absolute top-0 left-0 right-0 h-[1.5vw] rounded-t-[1.5vw] bg-gradient-to-b from-black/95 to-transparent pointer-events-none" />

            <div className="flex flex-col gap-[0.5vw] items-center justify-center w-full p-[0.2vw]">
                {dice.map((d, i) => {
                    const selected = isSelected(d.id);
                    const isModified = modifiedDice.includes(String(d.id));
                    // adjust 模式：选中后显示 +/- 按钮（但锁定骰子不显示）
                    const showAdjustButtons = isInteractionMode && isAdjustMode && selected && !d.isKept;
                    // any 模式：已修改的骰子始终显示控件，未修改的骰子在未达到上限时显示控件（也用 +/- 按钮，但锁定骰子不显示）
                    const showAnyModeButtons = isInteractionMode && isAnyMode && !d.isKept &&
                        (isModified || modifiedDice.length < maxModifyCount);
                    // selectDie/modifyDie 模式下，isKept 的骰子（未参与本阶段投掷）不可选择/修改
                    const isInactiveDie = (interaction?.type === 'selectDie' || interaction?.type === 'modifyDie') && d.isKept;
                    const clickable = isInteractionMode
                        ? (isAnyMode ? false : (!isInactiveDie && (canSelectMore || selected)))
                        : canInteract;

                    return (
                        <div
                            key={d.id}
                            className="relative flex items-center gap-[0.3vw]"
                        >
                            {/* 左侧 - 减号按钮（adjust 模式和 any 模式） */}
                            {(showAdjustButtons || showAnyModeButtons) && (
                                <button
                                    onClick={() => handleAdjust(d.id, -1, d.value)}
                                    disabled={d.value <= 1 || (showAdjustButtons && !canAdjustDown)}
                                    className={`w-[1.2vw] h-[1.2vw] rounded-full flex items-center justify-center font-bold text-[0.8vw] transition-all duration-150 ${(d.value <= 1 || (showAdjustButtons && !canAdjustDown))
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:scale-110'
                                        }`}
                                >
                                    −
                                </button>
                            )}

                            {/* 骰子本体 + 重投按钮 */}
                            <div className="relative flex flex-col items-center gap-[0.25vw]">
                                <div
                                    onClick={() => clickable && handleDieClick(d.id)}
                                    className={`
                                        relative flex-shrink-0 group transition-all duration-200
                                        ${!isInteractionMode && d.isKept ? 'opacity-80' : ''}
                                        ${!clickable && !showAdjustButtons && !showAnyModeButtons ? 'cursor-not-allowed opacity-50' : ''}
                                        ${clickable ? 'cursor-pointer hover:scale-110' : ''}
                                        ${selected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-lg scale-105' : ''}
                                    `}
                                >
                                    <Dice3D
                                        value={d.value}
                                        isRolling={(isRolling && !d.isKept) || (rerollingDiceIds?.includes(d.id) ?? false)}
                                        index={i}
                                        size={diceSize}
                                        locale={locale}
                                        characterId={d.definitionId?.replace('-dice', '')}
                                    />
                                    {!isInteractionMode && d.isKept && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                            <div className="text-[0.6vw] font-black text-white bg-black/50 px-[0.4vw] py-[0.1vw] rounded uppercase tracking-wider shadow-sm border border-white/20">
                                                {t('dice.locked')}
                                            </div>
                                        </div>
                                    )}
                                    {/* 选中标记 */}
                                    {selected && !showAdjustButtons && !showAnyModeButtons && (
                                        <div className="absolute -top-[0.3vw] -right-[0.3vw] w-[1vw] h-[1vw] bg-amber-500 rounded-full flex items-center justify-center z-30">
                                            <Check size={12} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 右侧 - 加号按钮（adjust 模式和 any 模式） */}
                            {(showAdjustButtons || showAnyModeButtons) && (
                                <button
                                    onClick={() => handleAdjust(d.id, 1, d.value)}
                                    disabled={d.value >= 6 || (showAdjustButtons && !canAdjustUp)}
                                    className={`w-[1.2vw] h-[1.2vw] rounded-full flex items-center justify-center font-bold text-[0.8vw] transition-all duration-150 ${(d.value >= 6 || (showAdjustButtons && !canAdjustUp))
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:scale-110'
                                        }`}
                                >
                                    +
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// GameButton import removed from here.

export const DiceActions = ({
    rollCount,
    rollLimit,
    rollConfirmed,
    onRoll,
    onConfirm,
    currentPhase,
    canInteract,
    isRolling,
    setIsRolling,
    interactionConfig,
}: {
    rollCount: number;
    rollLimit: number;
    rollConfirmed: boolean;
    onRoll: () => void;
    onConfirm: () => void;
    currentPhase: TurnPhase;
    canInteract: boolean;
    isRolling: boolean;
    setIsRolling: (isRolling: boolean) => void;
    /** 骰子交互模式配置 */
    interactionConfig?: DiceInteractionConfig;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const isRollPhase = currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
    const isInteractionMode = Boolean(interactionConfig);
    const selectedCount = interactionConfig?.interaction?.selected?.length ?? 0;
    const modifiedCount = interactionConfig?.modifiedDice?.length ?? 0;
    const isAnyMode = interactionConfig?.interaction?.dieModifyConfig?.mode === 'any';
    // any 模式检查已修改数量，其他模式检查已选择数量
    const canConfirm = isAnyMode ? modifiedCount > 0 : selectedCount > 0;

    const handleRollClick = () => {
        if (isInteractionMode) {
            // 交互模式：取消按钮
            interactionConfig?.onCancel();
            return;
        }
        if (!isRollPhase || !canInteract || rollConfirmed || rollCount >= rollLimit) return;
        setIsRolling(true);
        onRoll();
        setTimeout(() => setIsRolling(false), 600);
    };

    const handleConfirmClick = () => {
        if (isInteractionMode) {
            // 交互模式：确认按钮
            interactionConfig?.onConfirm();
            return;
        }
        onConfirm();
    };

    const renderRollDots = () => {
        const dots = [];
        for (let i = 0; i < rollLimit; i++) {
            const isUsed = i < rollCount;
            dots.push(
                <div
                    key={i}
                    className={`
                        w-[0.45vw] h-[0.45vw] rounded-full border border-black/30 shadow-sm transition-all duration-300 flex-shrink-0
                        ${isUsed ? 'bg-slate-900/60' : 'bg-white'}
                    `}
                />
            );
        }
        return (
            <div className="flex flex-col flex-wrap gap-[0.15vw] justify-center items-center h-[1.8vw] ml-[0.3vw] shrink-0 content-center">
                {dots}
            </div>
        );
    };

    // 左按钮：交互模式为「取消」，正常模式为「投掷」
    const leftDisabled = isInteractionMode
        ? false
        : (!canInteract || rollConfirmed || rollCount >= rollLimit);
    const leftVariant = isInteractionMode
        ? 'secondary' as const
        : (isRollPhase && canInteract && !rollConfirmed && rollCount < rollLimit ? 'primary' as const : 'secondary' as const);

    // 右按钮：交互模式为「确认交互」，正常模式为「确认掷骰」
    const rightDisabled = isInteractionMode
        ? !canConfirm
        : (rollConfirmed || rollCount === 0 || !canInteract || isRolling);
    const rightVariant = isInteractionMode
        ? 'primary' as const
        : (rollConfirmed ? 'glass' as const : 'secondary' as const);

    return (
        <div className="w-[10.2vw] grid grid-cols-2 gap-[0.4vw] items-stretch h-[2.5vw]">
            <GameButton
                onClick={handleRollClick}
                disabled={leftDisabled}
                variant={leftVariant}
                size="sm"
                clickSoundKey={isInteractionMode ? undefined : null}
                className={clsx(
                    "!px-[0.5vw] !py-0 flex items-center justify-between h-full whitespace-nowrap overflow-hidden !rounded-[0.5vw]",
                    !isInteractionMode && isRolling && 'animate-pulse'
                )}
                data-tutorial-id={isInteractionMode ? undefined : 'dice-roll-button'}
            >
                {isInteractionMode ? (
                    <span className="flex-1 text-center font-black !text-[0.75vw]">{t('common.cancel')}</span>
                ) : (
                    <>
                        <div className="truncate flex-1 text-center font-black !text-[0.7vw] tracking-tighter">
                            {isRolling ? t('dice.rolling', '投掷中...') : t('dice.roll_action', '投掷')}
                        </div>
                        {!isRolling && renderRollDots()}
                    </>
                )}
            </GameButton>

            <GameButton
                onClick={handleConfirmClick}
                disabled={rightDisabled}
                variant={rightVariant}
                size="sm"
                clickSoundKey={isInteractionMode ? undefined : null}
                className={clsx(
                    "flex items-center justify-center h-full whitespace-nowrap overflow-hidden font-black !text-[0.7vw] !rounded-[0.5vw] !py-0",
                    !isInteractionMode && rollConfirmed && '!text-white/60'
                )}
                data-tutorial-id={isInteractionMode ? undefined : 'dice-confirm-button'}
            >
                {isInteractionMode
                    ? t('common.confirm')
                    : (rollConfirmed ? t('dice.confirmed', '已确认') : t('dice.confirm', '确认'))}
            </GameButton>
        </div>
    );
};
