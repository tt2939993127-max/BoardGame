import React from 'react';
import type { RefObject } from 'react';
import type { HeroState, TurnPhase } from '../types';
import type { TokenDef } from '../domain/tokenTypes';
import { PhaseIndicator } from './PhaseIndicator';
import { StatusEffectsContainer, TokensContainer, type StatusAtlases } from './statusEffects';
import { PlayerStats } from './PlayerStats';
import { DrawDeck } from './DrawDeck';
import { STATUS_IDS } from '../domain/ids';
import type { HitStopConfig } from '../../../components/common/animations';
import { UI_Z_INDEX } from '../../../core';
import { AutoResponseToggle } from './AutoResponseToggle';
import { buildRuntimeInlineUnitValue } from '../../mobileSupport';


export const LeftSidebar = ({
    currentPhase,
    viewPlayer,
    locale,
    statusIconAtlas,
    selfBuffRef,
    selfHpRef,
    selfCpRef,
    hitStopActive,
    hitStopConfig,
    drawDeckRef,
    onPurifyClick,
    canUsePurify,
    tokenDefinitions,
    onKnockdownClick,
    canRemoveKnockdown,
    isSelfShaking,
    selfDamageFlashActive,
    selfDamageFlashDamage,
    overrideHp,
    onAutoResponseToggle,
}: {
    currentPhase: TurnPhase;
    viewPlayer: HeroState;
    locale?: string;
    statusIconAtlas?: StatusAtlases | null;
    selfBuffRef?: RefObject<HTMLDivElement | null>;
    selfHpRef?: RefObject<HTMLDivElement | null>;
    selfCpRef?: RefObject<HTMLDivElement | null>;
    hitStopActive?: boolean;
    hitStopConfig?: HitStopConfig;
    drawDeckRef?: RefObject<HTMLDivElement | null>;
    /** 点击净化 Token 的回调 */
    onPurifyClick?: () => void;
    /** 是否可以使用净化（有净化 Token 且有负面状态） */
    canUsePurify?: boolean;
    /** Token 定义列表（用于判断哪些 Token 可点击） */
    tokenDefinitions?: TokenDef[];
    /** 点击击倒状态的回调 */
    onKnockdownClick?: () => void;
    /** 是否可以移除击倒（有击倒状态且 CP >= 2 且在正确阶段） */
    canRemoveKnockdown?: boolean;
    /** 自己是否正在震动（受击） */
    isSelfShaking?: boolean;
    /** 自己受击 DamageFlash 是否激活 */
    selfDamageFlashActive?: boolean;
    /** 自己受击伤害值 */
    selfDamageFlashDamage?: number;
    /** 视觉状态缓冲覆盖的 HP 值（飞行动画到达前冻结） */
    overrideHp?: number;
    /** 自动响应开关回调 */
    onAutoResponseToggle?: (enabled: boolean) => void;
}) => {
    const inlineUnit = buildRuntimeInlineUnitValue;
    return (
        <div
            className="absolute top-0 flex flex-col items-center pointer-events-auto"
            style={{
                zIndex: UI_Z_INDEX.hud,
                left: inlineUnit(1.5),
                bottom: inlineUnit(1.5),
                width: inlineUnit(15),
            }}
        >
            {/* 回合顺序 - 上移 */}
            <div
                className="w-full"
                style={{
                    paddingTop: '0.2rem',
                    paddingLeft: inlineUnit(1),
                    paddingRight: inlineUnit(1),
                }}
            >
                <PhaseIndicator currentPhase={currentPhase} />
            </div>
            <div className="flex-grow" />
            <div className="w-full flex flex-col items-center" style={{ gap: inlineUnit(0.5) }}>
                {/*
                 * selfBuffRef is used as the end position for buff/status flying effects.
                 * Use a small offset above the HP container so the effect doesn't land too low.
                 */}
                <div
                    className="w-full flex flex-col-reverse"
                    style={{
                        paddingLeft: inlineUnit(1.2),
                        paddingRight: inlineUnit(1.2),
                        gap: inlineUnit(0.3),
                    }}
                    ref={selfBuffRef}
                    data-tutorial-id="status-tokens"
                >
                    <TokensContainer
                        tokens={viewPlayer.tokens ?? {}}
                        maxPerRow={5}
                        size="normal"
                        className="flex-wrap-reverse justify-start gap-[0.3vw]"
                        locale={locale}
                        atlas={statusIconAtlas}
                        tokenDefinitions={tokenDefinitions}
                        tokenStackLimits={viewPlayer.tokenStackLimits}
                        onTokenClick={(tokenId) => {
                            // 从定义中查找该 Token 是否有 removeDebuff 效果（即净化类 Token）
                            const tokenDef = tokenDefinitions?.find(def => def.id === tokenId);
                            if (tokenDef?.activeUse?.effect.type === 'removeDebuff' && onPurifyClick) {
                                onPurifyClick();
                            }
                        }}
                        clickableTokens={canUsePurify
                            ? (tokenDefinitions ?? []).filter(def => def.activeUse?.effect.type === 'removeDebuff').map(def => def.id)
                            : []
                        }
                    />
                    <StatusEffectsContainer
                        effects={viewPlayer.statusEffects ?? {}}
                        maxPerRow={5}
                        size="normal"
                        className="flex-wrap-reverse justify-start gap-[0.3vw]"
                        locale={locale}
                        atlas={statusIconAtlas}
                        onEffectClick={(effectId) => {
                            if (effectId === STATUS_IDS.KNOCKDOWN && onKnockdownClick) {
                                onKnockdownClick();
                            }
                        }}
                        clickableEffects={canRemoveKnockdown ? [STATUS_IDS.KNOCKDOWN] : []}
                    />
                </div>
                {/* 血条和自动响应开关容器 */}
                <div
                    className="w-full"
                    style={{
                        paddingLeft: inlineUnit(1),
                        paddingRight: inlineUnit(1),
                    }}
                    data-tutorial-id="player-stats"
                >
                    <div className="w-full flex flex-col" style={{ gap: inlineUnit(0.4) }}>
                        <PlayerStats
                            player={viewPlayer}
                            hpRef={selfHpRef}
                            cpRef={selfCpRef}
                            hitStopActive={hitStopActive}
                            hitStopConfig={hitStopConfig}
                            isShaking={isSelfShaking}
                            damageFlashActive={selfDamageFlashActive}
                            damageFlashDamage={selfDamageFlashDamage}
                            overrideHp={overrideHp}
                        />
                        {/* 自动响应开关 - 相对血条居中 */}
                        <div className="flex justify-center">
                            <AutoResponseToggle onToggle={onAutoResponseToggle} />
                        </div>
                    </div>
                </div>
                <div
                    className="w-full"
                    style={{
                        paddingLeft: inlineUnit(1),
                        paddingRight: inlineUnit(1),
                        paddingTop: inlineUnit(0.3),
                    }}
                    data-tutorial-id="draw-deck"
                >
                    <DrawDeck ref={drawDeckRef} count={viewPlayer.deck.length} locale={locale} />
                </div>
            </div>
        </div>
    );
};
