/**
 * 卡牌交互覆盖层
 * 用于状态效果选择、玩家选择等交互
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { PendingInteraction, HeroState } from '../domain/types';
import type { PlayerId } from '../../../engine/types';
import { SelectableEffectsContainer, type StatusAtlases } from './statusEffects';
import { GameModal } from './components/GameModal';
import { GameButton } from './components/GameButton';

export interface InteractionOverlayProps {
    /** 当前交互 */
    interaction: PendingInteraction;
    /** 所有玩家状态 */
    players: Record<PlayerId, HeroState>;
    /** 当前玩家 ID */
    currentPlayerId: PlayerId;
    /** 选择状态效果回调 */
    onSelectStatus: (playerId: PlayerId, statusId: string) => void;
    /** 选择玩家回调 */
    onSelectPlayer: (playerId: PlayerId) => void;
    /** 确认交互 */
    onConfirm: () => void;
    /** 取消交互 */
    onCancel: () => void;
    /** 状态图标图集 */
    statusIconAtlas?: StatusAtlases | null;
    /** 语言 */
    locale?: string;
}

export const InteractionOverlay: React.FC<InteractionOverlayProps> = ({
    interaction,
    players,
    currentPlayerId,
    onSelectStatus,
    onSelectPlayer,
    onConfirm,
    onCancel,
    statusIconAtlas,
    locale,
}) => {
    const { t } = useTranslation('game-dicethrone');
    const interactionType = interaction.type;
    const selectedItems = interaction.selected ?? [];
    const targetPlayerIds = interaction.targetPlayerIds ?? Object.keys(players);

    // 转移模式的第二阶段：选择目标玩家（必须在 isStatusSelection 之前判断）
    const isTransferTargetSelection = interactionType === 'selectTargetStatus' && !!interaction.transferConfig?.statusId;
    // 状态效果选择模式（第一阶段，排除已进入第二阶段的情况）
    const isStatusSelection = !isTransferTargetSelection && (interactionType === 'selectStatus' || interactionType === 'selectTargetStatus');
    // 玩家选择模式（移除所有状态）
    const isPlayerSelection = interactionType === 'selectPlayer';

    // 获取已选择的状态信息（用于显示）
    const selectedStatusId = isStatusSelection ? selectedItems[0] : undefined;

    // 检查是否有任何玩家有可移除的状态
    const playersWithStatus = targetPlayerIds.filter(pid => {
        const p = players[pid];
        if (!p) return false;
        const hasEffects = Object.values(p.statusEffects ?? {}).some(v => v > 0);
        const hasTokens = Object.values(p.tokens ?? {}).some(v => v > 0);
        return hasEffects || hasTokens;
    });

    const canConfirm = selectedItems.length >= interaction.selectCount
        || (isPlayerSelection && selectedItems.length > 0)
        || (isTransferTargetSelection && selectedItems.length > 0);

    // Derived presence
    const isOpen = true; // Controlled by BoardOverlays

    return (
        <GameModal
            isOpen={isOpen}
            title={
                <div>
                    <div>{t(interaction.titleKey, { count: interaction.selectCount })}</div>
                    {interaction.transferConfig?.statusId && (
                        <div className="text-slate-400 text-sm mt-1 font-normal normal-case">
                            {t('interaction.transferSelectTarget')}
                        </div>
                    )}
                </div>
            }
            width="xl"
            closeOnBackdrop={false} // Force interaction
            footer={
                <>
                    <GameButton
                        onClick={onCancel}
                        variant="secondary"
                        className="px-8"
                    >
                        {t('common.cancel')}
                    </GameButton>
                    <GameButton
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        variant="primary"
                        className="px-8"
                    >
                        {t('common.confirm')}
                    </GameButton>
                </>
            }
        >
            <div className="flex flex-col w-full max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
                {/* 玩家选择区域 */}
                {(isStatusSelection || isPlayerSelection) && (
                    <div className="flex flex-wrap gap-4 justify-center">
                        {targetPlayerIds.map(pid => {
                            const player = players[pid];
                            if (!player) return null;

                            const isSelf = pid === currentPlayerId;
                            const playerLabel = isSelf ? t('common.self') : t('common.opponent');
                            const hasStatus = playersWithStatus.includes(pid);
                            const isSelected = selectedItems.includes(pid);

                            // 玩家选择模式
                            if (isPlayerSelection) {
                                return (
                                    <div
                                        key={pid}
                                        onClick={() => hasStatus && onSelectPlayer(pid)}
                                        className={`
                                            p-4 rounded-xl border-2 transition-all duration-200 min-w-[200px]
                                            ${hasStatus ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                                            ${isSelected
                                                ? 'border-green-500 bg-green-900/30 ring-2 ring-green-400'
                                                : hasStatus
                                                    ? 'border-amber-500/50 bg-slate-800/50 hover:border-amber-400'
                                                    : 'border-slate-700 bg-slate-800/30'}
                                        `}
                                    >
                                        <div className="text-center mb-2">
                                            <span className={`font-bold text-lg ${isSelf ? 'text-cyan-400' : 'text-red-400'}`}>
                                                {playerLabel}
                                            </span>
                                            {isSelected && (
                                                <Check size={16} className="ml-2 text-green-400" strokeWidth={3} />
                                            )}
                                        </div>
                                        {/* 显示玩家的状态效果（仅供参考） */}
                                        <SelectableEffectsContainer
                                            effects={player.statusEffects ?? {}}
                                            tokens={player.tokens}
                                            highlightAll={false}
                                            size="small"
                                            className="justify-center"
                                            locale={locale}
                                            atlas={statusIconAtlas}
                                        />
                                        {!hasStatus && (
                                            <div className="text-slate-500 text-sm text-center mt-2">
                                                {t('interaction.noStatus')}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // 状态效果选择模式
                            // 判断该玩家下是否有被选中的状态效果
                            const hasSelectedEffect = selectedStatusId
                                ? Object.keys(player.statusEffects ?? {}).includes(selectedStatusId)
                                    || Object.keys(player.tokens ?? {}).includes(selectedStatusId)
                                : false;

                            return (
                                <div
                                    key={pid}
                                    className={`
                                        p-4 rounded-xl border-2 transition-all duration-200 min-w-[200px]
                                        ${!hasStatus
                                            ? 'border-slate-700 bg-slate-800/30 opacity-50'
                                            : hasSelectedEffect
                                                ? 'border-amber-500 bg-slate-800/60'
                                                : 'border-slate-600 bg-slate-800/40'}
                                    `}
                                >
                                    <div className="text-center mb-2">
                                        <span className={`font-bold text-lg ${isSelf ? 'text-cyan-400' : 'text-red-400'}`}>
                                            {playerLabel}
                                        </span>
                                    </div>
                                    {hasStatus ? (
                                        <SelectableEffectsContainer
                                            effects={player.statusEffects ?? {}}
                                            tokens={player.tokens}
                                            selectedId={selectedStatusId}
                                            highlightAll={false}
                                            onSelectEffect={(statusId) => onSelectStatus(pid, statusId)}
                                            size="normal"
                                            className="justify-center"
                                            locale={locale}
                                            atlas={statusIconAtlas}
                                        />
                                    ) : (
                                        <div className="text-slate-500 text-sm text-center">
                                            {t('interaction.noStatus')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 转移目标选择（第二阶段） */}
                {isTransferTargetSelection && (
                    <div className="flex flex-wrap gap-4 justify-center">
                        {targetPlayerIds
                            .filter(pid => pid !== interaction.transferConfig?.sourcePlayerId)
                            .map(pid => {
                                const player = players[pid];
                                if (!player) return null;
                                const isSelf = pid === currentPlayerId;
                                const playerLabel = isSelf ? t('common.self') : t('common.opponent');
                                const isSelected = selectedItems.includes(pid);

                                return (
                                    <div
                                        key={pid}
                                        onClick={() => onSelectPlayer(pid)}
                                        className={`
                                            p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 min-w-[150px]
                                            hover:scale-105
                                            ${isSelected
                                                ? 'border-green-500 bg-green-900/30 ring-2 ring-green-400'
                                                : 'border-slate-600 bg-slate-800/40 hover:border-slate-400'}
                                        `}
                                    >
                                        <div className="text-center">
                                            <span className={`font-bold text-lg ${isSelf ? 'text-cyan-400' : 'text-red-400'}`}>
                                                {playerLabel}
                                            </span>
                                            {isSelected && (
                                                <Check size={16} className="ml-2 text-green-400" strokeWidth={3} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </GameModal>
    );
};
