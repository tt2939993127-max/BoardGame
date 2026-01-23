import React from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { DiceThroneState, HeroState, AbilityCard, Die, TurnPhase } from './types';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '../../components/common/OptimizedImage';
import { InfoTooltip } from '../../components/common/InfoTooltip';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import {
    FlyingEffectsLayer,
    useFlyingEffects,
    getViewportCenter,
    getElementCenter,
} from '../../components/common/animations/FlyingEffect';
import { ShakeContainer, useShake } from '../../components/common/animations/ShakeContainer';
import { usePulseGlow } from '../../components/common/animations/PulseGlow';
import { buildLocalizedImageSet, getLocalizedAssetPath } from '../../core';

type DiceThroneBoardProps = BoardProps<DiceThroneState>;

type TranslateFn = (key: string, options?: Record<string, unknown>) => string | string[];

const resolveI18nList = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

// --- Constants & Assets ---
const ASSETS = {
    PLAYER_BOARD: 'dicethrone/images/monk/compressed/monk-player-board',
    TIP_BOARD: 'dicethrone/images/monk/compressed/monk-tip-board',
    CARDS_ATLAS: 'dicethrone/images/monk/compressed/monk-ability-cards', // Atlas (Sprite)
    ABILITY_CARDS_BASE: 'dicethrone/images/monk/compressed/monk-base-ability-cards', // Base 8 Abilities Sprite
    DICE_SPRITE: 'dicethrone/images/monk/compressed/dice-sprite', // Sprite 3x3
    EFFECT_ICONS: 'dicethrone/images/monk/compressed/status-icons-atlas',
    CARD_BG: 'dicethrone/images/Common/compressed/card-background',
    AVATAR: 'dicethrone/images/Common/compressed/character-portraits',
};

const DICE_ATLAS: {
    cols: number;
    rows: number;
    faceMap: Record<number, { col: number; row: number }>;
} = {
    cols: 3,
    rows: 3,
    faceMap: {
        1: { col: 0, row: 2 },
        2: { col: 0, row: 1 },
        3: { col: 1, row: 2 },
        4: { col: 1, row: 1 },
        5: { col: 2, row: 1 },
        6: { col: 2, row: 2 },
    },
};

const DICE_BG_SIZE = `${DICE_ATLAS.cols * 100}% ${DICE_ATLAS.rows * 100}%`;

const getDiceSpritePosition = (value: number) => {
    const mapping = DICE_ATLAS.faceMap[value] ?? DICE_ATLAS.faceMap[1];
    const xPos = DICE_ATLAS.cols > 1 ? (mapping.col / (DICE_ATLAS.cols - 1)) * 100 : 0;
    const yPos = DICE_ATLAS.rows > 1 ? (mapping.row / (DICE_ATLAS.rows - 1)) * 100 : 0;
    return { xPos, yPos };
};

const getBonusFaceLabel = (value: number, t: TranslateFn) => {
    const face = value === 1 || value === 2
        ? 'fist'
        : value === 3
            ? 'palm'
            : value === 4 || value === 5
                ? 'taiji'
                : 'lotus';
    return t(`dice.face.${face}`) as string;
};

// --- 角色头像图集裁切配置（deckRect + 10x2 网格）---
const PORTRAIT_ATLAS = {
    imageW: 3950,
    imageH: 4096,
    deckX: 0,
    deckY: 0,
    deckW: 3934,
    deckH: 1054,
    cols: 10,
    rows: 2,
};

const PORTRAIT_CELL_W = PORTRAIT_ATLAS.deckW / PORTRAIT_ATLAS.cols;
const PORTRAIT_CELL_H = PORTRAIT_ATLAS.deckH / PORTRAIT_ATLAS.rows;
const PORTRAIT_BG_SIZE = {
    x: (PORTRAIT_ATLAS.imageW / PORTRAIT_CELL_W) * 100,
    y: (PORTRAIT_ATLAS.imageH / PORTRAIT_CELL_H) * 100,
};

const CHARACTER_PORTRAIT_INDEX: Record<HeroState['characterId'], number> = {
    monk: 3,
};

const getPortraitAtlasPosition = (index: number) => {
    const safeIndex = index % (PORTRAIT_ATLAS.cols * PORTRAIT_ATLAS.rows);
    const col = safeIndex % PORTRAIT_ATLAS.cols;
    const row = Math.floor(safeIndex / PORTRAIT_ATLAS.cols);
    const x = PORTRAIT_ATLAS.deckX + col * PORTRAIT_CELL_W;
    const y = PORTRAIT_ATLAS.deckY + row * PORTRAIT_CELL_H;
    const xPos = (x / (PORTRAIT_ATLAS.imageW - PORTRAIT_CELL_W)) * 100;
    const yPos = (y / (PORTRAIT_ATLAS.imageH - PORTRAIT_CELL_H)) * 100;
    return { xPos, yPos };
};

const getPortraitStyle = (characterId: HeroState['characterId'], locale?: string) => {
    const index = CHARACTER_PORTRAIT_INDEX[characterId] ?? 0;
    const { xPos, yPos } = getPortraitAtlasPosition(index);
    return {
        backgroundImage: buildLocalizedImageSet(ASSETS.AVATAR, locale),
        backgroundSize: `${PORTRAIT_BG_SIZE.x}% ${PORTRAIT_BG_SIZE.y}%`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `${xPos}% ${yPos}%`,
    } as React.CSSProperties;
};

// --- Helper Components ---

// 1. Phase Indicator (Left Side)
const getPhaseInfo = (t: TranslateFn): Record<TurnPhase, { label: string; desc: string[] }> => ({
    setup: { label: t('phase.setup.label') as string, desc: [] },
    upkeep: {
        label: t('phase.upkeep.label') as string,
        desc: resolveI18nList(t('phase.upkeep.desc', { returnObjects: true, defaultValue: [] })),
    },
    income: {
        label: t('phase.income.label') as string,
        desc: resolveI18nList(t('phase.income.desc', { returnObjects: true, defaultValue: [] })),
    },
    main1: {
        label: t('phase.main1.label') as string,
        desc: resolveI18nList(t('phase.main1.desc', { returnObjects: true, defaultValue: [] })),
    },
    offensiveRoll: {
        label: t('phase.offensiveRoll.label') as string,
        desc: resolveI18nList(t('phase.offensiveRoll.desc', { returnObjects: true, defaultValue: [] })),
    },
    defensiveRoll: {
        label: t('phase.defensiveRoll.label') as string,
        desc: resolveI18nList(t('phase.defensiveRoll.desc', { returnObjects: true, defaultValue: [] })),
    },
    main2: {
        label: t('phase.main2.label') as string,
        desc: resolveI18nList(t('phase.main2.desc', { returnObjects: true, defaultValue: [] })),
    },
    discard: {
        label: t('phase.discard.label') as string,
        desc: resolveI18nList(t('phase.discard.desc', { returnObjects: true, defaultValue: [] })),
    },
});

const PhaseIndicator = ({ currentPhase }: { currentPhase: TurnPhase }) => {
    const { t } = useTranslation('game-dicethrone');
    const phaseInfo = React.useMemo(() => getPhaseInfo(t), [t]);
    const phaseOrder: TurnPhase[] = ['upkeep', 'income', 'main1', 'offensiveRoll', 'defensiveRoll', 'main2', 'discard'];
    const [hoveredPhase, setHoveredPhase] = React.useState<TurnPhase | null>(null);

    return (
        <div className="flex flex-col gap-[0.4vw] pointer-events-auto opacity-90 w-full z-[80]">
            <h3 className="text-[1.2vw] font-black text-slate-400 mb-[0.4vw] tracking-widest uppercase truncate">{t('phase.title')}</h3>
            {phaseOrder.map(pid => {
                const info = phaseInfo[pid];
                const isActive = currentPhase === pid;
                const isHovered = hoveredPhase === pid;

                return (
                    <div
                        key={pid}
                        className="relative group/phase"
                        onMouseEnter={() => setHoveredPhase(pid)}
                        onMouseLeave={() => setHoveredPhase(null)}
                    >
                        <div
                            className={`
                                relative z-10 px-[0.8vw] py-[0.4vw] text-[0.8vw] font-bold rounded-r-[0.5vw] transition-all duration-300 border-l-[0.3vw] truncate cursor-help
                                ${isActive
                                    ? 'bg-amber-600 text-white border-amber-300 translate-x-[0.5vw] shadow-[0_0_1vw_rgba(245,158,11,0.5)]'
                                    : 'bg-black/40 text-slate-500 border-slate-700 hover:bg-slate-800 hover:text-slate-300'}
                            `}
                        >
                            {info.label}
                        </div>

                        {/* Info Bubble (Show on Hover) */}
                        <InfoTooltip
                            title={info.label}
                            content={info.desc}
                            isVisible={isHovered}
                            position="right"
                        />
                    </div>
                );
            })}
        </div>
    );
};

// 2b. Status Effect Display - Buff/Debuff图标显示组件
const STATUS_ICON_ATLAS_JSON = 'dicethrone/images/monk/status-icons-atlas.json';

type StatusIconAtlasFrame = { x: number; y: number; w: number; h: number };
type StatusIconAtlasConfig = {
    imageW: number;
    imageH: number;
    frames: Record<string, StatusIconAtlasFrame>;
};

type StatusIconAtlasResponse = {
    meta: { size: { w: number; h: number } };
    frames: Record<string, { frame: StatusIconAtlasFrame }>;
};

const isStatusIconAtlasResponse = (value: unknown): value is StatusIconAtlasResponse => {
    if (!value || typeof value !== 'object') return false;
    const data = value as StatusIconAtlasResponse;
    const size = data.meta?.size;
    const frames = data.frames;
    if (!size || typeof size.w !== 'number' || typeof size.h !== 'number') return false;
    if (!frames || typeof frames !== 'object') return false;
    return Object.values(frames).every((entry) => {
        const frame = entry?.frame;
        return Boolean(frame)
            && typeof frame.x === 'number'
            && typeof frame.y === 'number'
            && typeof frame.w === 'number'
            && typeof frame.h === 'number';
    });
};

const loadStatusIconAtlasConfig = async (): Promise<StatusIconAtlasConfig> => {
    const url = getLocalizedAssetPath(STATUS_ICON_ATLAS_JSON);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`状态图标图集加载失败: ${STATUS_ICON_ATLAS_JSON}`);
    }
    const data: unknown = await response.json();
    if (!isStatusIconAtlasResponse(data)) {
        throw new Error(`状态图标图集格式不正确: ${STATUS_ICON_ATLAS_JSON}`);
    }
    const frames = Object.fromEntries(
        Object.entries(data.frames).map(([key, entry]) => [key, entry.frame])
    );
    return { imageW: data.meta.size.w, imageH: data.meta.size.h, frames };
};

type StatusEffectMeta = {
    color?: string;
    icon?: string;
    frameId?: string;
};

const STATUS_EFFECT_META: Record<string, StatusEffectMeta> = {
    evasive: {
        frameId: 'dodge',
    },
    taiji: {
        frameId: 'tai-chi',
    },
    stun: {
        frameId: 'knockdown',
    },
    purify: {
        frameId: 'purify',
    },
    chi: {
        icon: '🔥',
        color: 'from-orange-500 to-red-500',
    },
};

const getStatusIconFrameStyle = (atlas: StatusIconAtlasConfig, frame: StatusIconAtlasFrame) => {
    const xPos = atlas.imageW === frame.w ? 0 : (frame.x / (atlas.imageW - frame.w)) * 100;
    const yPos = atlas.imageH === frame.h ? 0 : (frame.y / (atlas.imageH - frame.h)) * 100;
    const bgSizeX = (atlas.imageW / frame.w) * 100;
    const bgSizeY = (atlas.imageH / frame.h) * 100;
    return {
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${xPos}% ${yPos}%`,
    } as React.CSSProperties;
};

const getStatusEffectIconNode = (
    meta: StatusEffectMeta,
    locale: string | undefined,
    size: 'small' | 'normal' | 'fly' | 'choice',
    atlas?: StatusIconAtlasConfig | null
) => {
    const frame = meta.frameId ? atlas?.frames[meta.frameId] : undefined;
    if (!frame || !atlas) {
        return <span className="drop-shadow-md">{meta.icon ?? '❓'}</span>;
    }
    const sizeClass = size === 'choice' ? 'w-full h-full' : 'w-full h-full';
    const frameStyle = getStatusIconFrameStyle(atlas, frame);

    return (
        <span
            className={`block ${sizeClass} drop-shadow-md`}
            style={{
                backgroundImage: buildLocalizedImageSet(ASSETS.EFFECT_ICONS, locale),
                backgroundSize: frameStyle.backgroundSize,
                backgroundPosition: frameStyle.backgroundPosition,
                backgroundRepeat: 'no-repeat',
            }}
        />
    );
};

const StatusEffectBadge = ({
    effectId,
    stacks,
    size = 'normal',
    locale,
    atlas,
}: {
    effectId: string;
    stacks: number;
    size?: 'normal' | 'small';
    locale?: string;
    atlas?: StatusIconAtlasConfig | null;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const meta = STATUS_EFFECT_META[effectId] || { icon: '❓', color: 'from-gray-500 to-gray-600' };
    const hasSprite = Boolean(meta.frameId && atlas?.frames[meta.frameId]);
    const description = resolveI18nList(
        t(`statusEffects.${effectId}.description`, { returnObjects: true, defaultValue: [] })
    );
    const info = {
        ...meta,
        name: t(`statusEffects.${effectId}.name`, { defaultValue: effectId }) as string,
        description,
    };
    const [isHovered, setIsHovered] = React.useState(false);
    const sizeClass = size === 'small' ? 'w-[2vw] h-[2vw] text-[0.8vw]' : 'w-[2.5vw] h-[2.5vw] text-[1vw]';
    const stackSizeClass = size === 'small' ? 'text-[0.5vw] min-w-[0.8vw] h-[0.8vw]' : 'text-[0.6vw] min-w-[1vw] h-[1vw]';

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`
                    ${sizeClass} rounded-full flex items-center justify-center overflow-hidden
                    ${hasSprite
                        ? 'bg-transparent border-0 shadow-none'
                        : `bg-gradient-to-br ${info.color ?? 'from-gray-500 to-gray-600'} shadow-lg border border-white/30`}
                    transition-transform duration-200 hover:scale-110 cursor-help
                `}
            >
                {getStatusEffectIconNode(info, locale, size === 'small' ? 'small' : 'normal', atlas)}
            </div>
            {stacks > 1 && (
                <div className={`absolute -bottom-[0.2vw] -right-[0.2vw] ${stackSizeClass} bg-black/80 text-white font-bold rounded-full flex items-center justify-center border border-white/50`}>
                    {stacks}
                </div>
            )}

            {/* Tooltip */}
            <InfoTooltip
                title={`${info.name}${stacks > 1 ? ` ×${stacks}` : ''}`}
                content={info.description}
                isVisible={isHovered}
                position="right"
            />
        </div>
    );
};

const StatusEffectsContainer = ({
    effects,
    maxPerRow = 3,
    size = 'normal',
    className = '',
    locale,
    atlas,
}: {
    effects: Record<string, number>;
    maxPerRow?: number;
    size?: 'normal' | 'small';
    className?: string;
    locale?: string;
    atlas?: StatusIconAtlasConfig | null;
}) => {
    const activeEffects = Object.entries(effects).filter(([, stacks]) => stacks > 0);
    if (activeEffects.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-[0.3vw] ${className}`} style={{ maxWidth: `${maxPerRow * 3}vw` }}>
            {activeEffects.map(([effectId, stacks]) => (
                <StatusEffectBadge
                    key={effectId}
                    effectId={effectId}
                    stacks={stacks}
                    size={size}
                    locale={locale}
                    atlas={atlas}
                />
            ))}
        </div>
    );
};

// 2c. Flying Effect - 已移至 components/common/animations/FlyingEffect.tsx

// 2. Stats Area (Left Top - Just below Phase)
const PlayerStats = ({
    player,
    hpRef,
}: {
    player: HeroState;
    hpRef?: React.RefObject<HTMLDivElement | null>;
}) => {
    const { t } = useTranslation('game-dicethrone');
    return (
        <div className="flex flex-col gap-[0.8vw] w-full bg-slate-900/80 p-[0.8vw] rounded-[0.8vw] border border-slate-600/50 shadow-xl backdrop-blur-md z-20 hover:bg-slate-900 transition-colors">
            {/* HP Bar */}
            <div ref={hpRef} className="relative w-full h-[1.8vw] bg-black/50 rounded-full border border-white/10 overflow-hidden group/hp">
                <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-900 to-red-600 transition-all duration-500 ease-out"
                    style={{ width: `${(player.health / 50) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-[0.8vw]">
                    <span className="text-[0.8vw] font-bold text-red-200/80 tracking-wider">{t('hud.health')}</span>
                    <span className="text-[1.1vw] font-black text-white drop-shadow-md">{player.health}</span>
                </div>
            </div>

            {/* CP Bar */}
            <div className="relative w-full h-[1.8vw] bg-black/50 rounded-full border border-white/10 overflow-hidden group/cp">
                <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-800 to-amber-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, (player.cp / 6) * 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-[0.8vw]">
                    <span className="text-[0.8vw] font-bold text-amber-200/80 tracking-wider">{t('hud.energy')}</span>
                    <span className="text-[1.1vw] font-black text-white drop-shadow-md">{player.cp}</span>
                </div>
            </div>
        </div>
    );
};

// 2e. Draw Deck (Left Bottom)
const DrawDeck = ({ count, locale }: { count: number; locale?: string }) => {
    const { t } = useTranslation('game-dicethrone');
    return (
        <div className="relative group cursor-pointer perspective-500 w-[10.2vw]">
            <div className="absolute inset-0 bg-slate-800 rounded-[0.5vw] transform translate-x-[0.2vw] translate-y-[0.2vw]"></div>
            <div className="w-full aspect-[0.7] rounded-[0.5vw] overflow-hidden shadow-2xl border border-slate-600 relative z-10 hover:-translate-y-[0.3vw] transition-transform duration-300 bg-slate-900">
                <OptimizedImage
                    src={getLocalizedAssetPath(ASSETS.CARD_BG, locale)}
                    fallbackSrc={ASSETS.CARD_BG}
                    className="w-full h-full object-cover"
                    alt={t('imageAlt.deck')}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-slate-100">
                    <span className="text-[0.6vw] tracking-widest mb-[0.2vw] text-slate-200 drop-shadow-sm">{t('hud.deck')}</span>
                    <span className="text-[1.8vw] text-white leading-none drop-shadow-md">{count}</span>
                </div>
            </div>
        </div>
    );
};

// 3D Dice Component
const Dice3D = ({ value, isRolling, index, size = '4.5vw', locale }: { value: number; isRolling: boolean; index: number; size?: string; locale?: string }) => {
    // translateZ must be 50% of the cube size to form a perfect cube
    const translateZ = `calc(${size} / 2)`;

    const faces = [
        { id: 1, trans: `translateZ(${translateZ})` },
        { id: 6, trans: `rotateY(180deg) rotateZ(180deg) translateZ(${translateZ})` },
        { id: 3, trans: `rotateY(90deg) translateZ(${translateZ})` },
        { id: 4, trans: `rotateY(-90deg) translateZ(${translateZ})` },
        { id: 2, trans: `rotateX(90deg) translateZ(${translateZ})` },
        { id: 5, trans: `rotateX(-90deg) translateZ(${translateZ})` },
    ];

    const getFinalTransform = (val: number) => {
        switch (val) {
            case 1: return 'rotateX(0deg) rotateY(0deg)';
            case 6: return 'rotateX(180deg) rotateY(0deg)';
            case 2: return 'rotateX(-90deg) rotateY(0deg)';
            case 5: return 'rotateX(90deg) rotateY(0deg)';
            case 3: return 'rotateX(0deg) rotateY(-90deg)';
            case 4: return 'rotateX(0deg) rotateY(90deg)';
            default: return 'rotateY(0deg)';
        }
    };

    return (
        <div
            className="relative perspective-1000"
            style={{ width: size, height: size }}
        >
            <div
                className={`relative w-full h-full transform-style-3d transition-transform duration-[1000ms] ease-out ${isRolling ? 'animate-tumble' : ''}`}
                style={{
                    transform: isRolling
                        ? `rotateX(${720 + index * 90}deg) rotateY(${720 + index * 90}deg)`
                        : getFinalTransform(value)
                }}
            >
                {faces.map((face) => {
                    const { xPos, yPos } = getDiceSpritePosition(face.id);
                    return (
                    <div
                        key={face.id}
                        className="absolute inset-0 w-full h-full bg-slate-900 rounded-[0.5vw] backface-hidden border border-slate-700/50 shadow-inner"
                        style={{
                            transform: face.trans,
                            backgroundImage: buildLocalizedImageSet(ASSETS.DICE_SPRITE, locale),
                            backgroundSize: DICE_BG_SIZE,
                            backgroundPosition: `${xPos}% ${yPos}%`,
                            boxShadow: 'inset 0 0 1vw rgba(0,0,0,0.8)',
                            imageRendering: 'auto'
                        }}
                    />
                    );
                })}
            </div>
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                @keyframes tumble {
                    0% { transform: rotateX(0) rotateY(0); }
                    100% { transform: rotateX(1440deg) rotateY(1440deg); }
                }
                .animate-tumble { animation: tumble 1s linear infinite; }
            `}</style>
        </div>
    );
};

// 3. Dice Tray (Right Side)
const DiceTray = ({
    dice,
    onToggleLock,
    currentPhase,
    canInteract,
    isRolling,
    locale,
}: {
    dice: Die[];
    onToggleLock: (id: number) => void;
    currentPhase: TurnPhase;
    canInteract: boolean;
    isRolling: boolean;
    locale?: string;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const isRollPhase = currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
    const diceSize = '4.2vw';

    return (
        <div className="flex flex-col items-center bg-slate-900/90 p-[0.6vw] rounded-[1vw] border border-slate-700 backdrop-blur-lg shadow-2xl gap-[0.5vw] w-[6.8vw] shrink-0 relative overflow-hidden">
            {!canInteract && isRollPhase && (
                <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-[2px] p-[1vw] text-center">
                    <div className="flex flex-col items-center gap-[0.5vw]">
                        <div className="w-[1.5vw] h-[1.5vw] border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-amber-500 font-bold text-[0.7vw] uppercase tracking-tighter">{t('dice.waitingOpponent')}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-[0.5vw] items-center justify-center w-full p-[0.2vw]">
                {dice.map((d, i) => (
                    <div
                        key={d.id}
                        onClick={() => !isRolling && canInteract && onToggleLock(d.id)}
                        className={`
                            relative flex-shrink-0 cursor-pointer group
                            ${d.isKept ? 'opacity-80' : 'hover:scale-110'}
                            ${!canInteract ? 'cursor-not-allowed opacity-50' : ''}
                            transition-transform duration-200
                         `}
                    >
                        <Dice3D value={d.value} isRolling={isRolling && !d.isKept} index={i} size={diceSize} locale={locale} />
                        {d.isKept && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="text-[0.6vw] font-black text-white bg-black/50 px-[0.4vw] py-[0.1vw] rounded uppercase tracking-wider backdrop-blur-sm shadow-sm border border-white/20">
                                    {t('dice.locked')}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="h-px bg-white/10" />

            <button
                onClick={handleRollClick}
                disabled={isRolling || !canInteract || rollConfirmed || (rollCount >= rollLimit)}
                className={`
                    w-full py-[0.8vw] rounded-[0.6vw] font-bold text-[0.8vw] uppercase tracking-wider shadow-lg transition-all active:scale-95
                    ${isRollPhase && canInteract && !rollConfirmed && rollCount < rollLimit
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:brightness-110 shadow-amber-900/50'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                `}
            >
                {isRolling ? t('dice.rolling') : t('dice.roll', { current: rollCount, total: rollLimit })}
            </button>

            {isRollPhase && (
                <button
                    onClick={onConfirm}
                    disabled={rollConfirmed || rollCount === 0 || !canInteract}
                    className={`
                        w-full py-[0.7vw] rounded-[0.6vw] font-bold text-[0.75vw] uppercase tracking-wider shadow-lg transition-all active:scale-95
                        ${rollConfirmed
                            ? 'bg-emerald-700 text-emerald-100 border border-emerald-500/60'
                            : (canInteract ? 'bg-slate-800 text-slate-300 hover:bg-emerald-700/80 border border-slate-600' : 'bg-slate-900 text-slate-600 border border-slate-800')}
                        ${rollCount === 0 || !canInteract ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                >
                    {rollConfirmed ? t('dice.confirmed') : t('dice.confirm')}
                </button>
            )}
        </div>
    );
};

// 4. Discard Pile (Right Bottom)
const DiscardPile = ({ cards, locale }: { cards: AbilityCard[]; locale?: string }) => {
    const { t } = useTranslation('game-dicethrone');
    const topCard = cards[cards.length - 1];
    return (
        <div className="relative group perspective-500 w-full aspect-[0.7] rounded-[0.5vw] border-[0.2vw] border-dashed border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg">
            {!topCard && <div className="text-[0.8vw] font-bold uppercase tracking-widest text-slate-600">{t('hud.discardPile')}</div>}
            {topCard && (
                <OptimizedImage
                    src={getLocalizedAssetPath(ASSETS.CARDS_ATLAS, locale)}
                    fallbackSrc={ASSETS.CARDS_ATLAS}
                    className="w-full h-full object-cover scale-110"
                    alt={t('imageAlt.discard')}
                />
            )}
        </div>
    );
};

// --- 卡牌图集裁切配置（按行/列真实起点/尺寸）---
type CardAtlasConfig = {
    imageW: number;
    imageH: number;
    cols: number;
    rows: number;
    rowStarts: number[];
    rowHeights: number[];
    colStarts: number[];
    colWidths: number[];
};

const CARD_ATLAS_JSON = `${ASSETS.CARDS_ATLAS}.atlas.json`;

const isNumberArray = (value: unknown): value is number[] => (
    Array.isArray(value) && value.every((item) => typeof item === 'number')
);

const isCardAtlasConfig = (value: unknown): value is CardAtlasConfig => {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return typeof data.imageW === 'number'
        && typeof data.imageH === 'number'
        && typeof data.rows === 'number'
        && typeof data.cols === 'number'
        && isNumberArray(data.rowStarts)
        && isNumberArray(data.rowHeights)
        && isNumberArray(data.colStarts)
        && isNumberArray(data.colWidths);
};

const loadCardAtlasConfig = async (locale?: string): Promise<CardAtlasConfig> => {
    const basePath = getLocalizedAssetPath(CARD_ATLAS_JSON);
    const localizedPath = locale ? getLocalizedAssetPath(CARD_ATLAS_JSON, locale) : basePath;
    const candidates = localizedPath === basePath ? [basePath] : [localizedPath, basePath];

    for (const url of candidates) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data: unknown = await response.json();
            if (isCardAtlasConfig(data)) return data;
        } catch {
            // 忽略单个路径错误，继续尝试下一候选
        }
    }

    throw new Error(`未找到卡牌图集配置: ${CARD_ATLAS_JSON}`);
};

const getCardAtlasStyle = (index: number, atlas: CardAtlasConfig) => {
    const safeIndex = index % (atlas.cols * atlas.rows);
    const col = safeIndex % atlas.cols;
    const row = Math.floor(safeIndex / atlas.cols);
    const cardW = atlas.colWidths[col] ?? atlas.colWidths[0];
    const cardH = atlas.rowHeights[row] ?? atlas.rowHeights[0];
    const x = atlas.colStarts[col] ?? atlas.colStarts[0];
    const y = atlas.rowStarts[row] ?? atlas.rowStarts[0];
    const xPos = (x / (atlas.imageW - cardW)) * 100;
    const yPos = (y / (atlas.imageH - cardH)) * 100;
    const bgSizeX = (atlas.imageW / cardW) * 100;
    const bgSizeY = (atlas.imageH / cardH) * 100;
    return {
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${xPos}% ${yPos}%`,
    } as React.CSSProperties;
};

// 5. Hand Area
const HandArea = ({ hand, locale, atlas }: { hand: AbilityCard[]; locale?: string; atlas: CardAtlasConfig }) => {
    const totalCards = hand.length;
    const centerIndex = (totalCards - 1) / 2;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-[100] flex justify-center items-end pb-0 h-[22vw] pointer-events-none">
            <div className="relative w-[95vw] h-full flex justify-center items-end">
                {hand.map((card, i) => {
                    const offset = i - centerIndex;
                    const rotation = offset * 5;
                    const yOffset = Math.abs(offset) * 0.8;
                    const spriteIndex = (card.atlasIndex ?? i) % (atlas.cols * atlas.rows);
                    const atlasStyle = getCardAtlasStyle(spriteIndex, atlas);

                    return (
                        <div
                            key={card.id || i}
                            className={`
                                absolute bottom-0 w-[12vw] aspect-[0.61] rounded-[0.8vw] shadow-2xl border-none
                                transition-all duration-200 hover:-translate-y-[6vw] hover:scale-125 hover:z-[100] hover:rotate-0 hover:shadow-black/80
                                cursor-pointer pointer-events-auto origin-bottom-center bg-slate-800 overflow-hidden group ease-out
                                animate-in fade-in slide-in-from-bottom-[6vw] duration-700 fill-mode-backwards
                            `}
                            style={{
                                animationDelay: `${i * 100}ms`,
                                transform: `translateX(${offset * 7}vw) rotate(${rotation}deg) translateY(${yOffset}vw)`,
                                zIndex: i + 10,
                                bottom: '-2vw',
                                backgroundImage: buildLocalizedImageSet(ASSETS.CARDS_ATLAS, locale),
                                backgroundRepeat: 'no-repeat',
                                ...atlasStyle
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// --- Ability Overlay Configuration ---
const INITIAL_SLOTS = [
    { id: 'fist', index: 0, x: 0.1, y: 1.5, w: 20.8, h: 38.5 },
    { id: 'chi', index: 1, x: 22.2, y: 1.4, w: 21.3, h: 39.4 },
    { id: 'sky', index: 2, x: 54.7, y: 1.4, w: 21.7, h: 39.6 },
    { id: 'lotus', index: 3, x: 77.0, y: 1.3, w: 21.5, h: 39.5 },
    { id: 'combo', index: 4, x: 0.1, y: 42.3, w: 20.9, h: 39.3 },
    { id: 'lightning', index: 5, x: 22.1, y: 42.4, w: 21.8, h: 38.7 },
    { id: 'calm', index: 6, x: 54.5, y: 42.0, w: 21.9, h: 40.2 },
    { id: 'meditate', index: 7, x: 77.3, y: 42.0, w: 21.7, h: 39.9 },
    { id: 'ultimate', index: 8, x: 0.1, y: 83.5, w: 55.0, h: 15.6 },
];

const ABILITY_SLOT_MAP: Record<string, { labelKey: string; ids: string[] }> = {
    fist: { labelKey: 'abilitySlots.fist', ids: ['fist-technique-5', 'fist-technique-4', 'fist-technique-3'] },
    chi: { labelKey: 'abilitySlots.chi', ids: ['zen-forget'] },
    sky: { labelKey: 'abilitySlots.sky', ids: ['harmony'] },
    lotus: { labelKey: 'abilitySlots.lotus', ids: ['lotus-palm'] },
    combo: { labelKey: 'abilitySlots.combo', ids: ['taiji-combo'] },
    lightning: { labelKey: 'abilitySlots.lightning', ids: ['thunder-strike'] },
    calm: { labelKey: 'abilitySlots.calm', ids: ['calm-water'] },
    meditate: { labelKey: 'abilitySlots.meditate', ids: ['meditation'] },
};

const getAbilitySlotId = (abilityId: string) => {
    for (const slotId of Object.keys(ABILITY_SLOT_MAP)) {
        const mapping = ABILITY_SLOT_MAP[slotId];
        if (mapping.ids.includes(abilityId)) return slotId;
    }
    return null;
};

const AbilityOverlays = ({
    isEditing,
    availableAbilityIds,
    canSelect,
    canHighlight,
    onSelectAbility,
    selectedAbilityId,
    activatingAbilityId,
    locale,
}: {
    isEditing: boolean;
    availableAbilityIds: string[];
    canSelect: boolean;
    canHighlight: boolean;
    onSelectAbility: (abilityId: string) => void;
    selectedAbilityId?: string;
    activatingAbilityId?: string;
    locale?: string;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const [slots, setSlots] = React.useState(INITIAL_SLOTS);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dragInfo = React.useRef<{ id: string, type: 'move' | 'resize', startX: number, startY: number, startVal: { x: number; y: number; w: number; h: number } } | null>(null);

    const resolveAbilityId = (slotId: string) => {
        const mapping = ABILITY_SLOT_MAP[slotId];
        if (!mapping) return null;
        return mapping.ids.find(id => availableAbilityIds.includes(id)) ?? null;
    };

    const handleMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
        if (!isEditing) return;
        e.stopPropagation(); e.preventDefault();
        setEditingId(id);
        const slot = slots.find(s => s.id === id);
        if (!slot) return;
        dragInfo.current = { id, type, startX: e.clientX, startY: e.clientY, startVal: { ...slot } };
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragInfo.current || !containerRef.current) return;
            const { id, type, startX, startY, startVal } = dragInfo.current;
            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - startX) / rect.width) * 100;
            const deltaY = ((e.clientY - startY) / rect.height) * 100;
            setSlots(prev => prev.map(s => s.id === id ? {
                ...s,
                ...(type === 'move' ? { x: Number((startVal.x + deltaX).toFixed(1)), y: Number((startVal.y + deltaY).toFixed(1)) }
                    : { w: Number(Math.max(5, startVal.w + deltaX).toFixed(1)), h: Number(Math.max(5, startVal.h + deltaY).toFixed(1)) })
            } : s));
        };
        const handleMouseUp = () => { dragInfo.current = null; };
        if (isEditing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isEditing]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none">
            {slots.map((slot) => {
                const col = slot.index % 3;
                const row = Math.floor(slot.index / 3);
                const bgX = col * 50;
                const bgY = row * 50;
                const isResolved = resolveAbilityId(slot.id);
                const mapping = ABILITY_SLOT_MAP[slot.id];
                const slotLabel = mapping ? t(mapping.labelKey) : slot.id;
                const isAbilitySelected = !isEditing && selectedAbilityId === isResolved;
                const isAvailable = Boolean(isResolved);
                const canClick = !isEditing && canSelect && isAvailable;
                const isActivating = !isEditing && activatingAbilityId === isResolved;
                const shouldHighlight = !isEditing && canHighlight && isAvailable;
                const shouldDim = !isEditing && canHighlight && !isAvailable;
                const isUltimate = slot.id === 'ultimate';

                return (
                    <div
                        key={slot.id}
                        data-ability-slot={slot.id}
                        onMouseDown={(e) => handleMouseDown(e, slot.id, 'move')}
                        className={`
                            absolute transition-none rounded-lg
                            ${isEditing ? 'pointer-events-auto cursor-move border border-amber-500/30' : 'pointer-events-auto cursor-pointer group'}
                            ${isEditing && editingId === slot.id ? 'border-2 border-green-500 z-50 bg-green-500/10' : ''}
                            ${canClick ? 'hover:scale-[1.02] hover:z-30' : ''}
                            ${shouldDim ? 'opacity-35 grayscale' : ''}
                            ${isActivating ? 'animate-ability-activate z-50' : ''}
                        `}
                        style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
                        onClick={() => canClick && isResolved && onSelectAbility(isResolved)}
                    >
                        {!isUltimate && (
                            <div
                                className="w-full h-full rounded-lg pointer-events-none"
                                style={{
                                    backgroundImage: buildLocalizedImageSet(ASSETS.ABILITY_CARDS_BASE, locale),
                                    backgroundSize: '300% 300%',
                                    backgroundPosition: `${bgX}% ${bgY}%`,
                                    opacity: isEditing ? 0.7 : 1
                                }}
                            />
                        )}
                        {shouldHighlight && (
                            <div className="absolute inset-0 rounded-lg border-[2px] border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.65)] pointer-events-none z-10" />
                        )}
                        {isAbilitySelected && (
                            <div className="absolute inset-0 rounded-lg border-[4px] border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)] pointer-events-none z-10">
                                <div className="absolute -inset-[2px] rounded-lg border-2 border-white/50 animate-pulse" />
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute -top-3 left-0 bg-black/80 text-[8px] text-white px-1 rounded whitespace-nowrap pointer-events-none">
                                {slotLabel} {slot.x.toFixed(1)}% {slot.y.toFixed(1)}%
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Layout ---
export const DiceThroneBoard: React.FC<DiceThroneBoardProps> = ({ G, ctx: _, moves, playerID }) => {
    const { t, i18n } = useTranslation('game-dicethrone');
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const rootPid = playerID || '0';
    const player = G.players[rootPid] || G.players['0'];
    const otherPid = Object.keys(G.players).find(id => id !== rootPid) || '1';
    const opponent = G.players[otherPid];

    const [isLayoutEditing, setIsLayoutEditing] = React.useState(false);
    const currentPhase = G.turnPhase as TurnPhase;
    const [isTipOpen, setIsTipOpen] = React.useState(true);
    const [magnifiedImage, setMagnifiedImage] = React.useState<string | null>(null);
    const [viewMode, setViewMode] = React.useState<'self' | 'opponent'>('self');
    const [headerError, setHeaderError] = React.useState<string | null>(null);
    const [isConfirmingSkip, setIsConfirmingSkip] = React.useState(false);
    const [activatingAbilityId, setActivatingAbilityId] = React.useState<string | undefined>(undefined);
    const [cardAtlas, setCardAtlas] = React.useState<CardAtlasConfig | null>(null);
    const [statusIconAtlas, setStatusIconAtlas] = React.useState<StatusIconAtlasConfig | null>(null);
    const manualViewModeRef = React.useRef<'self' | 'opponent'>('self');
    const autoObserveRef = React.useRef(false);

    // 使用动画库 Hooks
    const { effects: flyingEffects, pushEffect: pushFlyingEffect, removeEffect: handleEffectComplete } = useFlyingEffects();
    const { isShaking: isOpponentShaking, triggerShake: triggerOpponentShake } = useShake(500);
    const { triggerGlow: triggerAbilityGlow } = usePulseGlow(800);

    const opponentHudRef = React.useRef<HTMLDivElement>(null);
    const opponentHpRef = React.useRef<HTMLDivElement>(null);
    const selfHpRef = React.useRef<HTMLDivElement>(null);
    const opponentBuffRef = React.useRef<HTMLDivElement>(null);
    const selfBuffRef = React.useRef<HTMLDivElement>(null);
    const prevOpponentHealthRef = React.useRef(opponent?.health);
    const prevPlayerHealthRef = React.useRef(player?.health);
    const prevOpponentStatusRef = React.useRef<Record<string, number>>({ ...(opponent?.statusEffects || {}) });
    const prevPlayerStatusRef = React.useRef<Record<string, number>>({ ...(player?.statusEffects || {}) });

    const isSelfView = viewMode === 'self';
    const isActivePlayer = G.activePlayerId === rootPid;
    const viewPid = isSelfView ? rootPid : otherPid;
    const viewPlayer = (isSelfView ? player : opponent) || player;
    const rollerId = currentPhase === 'defensiveRoll' ? G.pendingAttack?.defenderId : G.activePlayerId;
    const shouldAutoObserve = currentPhase === 'defensiveRoll' && rootPid !== rollerId;
    const isViewRolling = viewPid === rollerId;
    const isRollPhase = currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
    const rollConfirmed = G.rollConfirmed;
    const availableAbilityIds = isViewRolling ? G.availableAbilityIds : [];
    const selectedAbilityId = currentPhase === 'defensiveRoll'
        ? (isViewRolling ? G.pendingAttack?.defenseAbilityId : undefined)
        : (isViewRolling ? G.pendingAttack?.sourceAbilityId : undefined);
    const isLocalMatch = playerID === undefined || playerID === null;
    const canOperateView = isLocalMatch || isSelfView;
    const hasRolled = G.rollCount > 0;
    const canHighlightAbility = canOperateView && isViewRolling && isRollPhase && hasRolled;
    const canSelectAbility = canOperateView && isViewRolling && isRollPhase
        && (currentPhase === 'defensiveRoll' ? true : G.rollConfirmed);
    const bonusRollInfo = G.pendingAttack?.sourceAbilityId === 'taiji-combo' ? G.pendingAttack.extraRoll : undefined;
    const showBonusRollPanel = currentPhase === 'offensiveRoll' && !!bonusRollInfo;
    const canRollBonusDie = showBonusRollPanel && !bonusRollInfo?.resolved && canOperateView && isViewRolling;
    const requiresBonusRoll = currentPhase === 'offensiveRoll' && bonusRollInfo && !bonusRollInfo.resolved;
    const canAdvancePhase = isActivePlayer && (
        currentPhase !== 'offensiveRoll' && currentPhase !== 'defensiveRoll' ? true : G.rollConfirmed
    ) && !requiresBonusRoll;
    const pendingChoice = G.pendingChoice;
    const canResolveChoice = Boolean(pendingChoice && (isLocalMatch || pendingChoice.playerId === rootPid));
    const canInteractDice = canOperateView && isViewRolling;
    const showHand = isLocalMatch || isSelfView;
    const handOwner = (isSelfView ? player : opponent) || player;
    const showAdvancePhaseButton = isLocalMatch || isSelfView;
    const showOpponentThinking = !isLocalMatch && currentPhase === 'defensiveRoll' && !!rollerId && !canInteractDice;
    const thinkingOffsetClass = showHand ? 'bottom-[12vw]' : 'bottom-[4vw]';

    const getAbilityStartPos = React.useCallback((abilityId?: string) => {
        if (!abilityId) return getViewportCenter();
        const slotId = getAbilitySlotId(abilityId);
        if (!slotId) return getViewportCenter();
        const element = document.querySelector(`[data-ability-slot="${slotId}"]`) as HTMLElement | null;
        return getElementCenter(element);
    }, []);

    const getEffectStartPos = React.useCallback(
        (targetId?: string) => {
            const sourceAbilityId = (targetId && G.lastEffectSourceByPlayerId?.[targetId]) || G.activatingAbilityId;
            return getAbilityStartPos(sourceAbilityId);
        },
        [G.lastEffectSourceByPlayerId, G.activatingAbilityId, getAbilityStartPos]
    );

    React.useEffect(() => {
        let isActive = true;
        loadCardAtlasConfig(locale)
            .then((config) => {
                if (isActive) setCardAtlas(config);
            })
            .catch((error) => {
                if (isActive) setCardAtlas(null);
                console.error('卡牌图集配置加载失败，请检查 .atlas.json 是否存在且格式正确。', error);
            });
        return () => {
            isActive = false;
        };
    }, [locale]);

    React.useEffect(() => {
        let isActive = true;
        loadStatusIconAtlasConfig()
            .then((config) => {
                if (isActive) setStatusIconAtlas(config);
            })
            .catch((error) => {
                if (isActive) setStatusIconAtlas(null);
                console.error('状态图标图集配置加载失败，请检查 status-icons-atlas.json 是否存在且格式正确。', error);
            });
        return () => {
            isActive = false;
        };
    }, []);

    React.useEffect(() => {
        if (shouldAutoObserve) {
            if (!autoObserveRef.current) {
                manualViewModeRef.current = viewMode;
            }
            if (viewMode !== 'opponent') {
                setViewMode('opponent');
            }
        } else if (autoObserveRef.current) {
            if (viewMode !== manualViewModeRef.current) {
                setViewMode(manualViewModeRef.current);
            }
        }
        autoObserveRef.current = shouldAutoObserve;
    }, [shouldAutoObserve, viewMode]);

    React.useEffect(() => {
        if (!import.meta.env.DEV) return;
        if (!isRollPhase || !isViewRolling) return;
        console.info('[DiceThrone][AbilityHighlight]', {
            viewMode,
            rollerId,
            rollCount: G.rollCount,
            rollLimit: G.rollLimit,
            rollConfirmed: G.rollConfirmed,
            availableAbilityIds: G.availableAbilityIds,
            canHighlightAbility,
            canSelectAbility,
        });
    }, [isRollPhase, isViewRolling, viewMode, rollerId, G.rollCount, G.rollLimit, G.rollConfirmed, G.availableAbilityIds, canHighlightAbility, canSelectAbility]);

    const handleAdvancePhase = () => {
        if (!canAdvancePhase) {
            if (currentPhase === 'offensiveRoll' && !G.rollConfirmed) {
                setHeaderError(t('error.confirmRoll'));
                setTimeout(() => setHeaderError(null), 3000);
            } else if (currentPhase === 'defensiveRoll' && !G.rollConfirmed) {
                setHeaderError(t('error.confirmDefenseRoll'));
                setTimeout(() => setHeaderError(null), 3000);
            }
            return;
        }
        if (currentPhase === 'offensiveRoll' && !selectedAbilityId) {
            setIsConfirmingSkip(true);
            return;
        }
        moves.advancePhase();
    };

    React.useEffect(() => {
        if (isActivePlayer && ['upkeep', 'income', 'discard'].includes(currentPhase)) {
            const timer = setTimeout(() => moves.advancePhase(), 800);
            return () => clearTimeout(timer);
        }
    }, [currentPhase, isActivePlayer, moves]);

    React.useEffect(() => {
        if (currentPhase === 'defensiveRoll') {
            if (rollerId && rollerId === rootPid) {
                setViewMode('self');
            } else {
                setViewMode('opponent');
            }
            return;
        }
        if (currentPhase === 'offensiveRoll' && isActivePlayer) setViewMode('self');
    }, [currentPhase, isActivePlayer, rollerId, rootPid]);

    React.useEffect(() => {
        const sourceAbilityId = G.activatingAbilityId ?? G.pendingAttack?.sourceAbilityId;
        if (!sourceAbilityId) return;
        setActivatingAbilityId(sourceAbilityId);
        triggerAbilityGlow();
        const timer = setTimeout(() => setActivatingAbilityId(undefined), 800);
        return () => clearTimeout(timer);
    }, [G.activatingAbilityId, G.pendingAttack?.sourceAbilityId, triggerAbilityGlow]);

    React.useEffect(() => {
        if (!opponent) return;
        const prevHealth = prevOpponentHealthRef.current;
        if (prevHealth !== undefined && opponent.health < prevHealth) {
            const damage = prevHealth - opponent.health;
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                startPos: getEffectStartPos(otherPid),
                endPos: getElementCenter(opponentHpRef.current),
            });
            triggerOpponentShake();
        }
        prevOpponentHealthRef.current = opponent.health;
    }, [opponent?.health, opponent, pushFlyingEffect, triggerOpponentShake, getEffectStartPos, otherPid]);

    React.useEffect(() => {
        const prevHealth = prevPlayerHealthRef.current;
        if (prevHealth !== undefined && player.health < prevHealth) {
            const damage = prevHealth - player.health;
            pushFlyingEffect({
                type: 'damage',
                content: `-${damage}`,
                startPos: getEffectStartPos(rootPid),
                endPos: getElementCenter(selfHpRef.current),
            });
        }
        prevPlayerHealthRef.current = player.health;
    }, [player.health, pushFlyingEffect, getEffectStartPos, rootPid]);

    React.useEffect(() => {
        if (!opponent) return;
        const prevStatus = prevOpponentStatusRef.current;
        Object.entries(opponent.statusEffects || {}).forEach(([effectId, stacks]) => {
            const prevStacks = prevStatus[effectId] ?? 0;
            if (stacks > prevStacks) {
                const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                pushFlyingEffect({
                    type: 'buff',
                    content: getStatusEffectIconNode(info, locale, 'fly'),
                    color: info.color,
                    startPos: getEffectStartPos(otherPid),
                    endPos: getElementCenter(opponentBuffRef.current),
                });
            }
        });
        prevOpponentStatusRef.current = { ...opponent.statusEffects };
    }, [opponent?.statusEffects, opponent, pushFlyingEffect, getEffectStartPos, otherPid, locale]);

    React.useEffect(() => {
        const prevStatus = prevPlayerStatusRef.current;
        Object.entries(player.statusEffects || {}).forEach(([effectId, stacks]) => {
            const prevStacks = prevStatus[effectId] ?? 0;
            if (stacks > prevStacks) {
                const info = STATUS_EFFECT_META[effectId] || { icon: '✨', color: 'from-slate-500 to-slate-600' };
                pushFlyingEffect({
                    type: 'buff',
                    content: getStatusEffectIconNode(info, locale, 'fly'),
                    color: info.color,
                    startPos: getEffectStartPos(rootPid),
                    endPos: getElementCenter(selfBuffRef.current),
                });
            }
        });
        prevPlayerStatusRef.current = { ...player.statusEffects };
    }, [player.statusEffects, pushFlyingEffect, getEffectStartPos, rootPid, locale]);

    const advanceLabel = currentPhase === 'offensiveRoll'
        ? t('actions.resolveAttack')
        : currentPhase === 'defensiveRoll'
            ? t('actions.endDefense')
            : t('actions.nextPhase');

    if (!player) return <div className="p-10 text-white">{t('status.loadingGameState', { playerId: rootPid })}</div>;

    return (
        <div className="relative w-full h-dvh bg-black overflow-hidden font-sans select-none text-slate-200">
            <GameDebugPanel G={G} ctx={_} moves={moves} playerID={playerID}>
                <button
                    onClick={() => setIsLayoutEditing(!isLayoutEditing)}
                    className={`w-full py-2 rounded font-bold text-xs border transition-all ${isLayoutEditing ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                    {isLayoutEditing ? t('layout.exitEdit') : t('layout.enterEdit')}
                </button>
            </GameDebugPanel>

            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                <OptimizedImage
                    src={getLocalizedAssetPath('dicethrone/images/Common/compressed/background', locale)}
                    fallbackSrc="dicethrone/images/Common/compressed/background"
                    className="w-full h-full object-cover"
                    alt={t('imageAlt.background')}
                />
            </div>

            {opponent && (
                <div ref={opponentHudRef} className="absolute top-[0.8vw] left-0 right-0 z-50 flex flex-col items-center gap-[0.5vw]">
                    {headerError && (
                        <div className="px-[1.5vw] py-[0.5vw] bg-red-600/90 text-white font-bold text-[0.9vw] rounded-full shadow-2xl border border-red-400/50 backdrop-blur-md animate-in slide-in-from-top-4">
                            ⚠️ {headerError}
                        </div>
                    )}
                    <div className="flex justify-center items-center gap-[1vw]">
                        <ShakeContainer
                            isShaking={isOpponentShaking}
                            onClick={() => {
                                if (shouldAutoObserve) return;
                                setViewMode(prev => {
                                    const next = prev === 'self' ? 'opponent' : 'self';
                                    manualViewModeRef.current = next;
                                    return next;
                                });
                            }}
                            className={`group bg-slate-900/80 backdrop-blur-md border border-slate-700 px-[0.75vw] py-[0.3vw] rounded-[0.8vw] shadow-2xl flex items-center gap-[0.8vw] cursor-pointer hover:bg-slate-800 transition-all ${viewMode === 'opponent' ? 'border-amber-500/50 bg-slate-800' : ''} ${isOpponentShaking ? 'border-red-500' : ''}`}
                        >
                            <div className="w-[2.6vw] h-[3.4vw] rounded-[0.3vw] border border-slate-600 overflow-hidden relative bg-slate-800">
                                <div className="w-full h-full" style={getPortraitStyle(opponent.characterId, locale)} />
                                <div className={`absolute inset-0 bg-amber-500/40 flex items-center justify-center backdrop-blur-[1px] transition-opacity duration-200 ${viewMode === 'opponent' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw] fill-white drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-2.135-4.695-6.305-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-[0.4vw]">
                                    <span className={`font-black text-[0.9vw] tracking-wider truncate max-w-[10vw] ${viewMode === 'opponent' ? 'text-amber-400' : 'text-white'}`}>
                                        {viewMode === 'opponent' ? t('hud.viewingOpponent') : t('hud.opponent')}
                                    </span>
                                    <span className="px-[0.4vw] py-[0.1vw] bg-amber-500/20 text-amber-400 text-[0.55vw] rounded border border-amber-500/30 mr-2">{t('hero.monk')}</span>
                                    <div ref={opponentBuffRef}>
                                        <StatusEffectsContainer
                                            effects={opponent.statusEffects || {}}
                                            size="small"
                                            maxPerRow={5}
                                            locale={locale}
                                            atlas={statusIconAtlas}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-[0.8vw] mt-[0.1vw]">
                                    <div ref={opponentHpRef} className="flex items-center gap-[0.3vw]">
                                        <div className="w-[0.6vw] h-[0.6vw] bg-red-500 rounded-full shadow-red-500/50"></div>
                                        <span className="text-red-400 font-bold text-[0.8vw]">{t('hud.healthLabel', { value: opponent.health })}</span>
                                    </div>
                                    <div className="flex items-center gap-[0.3vw]">
                                        <div className="w-[0.7vw] h-[0.7vw] bg-amber-500 rounded-full shadow-amber-500/50"></div>
                                        <span className="text-amber-400 font-bold text-[0.8vw]">{t('hud.energyLabel', { value: opponent.cp })}</span>
                                    </div>
                                </div>
                            </div>
                        </ShakeContainer>
                    </div>
                </div>
            )}

            <FlyingEffectsLayer effects={flyingEffects} onEffectComplete={handleEffectComplete} />
            <div className="absolute inset-x-0 top-[2vw] bottom-0 z-10 pointer-events-none">
                <div className="absolute left-[1.5vw] top-0 bottom-[1.5vw] w-[15vw] flex flex-col items-center pointer-events-auto z-[60]">
                    <div className="w-full pt-[1vw] px-[1vw]"><PhaseIndicator currentPhase={currentPhase} /></div>
                    <div className="flex-grow" />
                    <div className="w-full flex flex-col items-center gap-[1.5vw]">
                        <div className="w-full px-[1vw]" ref={selfBuffRef}>
                            <StatusEffectsContainer
                                effects={viewPlayer.statusEffects ?? {}}
                                maxPerRow={3}
                                size="normal"
                                className="justify-center"
                                locale={locale}
                                atlas={statusIconAtlas}
                            />
                        </div>
                        <div className="w-full px-[1vw]"><PlayerStats player={viewPlayer} hpRef={selfHpRef} /></div>
                        <DrawDeck count={viewPlayer.deck.length} locale={locale} />
                    </div>
                </div>

                <div className="absolute left-[15vw] right-[15vw] top-[-6.5vw] bottom-0 flex items-center justify-center pointer-events-auto">
                    <div className="relative flex items-center justify-center w-full gap-[0.5vw]">
                        <div className="relative h-[35vw] w-auto shadow-2xl z-10 group transition-all duration-300 rounded-[0.8vw] overflow-hidden">
                            <OptimizedImage
                                src={getLocalizedAssetPath(ASSETS.PLAYER_BOARD, locale)}
                                fallbackSrc={ASSETS.PLAYER_BOARD}
                                className="w-auto h-full object-contain"
                                alt={t('imageAlt.playerBoard')}
                            />
                            <AbilityOverlays
                                isEditing={isLayoutEditing && isSelfView}
                                availableAbilityIds={availableAbilityIds}
                                canSelect={canSelectAbility}
                                canHighlight={canHighlightAbility}
                                onSelectAbility={(abilityId) => moves.selectAbility(abilityId)}
                                selectedAbilityId={selectedAbilityId}
                                activatingAbilityId={activatingAbilityId}
                                locale={locale}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); setMagnifiedImage(ASSETS.PLAYER_BOARD); }}
                                className="absolute top-[1vw] right-[1vw] w-[2.2vw] h-[2.2vw] flex items-center justify-center bg-black/60 hover:bg-amber-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl border border-white/20 z-20"
                            >
                                <svg className="w-[1.2vw] h-[1.2vw] fill-current" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center relative h-[35vw]">
                            <button
                                onClick={() => setIsTipOpen(!isTipOpen)}
                                className={`absolute top-[55%] -translate-y-1/2 z-50 p-[0.5vw] bg-black/30 hover:bg-black/60 text-white/50 hover:text-white rounded-full transition-all duration-500 border border-white/10 ${isTipOpen ? 'right-[0.8vw]' : 'left-[0.1vw]'}`}
                            >{isTipOpen ? '‹' : '›'}</button>
                            <div className={`relative h-full transition-all duration-500 overflow-hidden rounded-[0.8vw] ${isTipOpen ? 'w-auto opacity-100 scale-100' : 'w-0 opacity-0 scale-95'}`}>
                                <div className="relative h-full w-auto aspect-[1311/2048] group">
                                    <OptimizedImage
                                        src={getLocalizedAssetPath(ASSETS.TIP_BOARD, locale)}
                                        fallbackSrc={ASSETS.TIP_BOARD}
                                        className="w-auto h-full object-contain"
                                        alt={t('imageAlt.tipBoard')}
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMagnifiedImage(ASSETS.TIP_BOARD); }}
                                        className="absolute top-[1vw] right-[1vw] w-[2.2vw] h-[2.2vw] flex items-center justify-center bg-black/60 hover:bg-amber-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl border border-white/20 z-20"
                                    >
                                        <svg className="w-[1.2vw] h-[1.2vw] fill-current" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute right-[1.5vw] top-0 bottom-[1.5vw] w-[15vw] flex flex-col items-center pointer-events-auto z-[60]">
                    <div className="flex-grow" />
                    <div className="w-full flex flex-col items-center gap-[1.5vw]">
                        <DiceTray
                            dice={G.dice} rollCount={G.rollCount} rollLimit={G.rollLimit} rollConfirmed={rollConfirmed}
                            onRoll={() => {
                                if (!canInteractDice) return;
                                moves.rollDice();
                            }}
                            onConfirm={() => {
                                if (!canInteractDice) return;
                                moves.confirmRoll();
                            }}
                            onToggleLock={(id) => {
                                if (!canInteractDice) return;
                                moves.toggleDieLock(id);
                            }}
                            currentPhase={currentPhase} canInteract={canInteractDice} locale={locale}
                        />
                        {showBonusRollPanel && (
                            <div className="w-[10.2vw] flex flex-col items-center gap-[0.4vw]">
                                {!bonusRollInfo?.resolved ? (
                                    <button
                                        onClick={() => {
                                            if (!canRollBonusDie) return;
                                            moves.rollBonusDie();
                                        }}
                                        disabled={!canRollBonusDie}
                                        className={`w-full py-[0.6vw] rounded-[0.6vw] text-[0.75vw] font-bold uppercase tracking-wider transition-all ${canRollBonusDie ? 'bg-amber-600 text-white hover:bg-amber-500 border border-amber-400/70' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                                    >
                                        {t('dice.bonusRoll')}
                                    </button>
                                ) : (
                                    <div className="px-[0.8vw] py-[0.5vw] rounded-[0.6vw] bg-slate-900/80 border border-amber-500/40 text-amber-200 text-[0.7vw] font-bold tracking-wider">
                                        {t('dice.bonusRolled', {
                                            value: bonusRollInfo.value,
                                            face: bonusRollInfo.value ? getBonusFaceLabel(bonusRollInfo.value, t) : '-',
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {showAdvancePhaseButton && (
                            <div className="w-full flex justify-center">
                                <button
                                    onClick={handleAdvancePhase}
                                    className={`w-[10.2vw] py-[0.7vw] rounded-[0.6vw] font-bold text-[0.75vw] uppercase tracking-wider transition-all ${isActivePlayer && (currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll' ? G.rollConfirmed : true) ? 'bg-slate-800 text-amber-200 border border-amber-500/60 hover:bg-amber-600 hover:text-white' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                                >{advanceLabel}</button>
                            </div>
                        )}
                        <div className="w-[10.2vw] flex justify-center"><DiscardPile cards={viewPlayer.discard} locale={locale} /></div>
                    </div>
                </div>
            </div>

            {showHand && cardAtlas && (
                <>
                    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none bg-gradient-to-t from-black/90 via-black/40 to-transparent h-[15vw]" />
                    <HandArea hand={handOwner.hand} locale={locale} atlas={cardAtlas} />
                </>
            )}

            {showOpponentThinking && (
                <div className={`absolute ${thinkingOffsetClass} left-1/2 -translate-x-1/2 z-[120] pointer-events-none`}>
                    <div className="px-[1.4vw] py-[0.6vw] rounded-full bg-black/70 border border-amber-500/40 text-amber-300 text-[0.8vw] font-bold tracking-wider shadow-lg backdrop-blur-sm">
                        {t('dice.waitingOpponent')}
                    </div>
                </div>
            )}

            {magnifiedImage && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setMagnifiedImage(null)}>
                    {/* Fixed: Enforce Aspect Ratio on Container to ensure overlays align perfectly */}
                    <div
                        className={`
                            relative shadow-2xl border border-white/10 rounded-[1vw] overflow-hidden group/modal
                            ${magnifiedImage.includes('monk-player-board') ? 'aspect-[2048/1673] h-auto w-auto max-h-[90vh] max-w-[90vw]' : 'max-h-[90vh] max-w-[90vw]'}
                        `}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <OptimizedImage
                            src={getLocalizedAssetPath(magnifiedImage, locale)}
                            fallbackSrc={magnifiedImage}
                            className="w-full h-full object-contain"
                            alt={t('imageAlt.magnifiedView')}
                        />
                        {magnifiedImage.includes('monk-player-board') && (
                            <AbilityOverlays
                                isEditing={isLayoutEditing} availableAbilityIds={availableAbilityIds}
                                canSelect={canSelectAbility}
                                canHighlight={canHighlightAbility}
                                onSelectAbility={(abilityId) => moves.selectAbility(abilityId)} selectedAbilityId={selectedAbilityId}
                                locale={locale}
                            />
                        )}
                        <button className="absolute -top-12 right-0 text-white/50 hover:text-white text-sm flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full transition-colors" onClick={() => setMagnifiedImage(null)}>{t('actions.closePreview')}</button>
                    </div>
                </div>
            )}

            {isConfirmingSkip && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900/90 border border-white/20 backdrop-blur-xl p-[2vw] rounded-[1.5vw] shadow-2xl max-w-[30vw] flex flex-col items-center text-center gap-[1.5vw] animate-in zoom-in-95 duration-300">
                        <div className="w-[4vw] h-[4vw] bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50">⚠️</div>
                        <div className="flex flex-col gap-[0.5vw]">
                            <h3 className="text-[1.2vw] font-black text-white">{t('confirmSkip.title')}</h3>
                            <p className="text-[0.9vw] text-slate-400 leading-relaxed px-[1vw]">{t('confirmSkip.description')}</p>
                        </div>
                        <div className="flex gap-[1vw] w-full pt-[0.5vw]">
                            <button onClick={() => setIsConfirmingSkip(false)} className="flex-1 py-[0.8vw] rounded-[0.8vw] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[0.85vw] border border-slate-700">{t('confirmSkip.cancel')}</button>
                            <button onClick={() => { setIsConfirmingSkip(false); moves.advancePhase(); }} className="flex-1 py-[0.8vw] rounded-[0.8vw] bg-amber-600 hover:bg-amber-500 text-white font-bold text-[0.85vw] shadow-lg shadow-amber-900/40">{t('confirmSkip.confirm')}</button>
                        </div>
                    </div>
                </div>
            )}

            {pendingChoice && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900/95 border border-amber-500/40 backdrop-blur-xl p-[2vw] rounded-[1.6vw] shadow-2xl max-w-[32vw] flex flex-col items-center text-center gap-[1.5vw]">
                        <div className="flex flex-col gap-[0.6vw]">
                            <h3 className="text-[1.2vw] font-black text-white">{t('choices.title')}</h3>
                            <p className="text-[0.9vw] text-slate-400 leading-relaxed px-[1vw]">{t(pendingChoice.title)}</p>
                        </div>
                        <div className="flex gap-[1vw] w-full pt-[0.5vw]">
                            {pendingChoice.options.map(option => {
                                const meta = STATUS_EFFECT_META[option.statusId] || { icon: '❓', color: 'from-slate-500 to-slate-600' };
                                return (
                                    <button
                                        key={option.statusId}
                                        onClick={() => moves.resolveChoice(option.statusId)}
                                        disabled={!canResolveChoice}
                                        className={`flex-1 py-[0.8vw] rounded-[0.8vw] font-bold text-[0.85vw] shadow-lg transition-all border ${canResolveChoice ? 'bg-slate-800 hover:bg-amber-600 text-white border-amber-500/40' : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-center justify-center gap-[0.5vw]">
                                            <span className="w-[2vw] h-[2vw] rounded-full overflow-hidden border border-white/30">
                                                {getStatusEffectIconNode(meta, locale, 'choice')}
                                            </span>
                                            <span>{t(`statusEffects.${option.statusId}.name`, { defaultValue: option.statusId })}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiceThroneBoard;
