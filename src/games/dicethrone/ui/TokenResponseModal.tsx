import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameModal } from './components/GameModal';
import { GameButton } from './components/GameButton';
import type { PendingDamage, HeroState, TokenResponsePhase } from '../domain/types';
import type { TokenDef } from '../domain/tokenTypes';
import clsx from 'clsx';
import { type StatusAtlases, TOKEN_META, getStatusEffectIconNode } from './statusEffects';

interface TokenResponseModalProps {
    /** 待处理的伤害 */
    pendingDamage: PendingDamage;
    /** 当前响应阶段 */
    responsePhase: TokenResponsePhase;
    /** 响应玩家状态 */
    responderState: HeroState;
    /** 当前阶段可用的 Token 列表（由领域层过滤，UI 直接渲染） */
    usableTokens: TokenDef[];
    /** 使用 Token（通用接口） */
    onUseToken: (tokenId: string, amount: number) => void;
    /** 跳过响应 */
    onSkip: () => void;
    /** 语言 */
    locale?: string;
    /** 最近一次闪避投骰结果（用于展示） */
    lastEvasionRoll?: { value: number; success: boolean };
    /** 状态图标图集 */
    statusIconAtlas?: StatusAtlases | null;
}

/**
 * Token 响应弹窗
 * - 攻击阶段：攻击方可消耗 damage modifier Token 增加伤害
 * - 防御阶段：防御方可消耗 damage modifier Token 减少伤害，或消耗闪避尝试完全躲避
 *
 * usableTokens 由领域层 getUsableTokensForTiming 提供，UI 不再自行过滤
 */
export const TokenResponseModal: React.FC<TokenResponseModalProps> = ({
    pendingDamage,
    responsePhase,
    responderState,
    usableTokens,
    onUseToken,
    onSkip,
    locale,
    lastEvasionRoll,
    statusIconAtlas,
}) => {
    const { t } = useTranslation('game-dicethrone');
    const [boostAmount, setBoostAmount] = React.useState(1);

    const isAttackerPhase = responsePhase === 'attackerBoost';
    const isDefenderPhase = responsePhase === 'defenderMitigation';

    // 从已过滤的可用 token 中按 effect type 分类
    const boostToken = usableTokens.find(def => {
        const effectType = def.activeUse?.effect.type;
        return effectType === 'modifyDamageDealt' || effectType === 'modifyDamageReceived';
    });
    const evasiveToken = usableTokens.find(def =>
        def.activeUse?.effect.type === 'rollToNegate'
    );

    const boostCount = boostToken ? (responderState.tokens[boostToken.id] ?? 0) : 0;
    const evasiveCount = evasiveToken ? (responderState.tokens[evasiveToken.id] ?? 0) : 0;

    // 攻击方只能用增益 Token 加伤
    const canUseBoost = boostToken && boostCount > 0;
    // 防御方可用增益 Token 减伤或闪避
    const canUseEvasive = isDefenderPhase && evasiveToken && evasiveCount > 0 && !pendingDamage.isFullyEvaded;

    // 只有在“刚刚用完 Token 导致已无可用标记”时才自动跳过。
    const hasAnyAction = Boolean(canUseBoost || canUseEvasive);
    const hadAnyActionRef = React.useRef<boolean>(hasAnyAction);

    React.useEffect(() => {
        const hadAnyAction = hadAnyActionRef.current;
        if (hadAnyAction && !hasAnyAction) {
            const timer = setTimeout(() => onSkip(), 150);
            return () => clearTimeout(timer);
        }
        hadAnyActionRef.current = hasAnyAction;
        return;
    }, [hasAnyAction, onSkip, pendingDamage.id, responsePhase]);

    // 最大增益使用量
    const maxBoostAmount = isAttackerPhase
        ? boostCount
        : Math.min(boostCount, pendingDamage.currentDamage);

    // 预览伤害
    const previewDamage = isAttackerPhase
        ? pendingDamage.currentDamage + boostAmount
        : Math.max(0, pendingDamage.currentDamage - boostAmount);

    const handleBoostChange = (delta: number) => {
        setBoostAmount(prev => Math.max(1, Math.min(maxBoostAmount, prev + delta)));
    };

    const handleUseBoost = () => {
        if (boostToken) {
            onUseToken(boostToken.id, boostAmount);
        }
        setBoostAmount(1);
    };

    const isOpen = Boolean(pendingDamage && responsePhase);

    // 辅助函数：渲染 Token 图标
    const renderTokenIcon = (tokenId: string, fallbackIcon: string) => {
        const meta = TOKEN_META[tokenId];
        if (meta && statusIconAtlas) {
            return (
                <div className="w-8 h-8 flex-shrink-0">
                    {getStatusEffectIconNode(meta, locale, 'normal', statusIconAtlas)}
                </div>
            );
        }
        return <span className="text-2xl">{fallbackIcon}</span>;
    };

    return (
        <GameModal
            isOpen={isOpen}
            title={isAttackerPhase ? t('tokenResponse.attackerTitle') : t('tokenResponse.defenderTitle')}
            width="lg"
            closeOnBackdrop={false}
        >
            <div className="flex flex-col gap-6 w-full">
                {/* 描述 */}
                <p className="text-sm sm:text-base text-slate-400 text-center">
                    {isAttackerPhase
                        ? t('tokenResponse.attackerDesc')
                        : t('tokenResponse.defenderDesc')}
                </p>

                {/* 伤害信息 (Damage Preview) */}
                <div className="flex justify-center items-center gap-8 py-4 bg-slate-950/40 rounded-xl border border-white/5">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            {t('tokenResponse.originalDamage')}
                        </div>
                        <div className="text-3xl font-black text-slate-400">
                            {pendingDamage.originalDamage}
                        </div>
                    </div>
                    <div className="text-2xl text-slate-600">→</div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            {t('tokenResponse.currentDamage')}
                        </div>
                        <div className={clsx("text-3xl font-black", {
                            'text-green-400': pendingDamage.isFullyEvaded,
                            'text-blue-400': !pendingDamage.isFullyEvaded && pendingDamage.currentDamage < pendingDamage.originalDamage,
                            'text-red-400': !pendingDamage.isFullyEvaded && pendingDamage.currentDamage > pendingDamage.originalDamage,
                            'text-white': !pendingDamage.isFullyEvaded && pendingDamage.currentDamage === pendingDamage.originalDamage,
                        })}>
                            {pendingDamage.isFullyEvaded ? t('tokenResponse.evaded') : pendingDamage.currentDamage}
                        </div>
                    </div>
                </div>

                {/* 闪避结果展示 */}
                {lastEvasionRoll && (
                    <div className={clsx("text-center py-2 rounded-lg border",
                        lastEvasionRoll.success
                            ? 'bg-green-900/30 border-green-500/30'
                            : 'bg-red-900/30 border-red-500/30'
                    )}>
                        <span className="font-bold">
                            {t('tokenResponse.evasionRoll')}: 🎲 {lastEvasionRoll.value}
                            {' - '}
                            {lastEvasionRoll.success
                                ? <span className="text-green-400">{t('tokenResponse.evasionSuccess')}</span>
                                : <span className="text-red-400">{t('tokenResponse.evasionFailed')}</span>
                            }
                        </span>
                    </div>
                )}

                {/* Token 使用区域 */}
                <div className="flex flex-col gap-4">
                    {/* 增益 Token（伤害加成/减免） */}
                    {canUseBoost && boostToken && maxBoostAmount > 0 && (
                        <div className="bg-slate-800/40 rounded-xl p-4 border border-purple-500/20">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {renderTokenIcon(boostToken.id, boostToken.icon)}
                                    <span className="font-bold text-white">
                                        {t(`tokens.${boostToken.id}.name`)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ({boostCount} {t('tokenResponse.available')})
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 hidden sm:block">
                                    {isAttackerPhase
                                        ? t('tokenResponse.boostHint')
                                        : t('tokenResponse.reduceHint')}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleBoostChange(-1)}
                                        disabled={boostAmount <= 1}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-xl font-black text-white w-8 text-center">
                                        {boostAmount}
                                    </span>
                                    <button
                                        onClick={() => handleBoostChange(1)}
                                        disabled={boostAmount >= maxBoostAmount}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500">
                                    → {isAttackerPhase ? '+' : '-'}{boostAmount} {t('tokenResponse.damage')}
                                    {' = '}
                                    <span className={isAttackerPhase ? 'text-red-400' : 'text-blue-400'}>
                                        {previewDamage}
                                    </span>
                                </div>
                                <GameButton
                                    size="sm"
                                    variant="primary"
                                    onClick={handleUseBoost}
                                    className="ml-auto"
                                >
                                    {t('tokenResponse.useToken')}
                                </GameButton>
                            </div>
                        </div>
                    )}

                    {/* 闪避 Token */}
                    {canUseEvasive && evasiveToken && (
                        <div className="bg-slate-800/40 rounded-xl p-4 border border-cyan-500/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {renderTokenIcon(evasiveToken.id, evasiveToken.icon)}
                                    <span className="font-bold text-white">
                                        {t(`tokens.${evasiveToken.id}.name`)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ({evasiveCount} {t('tokenResponse.available')})
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-cyan-300">
                                    {t('tokenResponse.evasiveDesc')}
                                </span>
                                <GameButton
                                    size="sm"
                                    variant="glass"
                                    className="border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-100"
                                    onClick={() => onUseToken(evasiveToken.id, 1)}
                                >
                                    {t('tokenResponse.useEvasive')}
                                </GameButton>
                            </div>
                        </div>
                    )}

                    {/* 无可用 Token 提示 */}
                    {!canUseBoost && !canUseEvasive && (
                        <div className="text-center py-4 text-slate-500 font-medium">
                            {t('tokenResponse.noTokens')}
                        </div>
                    )}
                </div>

                {/* 跳过按钮 */}
                <GameButton
                    onClick={onSkip}
                    variant="secondary"
                    fullWidth
                    className="mt-2"
                >
                    {pendingDamage.isFullyEvaded
                        ? t('tokenResponse.confirm')
                        : t('tokenResponse.skip')}
                </GameButton>
            </div>
        </GameModal>
    );
};
