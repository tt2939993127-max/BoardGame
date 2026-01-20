import React, { useState } from 'react';
import { useDebug } from '../contexts/DebugContext';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DebugPanelProps {
    G: any;
    ctx: any;
    moves: any;
    events?: any;
    playerID?: string | null;
}

export const GameDebugPanel: React.FC<DebugPanelProps> = ({ G, ctx, moves, events, playerID }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'state' | 'actions' | 'controls'>('actions');
    const { setPlayerID, testMode, setTestMode } = useDebug();

    // State for move arguments
    const [moveArgs, setMoveArgs] = useState<Record<string, string>>({});

    if (!import.meta.env.DEV) return null;

    const handleArgChange = (moveName: string, value: string) => {
        setMoveArgs(prev => ({ ...prev, [moveName]: value }));
    };

    // 监听当前玩家变化，实现自动切换视角
    React.useEffect(() => {
        if (testMode && ctx.currentPlayer && ctx.currentPlayer !== playerID) {
            // 延迟一点切换，让用户看到上一步的结果
            const timer = setTimeout(() => {
                setPlayerID(ctx.currentPlayer);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [ctx.currentPlayer, testMode, setPlayerID, playerID]);

    const executeMove = (moveName: string) => {
        const rawArg = moveArgs[moveName];
        if (!rawArg) {
            moves[moveName]();
            return;
        }

        // Try to parse argument as JSON (for numbers, objects, arrays), otherwise pass as string
        try {
            // Split by comma to support multiple arguments? For simplicity now, single arg parsing
            // specific logic: if it looks like multiple args, user should input JSON array e.g. [1, 2]
            // broad parsing:
            const arg = JSON.parse(rawArg);
            moves[moveName](arg);
        } catch (_) {
            // Fallback to string if not valid JSON
            moves[moveName](rawArg);
        }
    };

    return (
        <>
            {/* Floating Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-24 right-4 z-[9999] w-12 h-12 bg-gray-900 text-white rounded-md shadow-lg flex items-center justify-center hover:bg-gray-800 transition-all border border-gray-700 hover:scale-105 active:scale-95 text-xl"
                title="开发调试"
            >
                {isOpen ? '✕' : '🛠️'}
            </button>

            {/* Main Panel */}
            {isOpen && (
                <div className="fixed top-20 right-4 bottom-24 w-96 bg-white shadow-2xl rounded-xl border border-gray-200 z-[9998] flex flex-col overflow-hidden font-mono text-sm ring-1 ring-black/5">
                    {/* Header */}
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <span>🛠️ 调试控制台</span>
                        </h3>
                        <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-xs px-2 py-1 text-gray-500 font-bold select-none">视角:</span>
                            {['0', '1', null].map((pid) => (
                                <button
                                    key={String(pid)}
                                    onClick={() => setPlayerID(pid as string | null)}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors font-medium ${String(playerID) === String(pid)
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'hover:bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {pid === null ? '旁观' : `P${pid}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex border-b border-gray-200 bg-white">
                        <button
                            onClick={() => setActiveTab('actions')}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${activeTab === 'actions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                        >
                            🎮 指令
                        </button>
                        <button
                            onClick={() => setActiveTab('state')}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${activeTab === 'state' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                        >
                            📊 数据
                        </button>
                        <button
                            onClick={() => setActiveTab('controls')}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${activeTab === 'controls' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                        >
                            ⚙️ 系统
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
                        {/* Actions Tab */}
                        {activeTab === 'actions' && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-full h-px bg-gray-200"></span>
                                        MOVES
                                        <span className="w-full h-px bg-gray-200"></span>
                                    </h4>
                                    <div className="flex flex-col gap-3">
                                        {Object.keys(moves).map((moveName) => (
                                            <div key={moveName} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm group hover:border-blue-300 transition-colors">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-gray-700 text-xs">{moveName}</span>
                                                    <button
                                                        onClick={() => executeMove(moveName)}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 active:translate-y-0.5 transition-all shadow-sm shadow-blue-200"
                                                    >
                                                        执行
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="参数 (JSON/String)..."
                                                    value={moveArgs[moveName] || ''}
                                                    onChange={(e) => handleArgChange(moveName, e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300"
                                                />
                                            </div>
                                        ))}
                                        {Object.keys(moves).length === 0 && <p className="text-gray-400 italic text-xs text-center py-2">暂无可用动作</p>}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-full h-px bg-gray-200"></span>
                                        EVENTS
                                        <span className="w-full h-px bg-gray-200"></span>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {events?.endTurn && (
                                            <button onClick={() => events.endTurn()} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 text-xs font-bold transition-all text-left flex items-center gap-2">
                                                🛑 结束回合
                                            </button>
                                        )}
                                        {events?.endPhase && (
                                            <button onClick={() => events.endPhase()} className="px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 text-xs font-bold transition-all text-left flex items-center gap-2">
                                                ⏭️ 结束阶段
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* State Tab */}
                        {activeTab === 'state' && (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                    <div className="flex justify-between text-xs border-b border-gray-100 pb-2">
                                        <span className="text-gray-500 font-bold">Phase</span>
                                        <span className="font-mono bg-purple-100 text-purple-700 px-1.5 rounded">{ctx.phase}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-gray-100 pb-2">
                                        <span className="text-gray-500 font-bold">Turn</span>
                                        <span className="font-mono bg-blue-100 text-blue-700 px-1.5 rounded">{ctx.turn}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1">
                                        <span className="text-gray-500 font-bold">Active Player</span>
                                        <span className="font-mono bg-green-100 text-green-700 px-1.5 rounded">{ctx.currentPlayer}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Game State (G)</h4>
                                    <pre className="text-[10px] leading-relaxed bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto border border-gray-800 font-mono shadow-inner">
                                        {JSON.stringify(G, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Controls Tab */}
                        {activeTab === 'controls' && (
                            <div className="space-y-4">
                                {/* 测试模式开关 */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-700 text-sm mb-1">🧪 测试模式</h4>
                                            <p className="text-xs text-gray-500">执行行动后自动切换玩家视角</p>
                                        </div>
                                        <button
                                            onClick={() => setTestMode(!testMode)}
                                            className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${testMode
                                                ? 'bg-green-500 shadow-green-200'
                                                : 'bg-gray-300 shadow-gray-200'
                                                }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${testMode ? 'translate-x-7' : 'translate-x-0'
                                                    }`}
                                            >
                                                {testMode ? '✓' : ''}
                                            </span>
                                        </button>
                                    </div>
                                    <div className={`text-xs px-2 py-1.5 rounded mt-3 ${testMode
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                                        }`}>
                                        {testMode
                                            ? '✅ 已开启 - 行动后自动切换视角'
                                            : '⏸️ 已关闭 - 需手动切换视角'
                                        }
                                    </div>
                                </div>

                                <button
                                    onClick={() => { localStorage.removeItem('bgio_state'); window.location.reload(); }}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    🔄 重置游戏 (Reset)
                                </button>

                                <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-700 border border-blue-100">
                                    <p className="mb-2 font-bold">💡 提示</p>
                                    <p>重置操作将清除本地缓存并刷新页面。</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
