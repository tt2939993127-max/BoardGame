import { useState, useEffect } from 'react';
import { Zap, ZapOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AUTO_RESPONSE_KEY = 'dicethrone:autoResponse';

/**
 * 自动响应开关组件
 * - 持久化到 localStorage
 * - 显示在右侧边栏顶部
 */
export const AutoResponseToggle = ({
    onToggle,
}: {
    onToggle?: (enabled: boolean) => void;
}) => {
    const { t } = useTranslation('game-dicethrone');
    const [enabled, setEnabled] = useState(() => {
        const stored = localStorage.getItem(AUTO_RESPONSE_KEY);
        return stored === 'true';
    });

    useEffect(() => {
        localStorage.setItem(AUTO_RESPONSE_KEY, String(enabled));
        onToggle?.(enabled);
    }, [enabled, onToggle]);

    const handleToggle = () => {
        setEnabled(prev => !prev);
    };

    return (
        <button
            onClick={handleToggle}
            className={`
                group relative flex items-center gap-[0.4vw] px-[0.8vw] py-[0.5vw] rounded-[0.6vw]
                border transition-all duration-300 shadow-lg
                ${enabled
                    ? 'bg-emerald-900/80 border-emerald-500/50 hover:bg-emerald-800/90 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/80 border-slate-600/50 hover:bg-slate-800/90 shadow-[0_0_8px_rgba(0,0,0,0.2)]'
                }
            `}
            title={enabled ? t('hud.autoResponseEnabled') : t('hud.autoResponseDisabled')}
        >
            {enabled ? (
                <Zap className="w-[1.2vw] h-[1.2vw] text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
            ) : (
                <ZapOff className="w-[1.2vw] h-[1.2vw] text-slate-400" />
            )}
            <span className={`text-[0.7vw] font-bold ${enabled ? 'text-emerald-300' : 'text-slate-400'}`}>
                {enabled ? t('hud.autoResponse') : t('hud.manualResponse')}
            </span>
            {/* 状态指示灯 */}
            <div className={`
                absolute -top-[0.2vw] -right-[0.2vw] w-[0.6vw] h-[0.6vw] rounded-full
                ${enabled
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                    : 'bg-slate-600'
                }
            `} />
        </button>
    );
};

/** 获取当前自动响应设置 */
export const getAutoResponseEnabled = (): boolean => {
    const stored = localStorage.getItem(AUTO_RESPONSE_KEY);
    return stored === 'true';
};
