import React from 'react';

export interface EditorHeaderBarProps {
    sceneName: string;
    leftTab: '图层' | '组件' | '资源';
    leftDrawerOpen: boolean;
    inspectorOpen: boolean;
    sourceOpen: boolean;
    overlayVisible: boolean;
    isSaving?: boolean;
    saveDisabled?: boolean;
    onToggleLeftTab: (tab: '图层' | '组件' | '资源') => void;
    onToggleInspector: () => void;
    onToggleOverlay: () => void;
    onToggleSource: () => void;
    onSave: () => void;
}

function TabButton({
    active,
    children,
    testId,
    onClick,
}: {
    active: boolean;
    children: React.ReactNode;
    testId: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                active
                    ? 'border-amber-300/60 bg-amber-200/12 text-amber-50'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
        >
            {children}
        </button>
    );
}

export function EditorHeaderBar({
    sceneName,
    leftTab,
    leftDrawerOpen,
    inspectorOpen,
    sourceOpen,
    overlayVisible,
    isSaving = false,
    saveDisabled = false,
    onToggleLeftTab,
    onToggleInspector,
    onToggleOverlay,
    onToggleSource,
    onSave,
}: EditorHeaderBarProps) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/12 bg-[#130d09]/88 px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-[0.22em] text-amber-200/70">页面编辑器</div>
                <div className="truncate text-base font-semibold text-amber-50">{sceneName}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <TabButton testId="home-v2-editor-tab-layers" active={leftDrawerOpen && leftTab === '图层'} onClick={() => onToggleLeftTab('图层')}>图层</TabButton>
                <TabButton testId="home-v2-editor-tab-components" active={leftDrawerOpen && leftTab === '组件'} onClick={() => onToggleLeftTab('组件')}>组件</TabButton>
                <TabButton testId="home-v2-editor-tab-assets" active={leftDrawerOpen && leftTab === '资源'} onClick={() => onToggleLeftTab('资源')}>资源</TabButton>
                <TabButton testId="home-v2-editor-tab-inspector" active={inspectorOpen} onClick={onToggleInspector}>属性</TabButton>
                <TabButton testId="home-v2-editor-tab-overlay" active={overlayVisible} onClick={onToggleOverlay}>画布辅助</TabButton>
                <TabButton testId="home-v2-editor-tab-source" active={sourceOpen} onClick={onToggleSource}>高级源码</TabButton>
                <button
                    type="button"
                    data-testid="home-v2-editor-save"
                    disabled={saveDisabled || isSaving}
                    onClick={onSave}
                    className="rounded-full bg-amber-200 px-4 py-1.5 text-[12px] font-semibold text-[#3f2a17] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {isSaving ? '保存中...' : '保存'}
                </button>
            </div>
        </div>
    );
}
