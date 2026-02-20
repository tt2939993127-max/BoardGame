/**
 * 光标设置弹窗
 *
 * 主网格：每个游戏一张卡片 + 系统默认光标，选中即保存。
 * 选中游戏光标后，右上角"更换"按钮 → 打开变体选择子弹窗（无毛玻璃）。
 * 右下角：覆盖范围单选。
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MousePointer2, RefreshCw, X } from 'lucide-react';
import { ModalBase } from '../common/overlays/ModalBase';
import {
    getCursorTheme,
    getDefaultThemePerGame,
    getThemesByGameId,
} from '../../core/cursor/themes';
import { useCursorPreference } from '../../core/cursor/CursorPreferenceContext';
import type { CursorPreviewSvgs } from '../../core/cursor/types';

interface CursorSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    closeOnBackdrop?: boolean;
}

// ---------------------------------------------------------------------------
// 系统默认光标各形态 SVG
// ---------------------------------------------------------------------------

const defaultPreviewSvgs: CursorPreviewSvgs = {
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M6 3 L6 26 L12 20 L18 28 L22 26 L16 18 L24 18 Z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 3 C14 3 14 14 14 14 L10 12 C9 11.5 7.5 12 8 13.5 L12 20 L12 27 L22 27 L24 20 C24 20 26 14 26 13 C26 11.5 24 11 23 12 L22 13 C22 12 21 10.5 19.5 11 L19 12 C19 11 17.5 9.5 16.5 10.5 L16 12 L16 3 C16 1.5 14 1.5 14 3 Z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    grabbing: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M8 15 C8 13 10 12 11 13 L11 16 M11 13 C11 11 13 10 14 11 L14 16 M14 11 C14 9 16 9 17 10 L17 16 M17 10 C17 9 19 8.5 20 10 L20 16 L20 22 C20 25 17 28 13 28 C9 28 7 25 7 22 L7 18 C7 16 8 15 8 15 Z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    zoomIn: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="14" cy="14" r="9" fill="white" stroke="#333" stroke-width="2"/><line x1="21" y1="21" x2="29" y2="29" stroke="#333" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="14" x2="18" y2="14" stroke="#333" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="10" x2="14" y2="18" stroke="#333" stroke-width="2" stroke-linecap="round"/></svg>`,
    notAllowed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#ccc" stroke="#333" stroke-width="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/></svg>`,
};

// ---------------------------------------------------------------------------
// 共享 SVG 预览
// ---------------------------------------------------------------------------

const CURSOR_STATE_KEYS: (keyof CursorPreviewSvgs)[] = ['default', 'pointer', 'grabbing', 'zoomIn', 'notAllowed'];
const CURSOR_STATE_I18N: Partial<Record<keyof CursorPreviewSvgs, string>> = {
    default: 'cursor.stateDefault',
    pointer: 'cursor.statePointer',
    grabbing: 'cursor.stateGrabbing',
    zoomIn: 'cursor.stateZoomIn',
    notAllowed: 'cursor.stateNotAllowed',
};

function toSvgDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function SvgPreviewIcon({ svg, size = 24, label }: { svg: string; size?: number; label?: string }) {
    return (
        <img
            src={toSvgDataUri(svg)}
            alt={label ?? ''}
            title={label}
            className="inline-block"
            style={{ width: size, height: size }}
            draggable={false}
        />
    );
}

// ---------------------------------------------------------------------------
// 变体选择子弹窗（无毛玻璃，轻量遮罩）
// ---------------------------------------------------------------------------

function VariantPickerModal({
    gameId,
    currentThemeId,
    onSelect,
    onClose,
}: {
    gameId: string;
    currentThemeId: string;
    onSelect: (themeId: string) => Promise<void>;
    onClose: () => void;
}) {
    const { t } = useTranslation('auth');
    const variants = useMemo(() => getThemesByGameId(gameId), [gameId]);
    const gameLabel = variants[0]?.label ?? gameId;

    const stateLabels = CURSOR_STATE_KEYS.map((key) => {
        const i18nKey = CURSOR_STATE_I18N[key];
        return { key, label: i18nKey ? t(i18nKey) : '' };
    });

    const handlePick = async (themeId: string) => {
        await onSelect(themeId);
        onClose();
    };

    return (
        <ModalBase onClose={onClose} closeOnBackdrop overlayClassName="!backdrop-blur-none !bg-black/20">
            <div className="pointer-events-auto bg-parchment-card-bg border border-parchment-card-border rounded-lg shadow-xl w-[520px] max-w-[90vw] max-h-[70vh] flex flex-col">
                {/* 标题 */}
                <div className="px-4 pt-4 pb-2 border-b border-parchment-card-border/30 flex items-center justify-between">
                    <span className="font-bold text-sm text-parchment-base-text">
                        {gameLabel} - {t('cursor.changeVariant')}
                    </span>
                    <button onClick={onClose} className="text-parchment-light-text hover:text-parchment-base-text transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {/* 表头 */}
                <div className="px-4 pt-3 pb-1 flex items-center">
                    <span className="w-28 shrink-0" />
                    <div className="grid grid-cols-5 gap-4 flex-1">
                        {stateLabels.map(({ key, label }) => (
                            <span key={key} className="text-center text-[10px] text-parchment-light-text font-bold truncate">
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 变体列表 */}
                <div className="px-4 py-2 overflow-y-auto flex-1 space-y-1">
                    {variants.map((variant) => {
                        const isActive = variant.id === currentThemeId;
                        return (
                            <button
                                key={variant.id}
                                onClick={() => handlePick(variant.id)}
                                className={`
                                    w-full flex items-center py-2 px-3 rounded-md transition-all cursor-pointer
                                    ${isActive
                                        ? 'bg-parchment-brown/10 border border-parchment-brown'
                                        : 'hover:bg-parchment-base-bg/50 border border-transparent'
                                    }
                                `}
                            >
                                <div className="w-28 shrink-0 flex items-center gap-2">
                                    {isActive && <Check size={12} className="text-parchment-brown shrink-0" />}
                                    <span className="text-xs font-bold text-parchment-base-text truncate">
                                        {variant.variantLabel}
                                    </span>
                                </div>
                                <div className="grid grid-cols-5 gap-4 flex-1">
                                    {CURSOR_STATE_KEYS.map((key) => {
                                        const svg = variant.previewSvgs[key];
                                        if (!svg) return <div key={key} className="flex justify-center"><div className="w-7 h-7" /></div>;
                                        return (
                                            <div key={key} className="flex justify-center">
                                                <SvgPreviewIcon svg={svg} size={28} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </ModalBase>
    );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export const CursorSettingsModal = ({ isOpen, onClose, closeOnBackdrop }: CursorSettingsModalProps) => {
    const { t } = useTranslation('auth');
    const { preference, updatePreference } = useCursorPreference();
    const defaultPerGame = useMemo(() => getDefaultThemePerGame(), []);

    // 直接跟随 preference，选中即保存
    const selected = preference.cursorTheme;
    const scope = preference.overrideScope;
    const [variantGameId, setVariantGameId] = useState<string | null>(null);

    const selectedTheme = useMemo(() => {
        if (selected === 'default') return null;
        return getCursorTheme(selected) ?? null;
    }, [selected]);

    const handleSelect = async (themeId: string) => {
        await updatePreference({ ...preference, cursorTheme: themeId });
    };

    const handleSelectGame = async (gameId: string, defaultThemeId: string) => {
        if (selectedTheme?.gameId === gameId) return;
        await handleSelect(defaultThemeId);
    };

    const handleScopeChange = async (newScope: 'home' | 'all') => {
        await updatePreference({ ...preference, overrideScope: newScope });
    };

    const handleHighContrastToggle = async () => {
        await updatePreference({ ...preference, highContrast: !preference.highContrast });
    };

    if (!isOpen) return null;

    return (
        <>
            <ModalBase onClose={onClose} closeOnBackdrop={closeOnBackdrop}>
                <div className="pointer-events-auto bg-parchment-card-bg border border-parchment-card-border rounded-lg shadow-xl w-[520px] max-w-[90vw] max-h-[80vh] flex flex-col">
                    {/* 标题栏：更换按钮始终占位，避免布局跳动 */}
                    <div className="px-5 pt-5 pb-3 border-b border-parchment-card-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-parchment-base-text">
                            <MousePointer2 size={18} />
                            <span className="font-bold text-sm">{t('cursor.title')}</span>
                        </div>
                        <button
                            onClick={() => selectedTheme && setVariantGameId(selectedTheme.gameId)}
                            disabled={!selectedTheme}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer
                                ${selectedTheme
                                    ? 'text-parchment-light-text hover:text-parchment-base-text hover:bg-parchment-base-bg/60'
                                    : 'text-transparent pointer-events-none'
                                }
                            `}
                        >
                            <RefreshCw size={14} />
                            {t('cursor.change')}
                        </button>
                    </div>

                    {/* 光标网格：5列 */}
                    <div className="px-5 py-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-5 gap-3">
                            <CursorCard
                                label={t('cursor.default')}
                                previewSvg={defaultPreviewSvgs.default}
                                isSelected={selected === 'default'}
                                onSelect={() => handleSelect('default')}
                            />
                            {defaultPerGame.map((theme) => {
                                const displayTheme = (selectedTheme?.gameId === theme.gameId) ? selectedTheme : theme;
                                return (
                                    <CursorCard
                                        key={theme.gameId}
                                        label={theme.label}
                                        subtitle={displayTheme.variantLabel}
                                        previewSvg={displayTheme.previewSvgs.default}
                                        isSelected={selectedTheme?.gameId === theme.gameId}
                                        onSelect={() => handleSelectGame(theme.gameId, theme.id)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* 底部：高对比 + 覆盖范围，同一排 */}
                    <div className="px-5 pb-5 pt-2 border-t border-parchment-card-border/30 flex items-center justify-end gap-3 text-xs">
                        {/* 高对比模式开关 */}
                        <button
                            onClick={handleHighContrastToggle}
                            className={`
                                flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer
                                ${preference.highContrast
                                    ? 'bg-parchment-brown text-white'
                                    : 'bg-parchment-base-bg text-parchment-light-text hover:bg-parchment-card-border/30'
                                }
                            `}
                        >
                            {t('cursor.highContrast')}
                        </button>
                        <span className="w-px h-3 bg-parchment-card-border/40" />
                        <span className="text-parchment-light-text">{t('cursor.scope')}:</span>
                        <ScopeRadio value="home" current={scope} label={t('cursor.scopeHome')} onChange={handleScopeChange} />
                        <ScopeRadio value="all" current={scope} label={t('cursor.scopeAll')} onChange={handleScopeChange} />
                    </div>
                </div>
            </ModalBase>

            {variantGameId && (
                <VariantPickerModal
                    gameId={variantGameId}
                    currentThemeId={selected}
                    onSelect={handleSelect}
                    onClose={() => setVariantGameId(null)}
                />
            )}
        </>
    );
};

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function CursorCard({
    label,
    subtitle,
    previewSvg,
    isSelected,
    onSelect,
}: {
    label: string;
    subtitle?: string;
    previewSvg: string;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={`
                relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer
                ${isSelected
                    ? 'border-parchment-brown bg-parchment-brown/10 shadow-sm'
                    : 'border-parchment-card-border/40 hover:border-parchment-card-border hover:bg-parchment-base-bg/50'
                }
            `}
        >
            {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-parchment-brown rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                </div>
            )}
            <div className="w-10 h-10 flex items-center justify-center">
                <SvgPreviewIcon svg={previewSvg} size={32} label={label} />
            </div>
            <span className="text-[10px] font-bold text-parchment-base-text leading-tight text-center truncate w-full">
                {label}
            </span>
            {subtitle && (
                <span className="text-[9px] text-parchment-light-text leading-tight text-center truncate w-full -mt-1">
                    {subtitle}
                </span>
            )}
        </button>
    );
}

function ScopeRadio({
    value,
    current,
    label,
    onChange,
}: {
    value: 'home' | 'all';
    current: 'home' | 'all';
    label: string;
    onChange: (v: 'home' | 'all') => void | Promise<void>;
}) {
    const isActive = current === value;
    return (
        <button
            onClick={() => onChange(value)}
            className={`
                px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer
                ${isActive
                    ? 'bg-parchment-brown text-white'
                    : 'bg-parchment-base-bg text-parchment-light-text hover:bg-parchment-card-border/30'
                }
            `}
        >
            {label}
        </button>
    );
}
