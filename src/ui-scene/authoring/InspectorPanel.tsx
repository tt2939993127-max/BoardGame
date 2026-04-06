import React from 'react';
import type { UISceneCompiledArtifact, UISceneRect } from '../types';

export interface InspectorPanelProps {
    open: boolean;
    scene: UISceneCompiledArtifact;
    selectedZoneId?: string | null;
    onSelectZone: (zoneId: string) => void;
    onChangeZone: (zoneId: string, rect: UISceneRect) => void;
    onToggle: () => void;
}

function NumberField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="flex flex-col gap-1 text-[11px] text-white/70">
            <span>{label}</span>
            <input
                type="number"
                value={Number.isFinite(value) ? value : 0}
                onChange={(event) => onChange(Number(event.target.value))}
                className="rounded-[10px] border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-amber-50 outline-none"
            />
        </label>
    );
}

export function InspectorPanel({
    open,
    scene,
    selectedZoneId,
    onSelectZone,
    onChangeZone,
    onToggle,
}: InspectorPanelProps) {
    const selectedZone = selectedZoneId ? scene.artboard.zones[selectedZoneId] : undefined;

    return (
        <aside
            className="pointer-events-auto fixed left-4 top-4 z-[2100] flex max-h-[calc(100vh-2rem)] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] border border-white/12 bg-[#130d09]/94 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
            style={{ display: open ? 'flex' : 'none' }}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">Inspector</div>
                    <div className="mt-1 text-sm font-semibold text-amber-50">{selectedZoneId ?? '未选中区域'}</div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:bg-white/10"
                >
                    收起
                </button>
            </div>
            <div className="grid gap-2 border-b border-white/10 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Zones</div>
                <div className="grid grid-cols-1 gap-2">
                    {Object.keys(scene.artboard.zones).map((zoneId) => (
                        <button
                            key={zoneId}
                            type="button"
                            onClick={() => onSelectZone(zoneId)}
                            className={`rounded-[12px] border px-3 py-2 text-left text-[12px] transition-colors ${
                                zoneId === selectedZoneId
                                    ? 'border-amber-300/60 bg-amber-200/10 text-amber-50'
                                    : 'border-white/8 bg-white/5 text-white/70 hover:bg-white/10'
                            }`}
                        >
                            {zoneId}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 px-4 py-4">
                {selectedZone ? (
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            label="X"
                            value={selectedZone.x}
                            onChange={(value) => onChangeZone(selectedZoneId!, { ...selectedZone, x: value })}
                        />
                        <NumberField
                            label="Y"
                            value={selectedZone.y}
                            onChange={(value) => onChangeZone(selectedZoneId!, { ...selectedZone, y: value })}
                        />
                        <NumberField
                            label="Width"
                            value={selectedZone.width}
                            onChange={(value) => onChangeZone(selectedZoneId!, { ...selectedZone, width: value })}
                        />
                        <NumberField
                            label="Height"
                            value={selectedZone.height}
                            onChange={(value) => onChangeZone(selectedZoneId!, { ...selectedZone, height: value })}
                        />
                    </div>
                ) : (
                    <div className="text-[12px] leading-[1.7] text-white/55">
                        选中一个 zone 后，这里会显示它的坐标和尺寸，并支持直接改数值。
                    </div>
                )}
            </div>
        </aside>
    );
}
