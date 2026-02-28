import type { RefObject } from 'react';
import type { HeroState } from '../types';
import { MAX_HEALTH } from '../domain/core-types';
import { RESOURCE_IDS } from '../domain/resources';
import {
    HitStopContainer,
    DamageFlash,
    type HitStopConfig,
} from '../../../components/common/animations';
import { ShakeContainer } from '../../../components/common/animations/ShakeContainer';

/** 护盾图标组件 */
const ShieldIcon = ({ value }: { value: number }) => (
    <div className="relative w-[1.8vw] h-[1.8vw] flex-shrink-0">
        <svg
            className="w-full h-full text-cyan-500"
            viewBox="0 1 24 25"
            fill="currentColor"
        >
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[0.8vw] font-bold text-white drop-shadow-md">
            {value}
        </span>
    </div>
);

/** 资源条组件（HP/CP 统一样式） */
const ResourceBar = ({
    value,
    max,
    gradient,
    icon,
    innerRef,
}: {
    value: number;
    max: number;
    gradient: string;
    icon?: React.ReactNode;
    innerRef?: RefObject<HTMLDivElement | null>;
}) => {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    
    return (
        <div ref={innerRef} className="flex items-center gap-[0.5vw]">
            <div className="flex-1 relative h-[1.8vw] rounded-full overflow-hidden bg-slate-950/80 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_2px_rgba(255,255,255,0.1)]">
                {/* 进度条 */}
                <div
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
                {/* 3D 高光 */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                {/* 数值文本 */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[0.9vw] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {value} / {max}
                    </span>
                </div>
            </div>
            {icon}
        </div>
    );
};

export const PlayerStats = ({
    player,
    hpRef,
    cpRef,
    hitStopActive,
    hitStopConfig,
    isShaking,
    damageFlashActive,
    damageFlashDamage,
    overrideHp,
}: {
    player: HeroState;
    hpRef?: RefObject<HTMLDivElement | null>;
    cpRef?: RefObject<HTMLDivElement | null>;
    hitStopActive?: boolean;
    hitStopConfig?: HitStopConfig;
    /** 是否正在震动（自己受击） */
    isShaking?: boolean;
    /** 受击 DamageFlash 是否激活 */
    damageFlashActive?: boolean;
    /** 受击伤害值 */
    damageFlashDamage?: number;
    /** 视觉状态缓冲覆盖的 HP 值（飞行动画到达前冻结） */
    overrideHp?: number;
}) => {
    const health = overrideHp ?? (player.resources[RESOURCE_IDS.HP] ?? 0);
    const cp = player.resources[RESOURCE_IDS.CP] ?? 0;
    const shield = player.damageShields?.reduce((sum, s) => sum + s.value, 0) ?? 0;

    return (
        <ShakeContainer isShaking={!!isShaking}>
            <HitStopContainer
                isActive={!!hitStopActive}
                {...(hitStopConfig ?? {})}
                className="w-full"
            >
                <div className="relative overflow-visible">
                    <div className="bg-slate-950/95 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)] rounded-[1.2vw] p-[0.8vw] space-y-[0.5vw] hover:bg-slate-900/90 transition-all duration-300">
                        {/* HP 条 */}
                        <ResourceBar
                            value={health}
                            max={MAX_HEALTH}
                            gradient="from-red-900 to-red-600"
                            icon={shield > 0 ? <ShieldIcon value={shield} /> : undefined}
                            innerRef={hpRef}
                        />
                        {/* CP 条 */}
                        <ResourceBar
                            value={cp}
                            max={15}
                            gradient="from-amber-800 to-amber-500"
                            innerRef={cpRef}
                        />
                    </div>
                    {/* 受击时空裂隙 + 红脉冲 overlay */}
                    <DamageFlash
                        active={!!damageFlashActive}
                        damage={damageFlashDamage ?? 1}
                        intensity={(damageFlashDamage ?? 0) >= 5 ? 'strong' : 'normal'}
                        showNumber={false}
                    />
                </div>
            </HitStopContainer>
        </ShakeContainer>
    );
};
