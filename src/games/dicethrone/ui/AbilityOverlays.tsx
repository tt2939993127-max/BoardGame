import React from 'react';
import { useTranslation } from 'react-i18next';
import { CardPreview } from '../../../components/common/media/CardPreview';
import type { CardPreviewRef } from '../../../systems/CardSystem';
import type { AbilityCard } from '../types';
// 导入所有英雄的卡牌定义
import { MONK_CARDS } from '../heroes/monk/cards';
import { BARBARIAN_CARDS } from '../heroes/barbarian/cards';
import { PYROMANCER_CARDS } from '../heroes/pyromancer/cards';

// 角色 ID 到卡牌定义的映射
const HERO_CARDS_MAP: Record<string, AbilityCard[]> = {
    monk: MONK_CARDS,
    barbarian: BARBARIAN_CARDS,
    pyromancer: PYROMANCER_CARDS,
};

// 技能槽位置定义（百分比坐标，基于玩家面板）
// 方案 A：仅用于定位选框，不再用于精灵图裁切
const INITIAL_SLOTS = [
    { id: 'fist', x: 0.1, y: 1.5, w: 20.8, h: 38.5 },
    { id: 'chi', x: 22.2, y: 1.4, w: 21.3, h: 39.4 },
    { id: 'sky', x: 54.7, y: 1.4, w: 21.7, h: 39.6 },
    { id: 'lotus', x: 77.0, y: 1.3, w: 21.5, h: 39.5 },
    { id: 'combo', x: 0.1, y: 42.3, w: 20.9, h: 39.3 },
    { id: 'lightning', x: 22.1, y: 42.4, w: 21.8, h: 38.7 },
    { id: 'calm', x: 54.5, y: 42.0, w: 21.9, h: 40.2 },
    { id: 'meditate', x: 77.3, y: 42.0, w: 21.7, h: 39.9 },
    { id: 'ultimate', x: 0.1, y: 83.5, w: 55.0, h: 15.6 },
];

const ABILITY_SLOT_MAP: Record<string, { labelKey: string; ids: string[] }> = {
    // 基础技能 ID（跨英雄）
    fist: { labelKey: 'abilitySlots.fist', ids: ['fist-technique', 'fireball', 'slap'] },
    chi: { labelKey: 'abilitySlots.chi', ids: ['zen-forget', 'soul-burn', 'all-out-strike'] },
    sky: { labelKey: 'abilitySlots.sky', ids: ['harmony', 'fiery-combo', 'powerful-strike'] },
    lotus: { labelKey: 'abilitySlots.lotus', ids: ['lotus-palm', 'meteor', 'violent-assault'] },
    combo: { labelKey: 'abilitySlots.combo', ids: ['taiji-combo', 'pyro-blast', 'steadfast'] },
    lightning: { labelKey: 'abilitySlots.lightning', ids: ['thunder-strike', 'burn-down', 'suppress'] },
    calm: { labelKey: 'abilitySlots.calm', ids: ['calm-water', 'ignite', 'reckless-strike'] },
    meditate: { labelKey: 'abilitySlots.meditate', ids: ['meditation', 'magma-armor', 'thick-skin'] },
    ultimate: { labelKey: 'abilitySlots.ultimate', ids: ['transcendence', 'ultimate-inferno'] },
};

export const getAbilitySlotId = (abilityId: string) => {
    for (const slotId of Object.keys(ABILITY_SLOT_MAP)) {
        const mapping = ABILITY_SLOT_MAP[slotId];
        if (mapping.ids.some(baseId => abilityId === baseId || abilityId.startsWith(`${baseId}-`))) {
            return slotId;
        }
    }
    return null;
};

// 技能槽到基础技能 ID 的映射（按角色分类）
const HERO_SLOT_TO_ABILITY: Record<string, Record<string, string>> = {
    monk: {
        fist: 'fist-technique',
        chi: 'zen-forget',
        sky: 'harmony',
        lotus: 'lotus-palm',
        combo: 'taiji-combo',
        lightning: 'thunder-strike',
        calm: 'calm-water',
        meditate: 'meditation',
    },
    pyromancer: {
        fist: 'fireball',
        chi: 'soul-burn',
        sky: 'fiery-combo',
        lotus: 'meteor',
        combo: 'pyro-blast',
        lightning: 'burn-down',
        calm: 'ignite',
        meditate: 'magma-armor',
    },
    barbarian: {
        fist: 'slap',
        chi: 'all-out-strike',
        sky: 'powerful-strike',
        lotus: 'violent-assault',
        combo: 'steadfast',
        lightning: 'suppress',
        calm: 'reckless-strike',
        meditate: 'thick-skin',
    },
};

// 获取槽位对应的基础技能 ID
const getSlotAbilityId = (characterId: string, slotId: string): string | undefined => {
    return HERO_SLOT_TO_ABILITY[characterId]?.[slotId];
};

/**
 * 从卡牌定义中动态查找升级卡的预览引用
 * @param characterId 角色 ID
 * @param abilityId 目标技能 ID
 * @param level 升级后的等级
 * @returns 对应升级卡的预览引用，未找到返回 undefined
 */
const getUpgradeCardPreviewRef = (characterId: string, abilityId: string, level: number): CardPreviewRef | undefined => {
    // 根据角色 ID 获取对应的卡牌定义
    const heroCards = HERO_CARDS_MAP[characterId];
    if (!heroCards) return undefined;

    for (const card of heroCards) {
        if (card.type !== 'upgrade' || !card.effects) continue;
        for (const effect of card.effects) {
            const action = effect.action;
            if (
                action?.type === 'replaceAbility' &&
                action.targetAbilityId === abilityId &&
                action.newAbilityLevel === level
            ) {
                return card.previewRef;
            }
        }
    }
    return undefined;
};

export const AbilityOverlays = ({
    isEditing,
    availableAbilityIds,
    canSelect,
    canHighlight,
    onSelectAbility,
    onHighlightedAbilityClick,
    selectedAbilityId,
    activatingAbilityId,
    abilityLevels,
    characterId = 'monk', // 用于查找对应角色的升级卡定义
    locale,
}: {
    isEditing: boolean;
    availableAbilityIds: string[];
    canSelect: boolean;
    canHighlight: boolean;
    onSelectAbility: (abilityId: string) => void;
    onHighlightedAbilityClick?: () => void;
    selectedAbilityId?: string;
    activatingAbilityId?: string;
    abilityLevels?: Record<string, number>;
    characterId?: string;
    locale?: string;
}) => {
    const { t } = useTranslation('game-dicethrone');

    // 布局持久化：从 localStorage 加载已保存的槽位布局
    const STORAGE_KEY = `dt-layout-${characterId}`;
    const [slots, setSlots] = React.useState(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as typeof INITIAL_SLOTS;
                // 校验数据完整性：数量和 id 必须与 INITIAL_SLOTS 一致
                if (
                    Array.isArray(parsed) &&
                    parsed.length === INITIAL_SLOTS.length &&
                    INITIAL_SLOTS.every(init => parsed.some(p => p.id === init.id))
                ) {
                    return parsed;
                }
            }
        } catch { /* 解析失败则使用默认值 */ }
        return INITIAL_SLOTS;
    });
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dragInfo = React.useRef<{ id: string, type: 'move' | 'resize', startX: number, startY: number, startVal: { x: number; y: number; w: number; h: number } } | null>(null);

    // 编辑模式下自动保存布局到 localStorage
    React.useEffect(() => {
        if (!isEditing) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
        } catch { /* 写入失败静默忽略 */ }
    }, [isEditing, slots, STORAGE_KEY]);

    const resolveAbilityId = (slotId: string) => {
        const mapping = ABILITY_SLOT_MAP[slotId];
        if (!mapping) return null;
        return availableAbilityIds.find(id =>
            mapping.ids.some(baseId => id === baseId || id.startsWith(`${baseId}-`))
        ) ?? null;
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
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isEditing]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-20 pointer-events-none"
            data-tutorial-id="ability-slots"
        >
            {slots.map((slot) => {
                // 方案 A：不再需要计算精灵图位置（col, row, bgX, bgY），玩家面板已包含基础技能
                const isResolved = resolveAbilityId(slot.id);
                const baseAbilityId = getSlotAbilityId(characterId, slot.id);
                const level = baseAbilityId ? (abilityLevels?.[baseAbilityId] ?? 1) : 1;
                const upgradePreviewRef = baseAbilityId && level > 1
                    ? getUpgradeCardPreviewRef(characterId, baseAbilityId, level)
                    : undefined;
                const mapping = ABILITY_SLOT_MAP[slot.id];
                const slotLabel = mapping ? t(mapping.labelKey) : slot.id;
                const isAbilitySelected = !isEditing && selectedAbilityId === isResolved;
                const isAvailable = Boolean(isResolved);
                const canClick = !isEditing && canSelect && isAvailable;
                const isActivating = !isEditing && activatingAbilityId === isResolved;
                const shouldHighlight = !isEditing && canHighlight && isAvailable;
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
                            ${isActivating ? 'animate-ability-activate z-50' : ''}
                        `}
                        style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
                        onClick={() => {
                            if (canClick && isResolved) {
                                onSelectAbility(isResolved);
                            } else if (!isEditing && shouldHighlight && !canSelect && onHighlightedAbilityClick) {
                                onHighlightedAbilityClick();
                            }
                        }}
                    >
                        {/* 方案 A：不渲染基础精灵图，玩家面板本身已包含基础技能图案 */}
                        {/* 升级卡叠加层（保持卡牌原始比例，居中覆盖） */}
                        {!isUltimate && upgradePreviewRef && (
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <CardPreview
                                    previewRef={upgradePreviewRef}
                                    locale={locale}
                                    className="h-full aspect-[0.61] rounded-lg"
                                />
                            </div>
                        )}
                        {shouldHighlight && (
                            <div className="absolute inset-0 rounded-lg border-[2.5px] border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.8),0_0_40px_rgba(251,113,133,0.4)] pointer-events-none z-10 animate-pulse" />
                        )}
                        {isAbilitySelected && (
                            <div className="absolute inset-0 rounded-lg border-[3px] border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9),0_0_50px_rgba(239,68,68,0.5)] pointer-events-none z-10">
                                <div className="absolute -inset-[2px] rounded-lg border-2 border-white/60 animate-pulse" />
                            </div>
                        )}
                        {isEditing && (
                            <>
                                <div className="absolute -top-3 left-0 bg-black/80 text-[8px] text-white px-1 rounded whitespace-nowrap pointer-events-none">
                                    {slotLabel} {slot.x.toFixed(1)}% {slot.y.toFixed(1)}% ({slot.w.toFixed(1)}×{slot.h.toFixed(1)})
                                </div>
                                {/* 右下角 resize 手柄 */}
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, slot.id, 'resize')}
                                    className="absolute -right-1 -bottom-1 w-3 h-3 bg-amber-400 border border-amber-600 rounded-sm cursor-nwse-resize pointer-events-auto z-50"
                                />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
