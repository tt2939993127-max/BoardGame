import React from 'react';

export interface YamlSyncPanelProps {
    open: boolean;
    yaml: string;
    error?: string | null;
    isSaving?: boolean;
    saveMessage?: string | null;
    onChange: (value: string) => void;
    onSave: () => void;
    onToggle: () => void;
}

export function YamlSyncPanel({
    open,
    yaml,
    error,
    isSaving = false,
    saveMessage,
    onChange,
    onSave,
    onToggle,
}: YamlSyncPanelProps) {
    return (
        <aside
            className="pointer-events-auto fixed right-4 top-4 z-[2100] flex max-h-[calc(100vh-2rem)] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] border border-white/12 bg-[#130d09]/94 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
            style={{ display: open ? 'flex' : 'none' }}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Author YAML</div>
                    <div className="mt-1 text-sm font-semibold text-amber-50">`home-v2.ui.yaml`</div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:bg-white/10"
                >
                    收起
                </button>
            </div>
            <textarea
                value={yaml}
                onChange={(event) => onChange(event.target.value)}
                spellCheck={false}
                className="min-h-[360px] flex-1 resize-none border-0 bg-transparent px-4 py-4 font-mono text-[12px] leading-[1.55] text-[#f5e7d3] outline-none"
            />
            <div className="border-t border-white/10 px-4 py-3">
                {error ? (
                    <div className="mb-3 rounded-[14px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                        {error}
                    </div>
                ) : null}
                {saveMessage ? (
                    <div className="mb-3 rounded-[14px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
                        {saveMessage}
                    </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] text-white/45">页面拖拽会实时回写这里，手改 YAML 也会即时更新页面。</div>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={Boolean(error) || isSaving}
                        className="rounded-full bg-amber-200 px-4 py-2 text-[12px] font-semibold text-[#3f2a17] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </aside>
    );
}
