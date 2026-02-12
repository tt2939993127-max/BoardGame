
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { INTERACTION_COMMANDS, asSimpleChoice, type InteractionDescriptor } from '../../../engine/systems/InteractionSystem';
import type { PlayerId } from '../../../engine/types';
import { UI_Z_INDEX } from '../../../core';

interface Props {
    interaction: InteractionDescriptor | undefined;
    moves: Record<string, any>;
    playerID: PlayerId | null;
}

export const PromptOverlay: React.FC<Props> = ({ interaction, moves, playerID }) => {
    const prompt = asSimpleChoice(interaction);
    const { t } = useTranslation('game-smashup');

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

                    {/* Footer (Cancel/Details could go here if design allowed cancelling) */}
                    <div className="bg-slate-100 p-3 text-center text-xs text-slate-400 font-mono border-t border-slate-200 uppercase tracking-widest">
                        {isMyPrompt && isMulti ? (
                            <div className="flex items-center justify-between gap-3">
                                <span>{isMyPrompt ? t('ui.prompt_select_option') : t('ui.prompt_wait')}</span>
                                <button
                                    onClick={() => moves[INTERACTION_COMMANDS.RESPOND]?.({ optionIds: selectedIds })}
                                    disabled={!canSubmitMulti}
                                    className={`px-4 py-2 rounded text-xs font-black uppercase tracking-widest transition-all border-2
                                        ${canSubmitMulti
                                            ? 'bg-slate-900 text-white border-slate-900 hover:bg-black'
                                            : 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {t('ui.confirm', { defaultValue: '确认' })}
                                </button>
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
