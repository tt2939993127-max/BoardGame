/**
 * GameHints 组件
 * 
 * 统一管理游戏中所有的提示和状态消息，包括：
 * - 弃牌阶段提示
 * - 骰子交互提示
 * - 对手思考中提示
 * - 响应窗口提示
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { InteractionDescriptor, TurnPhase } from '../domain/types';
import { UI_Z_INDEX } from '../../../core';
import { GameButton } from './components/GameButton';

export interface GameHintsProps {
    /** 是否处于弃牌模式 */
    isDiscardMode: boolean;
    /** 必须弃牌数量 */
    mustDiscardCount: number;

    /** 是否为骰子交互 */
    isDiceInteraction: boolean;
    /** 是否为交互所有者 */
    isInteractionOwner: boolean;
    /** 待处理交互 */
    pendingInteraction?: InteractionDescriptor;

    /** 是否在等待对手 */
    isWaitingOpponent: boolean;
    /** 对手名称 */
    opponentName: string;

    /** 是否为当前响应者 */
    isResponder: boolean;
    /** 响应窗口偏移类名 */
    thinkingOffsetClass?: string;
    /** 响应跳过回调 */
    onResponsePass: () => void;

    /** 当前阶段 */
    currentPhase: TurnPhase;

    /** 是否处于被动重掷选择模式 */
    isPassiveRerollSelecting?: boolean;
}

/**
 * 弃牌阶段提示 Banner
 */
const DiscardHint: React.FC<{ mustDiscardCount: number }> = ({ mustDiscardCount }) => {
    const { t } = useTranslation('game-dicethrone');

    return (
        <div
            className="absolute bottom-[14vw] left-1/2 -translate-x-1/2 pointer-events-none animate-pulse"
            style={{ zIndex: UI_Z_INDEX.hint }}
        >
            <div className="px-[2vw] py-[0.8vw] rounded-xl bg-gradient-to-r from-red-900/90 to-orange-900/90 border-2 border-red-500/60 shadow-[0_0_2vw_rgba(239,68,68,0.4)] backdrop-blur-sm">
                <div className="flex items-center gap-[1vw]">
                    <Trash2 className="w-[1.5vw] h-[1.5vw] text-red-200" />
                    <div className="flex flex-col">
                        <span className="text-red-200 text-[1vw] font-black tracking-wider">
                            {t('discard.mustDiscard')}
                        </span>
                        <span className="text-orange-300 text-[0.8vw] font-bold">
                            {t('discard.selectToDiscard', { count: mustDiscardCount })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 骰子交互提示（画面顶部中央）
 */
const DiceInteractionHint: React.FC<{ pendingInteraction: InteractionDescriptor }> = ({ pendingInteraction }) => {
    const { t } = useTranslation('game-dicethrone');

    return (
        <div
            className="absolute top-[6vw] left-1/2 -translate-x-1/2 pointer-events-none animate-pulse"
            style={{ zIndex: UI_Z_INDEX.hint }}
        >
            <div className="bg-amber-600/90 backdrop-blur-sm rounded-xl px-[2vw] py-[0.6vw] border border-amber-400/60 shadow-lg text-center">
                <span className="text-white font-bold text-[1vw] tracking-wide">
                    {t(pendingInteraction.titleKey, { count: pendingInteraction.selectCount })}
                </span>
            </div>
        </div>
    );
};

/**
 * 对手思考中提示（画面正中央）
 *
 * 之前用整体 pulse 会造成“亮度闪烁”的体感，这里改成省略号动画：
 * - 文案本身保持稳定
 * - 通过 3 个点的逐个淡入淡出表达“正在思考”
 */
const OpponentThinkingHint: React.FC<{ opponentName: string }> = ({ opponentName }) => {
    const { t } = useTranslation('game-dicethrone');

    const Dot: React.FC<{ delayMs: number }> = ({ delayMs }) => (
        <span
            className="inline-block w-[0.6em]"
            style={{
                animation: `dicethrone-thinking-dot 1.1s ${delayMs}ms infinite ease-in-out`,
            }}
            aria-hidden="true"
        >
            ·
        </span>
    );

    return (
        <div
            className="fixed top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ zIndex: UI_Z_INDEX.overlayRaised }}
        >
            {/* 纯文字 + 文字描边发光，无背景遮罩 */}
            <div
                className="text-center px-[1vw] py-[0.5vw]"
                style={{
                    animation: 'dicethrone-thinking-glow-text 2.5s infinite ease-in-out',
                }}
            >
                <div
                    className="text-amber-400 text-[2.4vw] font-black tracking-wider"
                    style={{
                        textShadow: '0 0 12px rgba(251,191,36,0.8), 0 0 24px rgba(251,191,36,0.4), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)',
                    }}
                >
                    {opponentName}
                </div>

                <div
                    className="text-amber-300 text-[1.4vw] font-bold mt-[0.3vw]"
                    style={{
                        textShadow: '0 0 10px rgba(251,191,36,0.6), 0 0 20px rgba(251,191,36,0.3), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)',
                    }}
                >
                    <span>{t('waiting.thinkingMessage')}</span>
                    <span className="inline-flex items-baseline">
                        <Dot delayMs={0} />
                        <Dot delayMs={160} />
                        <Dot delayMs={320} />
                    </span>
                </div>
            </div>

            <style>
                {`
                @keyframes dicethrone-thinking-dot {
                    0%, 20% { opacity: 0.15; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-0.04em); }
                    80%, 100% { opacity: 0.15; transform: translateY(0); }
                }
                @keyframes dicethrone-thinking-glow-text {
                    0%, 100% { filter: brightness(1); }
                    50% { filter: brightness(1.15); }
                }
                `}
            </style>
        </div>
    );
};



/**
 * 响应窗口：当前玩家可响应
 */
const ResponseWindowHint: React.FC<{
    onResponsePass: () => void;
    offsetClass?: string;
}> = ({ onResponsePass, offsetClass = 'bottom-[16vw]' }) => {
    const { t } = useTranslation('game-dicethrone');

    return (
        <div
            className={`absolute ${offsetClass} left-1/2 -translate-x-1/2`}
            style={{ zIndex: UI_Z_INDEX.hint }}
        >
            <div
                className="flex items-center gap-[1.2vw] px-[2vw] py-[0.8vw] rounded-full bg-black/80 border-2 border-purple-400/70 shadow-[0_0_16px_rgba(168,85,247,0.35)] backdrop-blur-sm"
                style={{
                    animation: 'dicethrone-response-pulse 2s infinite ease-in-out',
                }}
            >
                <span className="text-purple-200 text-[1vw] font-bold tracking-wider">
                    {t('response.yourTurn')}
                </span>
                <GameButton
                    onClick={onResponsePass}
                    variant="glass"
                    size="sm"
                    className="border-purple-400/60 hover:bg-purple-500/30 text-purple-100 text-[0.8vw] py-[0.4vw] px-[1.2vw] min-h-0"
                >
                    {t('response.pass')}
                </GameButton>
            </div>

            <style>
                {`
                @keyframes dicethrone-response-pulse {
                    0%, 100% { box-shadow: 0 0 16px rgba(168,85,247,0.35); }
                    50% { box-shadow: 0 0 24px rgba(168,85,247,0.55), 0 0 48px rgba(168,85,247,0.15); }
                }
                `}
            </style>
        </div>
    );
};

/**
 * 被动重掷选择提示
 */
const PassiveRerollHint: React.FC = () => {
    const { t } = useTranslation('game-dicethrone');

    return (
        <div
            className="absolute top-[6vw] left-1/2 -translate-x-1/2 pointer-events-none animate-pulse"
            style={{ zIndex: UI_Z_INDEX.hint }}
        >
            <div className="bg-emerald-600/90 backdrop-blur-sm rounded-xl px-[2vw] py-[0.6vw] border border-emerald-400/60 shadow-lg text-center">
                <span className="text-white font-bold text-[1vw] tracking-wide">
                    {t('passive.selectDieHint')}
                </span>
            </div>
        </div>
    );
};

/**
 * 游戏提示统一管理组件
 */
export const GameHints: React.FC<GameHintsProps> = ({
    isDiscardMode,
    mustDiscardCount,
    isDiceInteraction,
    isInteractionOwner,
    pendingInteraction,
    isWaitingOpponent,
    opponentName,
    isResponder,
    thinkingOffsetClass,
    onResponsePass,
    isPassiveRerollSelecting,
}) => {
    return (
        <>
            {/* 弃牌阶段提示 Banner */}
            {isDiscardMode && (
                <DiscardHint mustDiscardCount={mustDiscardCount} />
            )}

            {/* 骰子交互提示（画面顶部中央） */}
            {isDiceInteraction && isInteractionOwner && pendingInteraction && (
                <DiceInteractionHint pendingInteraction={pendingInteraction} />
            )}

            {/* 被动重掷选择提示 */}
            {isPassiveRerollSelecting && (
                <PassiveRerollHint />
            )}

            {/* 对手思考中提示（画面正中央，无背景，缓慢闪烁） */}
            {isWaitingOpponent && (
                <OpponentThinkingHint opponentName={opponentName} />
            )}

            {/* 响应窗口：当前玩家可响应 */}
            {isResponder && (
                <ResponseWindowHint
                    onResponsePass={onResponsePass}
                    offsetClass={thinkingOffsetClass}
                />
            )}
        </>
    );
};
