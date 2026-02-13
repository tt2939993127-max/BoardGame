
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { GameButton } from './GameButton';
import { INTERACTION_COMMANDS, asSimpleChoice, type InteractionDescriptor } from '../../../engine/systems/InteractionSystem';
import type { PlayerId } from '../../../engine/types';
import { UI_Z_INDEX } from '../../../core';
import { CardPreview } from '../../../components/common/media/CardPreview';
import { getCardDef, getBaseDef, resolveCardName } from '../data/cards';

interface Props {
    interaction: InteractionDescriptor | undefined;
    moves: Record<string, any>;
    playerID: PlayerId | null;
}

/** 从选项 value 中提取 defId（卡牌/随从/基地） */
function extractDefId(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const v = value as Record<string, unknown>;
    if (typeof v.defId === 'string') return v.defId;
    if (typeof v.baseDefId === 'string') return v.baseDefId;
    return undefined;
}

/** 判断选项是否为卡牌类型（有 defId 且能找到预览图） */
function isCardOption(value: unknown): boolean {
    const defId = extractDefId(value);
    if (!defId) return false;
    const def = getCardDef(defId) ?? getBaseDef(defId);
    return !!def?.previewRef;
}

export const PromptOverlay: React.FC<Props> = ({ interaction, moves, playerID }) => {
    const prompt = asSimpleChoice(interaction);
    const { t, i18n } = useTranslation('game-smashup');

    const isMyPrompt = !!prompt && prompt.playerId === playerID;
    const isMulti = !!prompt?.multi && isMyPrompt;
    const minSelections = isMulti ? (prompt?.multi?.min ?? 0) : 0;
    const maxSelections = isMulti ? prompt?.multi?.max : undefined;
    const hasOptions = (prompt?.options?.length ?? 0) > 0;
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        setSelectedIds([]);
    }, [prompt?.id]);

    const canSubmitMulti = useMemo(() => {
        if (!isMyPrompt) return false;
        return selectedIds.length >= minSelections;
    }, [isMyPrompt, minSelections, selectedIds.length]);

    // 检测是否应使用卡牌展示模式：超过半数选项有可展示的卡牌预览
    const useCardMode = useMemo(() => {
        if (!prompt || !hasOptions) return false;
        const cardCount = prompt.options.filter(opt => isCardOption(opt.value)).length;
        return cardCount > 0 && cardCount >= prompt.options.length / 2;
    }, [prompt, hasOptions]);

    if (!prompt) return null;

    const handleOptionSelect = (optionId: string) => {
        if (!isMyPrompt) return;
        moves[INTERACTION_COMMANDS.RESPOND]?.({ optionId });
    };

    const handleToggleMulti = (optionId: string, disabled?: boolean) => {
        if (!isMyPrompt || disabled) return;
        setSelectedIds((prev) => {
            const exists = prev.includes(optionId);
            if (exists) {
                return prev.filter(id => id !== optionId);
            }
            if (maxSelections !== undefined && prev.length >= maxSelections) {
                return prev;
            }
            return [...prev, optionId];
        });
    };

    // ====== 卡牌展示模式 ======
    if (useCardMode) {
        // 分离卡牌选项和文本选项（如"跳过"）
        const cardOptions = prompt.options.filter(opt => isCardOption(opt.value));
        const textOptions = prompt.options.filter(opt => !isCardOption(opt.value));

        return (
            <AnimatePresence>
                <motion.div
                    key="prompt-overlay-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
                    style={{ zIndex: UI_Z_INDEX.overlay }}
                >
                    {/* 标题 */}
                    <h2 className="text-2xl font-black text-amber-100 uppercase tracking-wide mb-6 drop-shadow-lg">
                        {prompt.title}
                    </h2>

                    {!isMyPrompt && (
                        <div className="mb-4 bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded text-sm font-bold uppercase border border-yellow-500/50 animate-pulse">
                            {t('ui.waiting_for_player', { id: prompt.playerId })}
                        </div>
                    )}

                    {/* 卡牌横排 */}
                    {isMyPrompt && (
                        <div className="flex gap-4 overflow-x-auto max-w-[90vw] px-8 py-4 no-scrollbar">
                            {cardOptions.map((option, idx) => {
                                const defId = extractDefId(option.value);
                                const def = defId ? (getCardDef(defId) ?? getBaseDef(defId)) : undefined;
                                const previewRef = def?.previewRef;
                                const name = def ? resolveCardName(def, t) : option.label;
                                const isSelected = selectedIds.includes(option.id);

                                return (
                                    <motion.div
                                        key={`card-${idx}-${option.id}`}
                                        initial={{ y: 40, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                                        onClick={() => isMulti
                                            ? handleToggleMulti(option.id, option.disabled)
                                            : handleOptionSelect(option.id)
                                        }
                                        className={`
                                            flex-shrink-0 cursor-pointer relative group transition-all duration-200
                                            ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                                            ${isSelected ? 'scale-110 z-10' : 'hover:scale-105 hover:z-10'}
                                        `}
                                    >
                                        <div className={`
                                            rounded-lg shadow-xl transition-all duration-200 overflow-hidden
                                            ${isSelected
                                                ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                                                : 'ring-2 ring-white/20 group-hover:ring-white/60 group-hover:shadow-2xl'}
                                        `}>
                                            {previewRef ? (
                                                <CardPreview
                                                    previewRef={previewRef}
                                                    className="w-[140px] aspect-[0.714] bg-slate-900 rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-[140px] aspect-[0.714] bg-slate-800 rounded-lg flex items-center justify-center p-2">
                                                    <span className="text-white text-sm font-bold text-center">{option.label}</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* 卡牌名称 */}
                                        <div className={`
                                            mt-2 text-center text-xs font-bold truncate max-w-[140px] px-1
                                            ${isSelected ? 'text-amber-300' : 'text-white/80'}
                                        `}>
                                            {name || option.label}
                                        </div>
                                        {/* 多选勾选标记 */}
                                        {isMulti && isSelected && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={14} strokeWidth={3} className="text-black" />
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* 文本选项（如"跳过"）*/}
                    {isMyPrompt && textOptions.length > 0 && (
                        <div className="flex gap-3 mt-6">
                            {textOptions.map((option, idx) => (
                                <GameButton
                                    key={`text-${idx}`}
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => isMulti
                                        ? handleToggleMulti(option.id, option.disabled)
                                        : handleOptionSelect(option.id)
                                    }
                                    disabled={option.disabled}
                                >
                                    {option.label}
                                </GameButton>
                            ))}
                        </div>
                    )}

                    {/* 多选确认按钮 */}
                    {isMyPrompt && isMulti && (
                        <div className="mt-6">
                            <GameButton
                                variant="primary"
                                onClick={() => moves[INTERACTION_COMMANDS.RESPOND]?.({ optionIds: selectedIds })}
                                disabled={!canSubmitMulti}
                            >
                                {t('ui.confirm', { defaultValue: '确认' })}
                            </GameButton>
                        </div>
                    )}

                    {/* 底部提示 */}
                    <div className="mt-4 text-xs text-white/40 uppercase tracking-widest">
                        {isMyPrompt ? t('ui.prompt_select_option') : t('ui.prompt_wait')}
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // ====== 文本列表模式（原有逻辑） ======
    return (
        <AnimatePresence>
            <motion.div
                key="prompt-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 pointer-events-auto"
                style={{ zIndex: UI_Z_INDEX.overlay }}
            >
                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-slate-800"
                >
                    {/* Header */}
                    <div className="bg-slate-800 p-6 text-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                            {prompt.title}
                        </h2>
                        {!isMyPrompt && (
                            <div className="mt-4 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded text-xs font-bold uppercase border border-yellow-500/50 inline-block animate-pulse">
                                {t('ui.waiting_for_player', { id: prompt.playerId })}
                            </div>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="p-6 bg-slate-50 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {isMyPrompt && hasOptions ? prompt.options.map((option, idx) => {
                            const isSelected = selectedIds.includes(option.id);
                            if (!isMulti) {
                                return (
                                    <button
                                        key={`${idx}-${option.label}`}
                                        onClick={() => handleOptionSelect(option.id)}
                                        disabled={!isMyPrompt || option.disabled}
                                        className={`
                                            w-full text-left px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 border-2
                                            ${!isMyPrompt || option.disabled
                                                ? 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
                                                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md hover:translate-x-1 active:bg-blue-100 active:scale-[0.99]'
                                            }
                                        `}
                                    >
                                        {option.label}
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={`${idx}-${option.label}`}
                                    onClick={() => handleToggleMulti(option.id, option.disabled)}
                                    disabled={!isMyPrompt || option.disabled}
                                    className={`
                                        w-full text-left px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 border-2 flex items-center gap-3
                                        ${!isMyPrompt || option.disabled
                                            ? 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
                                            : isSelected
                                                ? 'bg-blue-50 text-slate-800 border-blue-500 shadow-md'
                                                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-400'}`}>
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    {option.label}
                                </button>
                            );
                        }) : (
                            <div className="text-sm text-slate-500 text-center py-6">
                                {isMyPrompt
                                    ? t('ui.prompt_no_options', { defaultValue: '暂无可选项' })
                                    : t('ui.prompt_wait', { defaultValue: '等待对方选择…' })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-100 p-3 text-center text-xs text-slate-400 font-mono border-t border-slate-200 uppercase tracking-widest">
                        {isMyPrompt && isMulti ? (
                            <div className="flex items-center justify-between gap-3">
                                <span>{isMyPrompt ? t('ui.prompt_select_option') : t('ui.prompt_wait')}</span>
                                <GameButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => moves[INTERACTION_COMMANDS.RESPOND]?.({ optionIds: selectedIds })}
                                    disabled={!canSubmitMulti}
                                >
                                    {t('ui.confirm', { defaultValue: '确认' })}
                                </GameButton>
                            </div>
                        ) : (
                            isMyPrompt ? t('ui.prompt_select_option') : t('ui.prompt_wait')
                        )}
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
