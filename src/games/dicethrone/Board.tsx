import React from 'react';
import type React from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { DiceThroneState } from './types';

interface DiceThroneBoardProps extends BoardProps<DiceThroneState> { }

export const DiceThroneBoard: React.FC<DiceThroneBoardProps> = ({ G, ctx, moves }) => {
    const player = G.players[ctx.currentPlayer];
    // const isMyTurn = ctx.currentPlayer === ctx.currentPlayer; // TODO: Check client ID

    return (
        <div className="w-full h-dvh bg-slate-900 text-white flex flex-col overflow-hidden">
            {/* Top Bar: Opponent Info */}
            <div className="h-16 bg-slate-800 flex items-center justify-between px-4 border-b border-slate-700">
                <div className="text-xl font-bold">Opponent</div>
                <div className="text-red-500 font-mono text-2xl">HP: {G.players[ctx.playOrder.find(p => p !== ctx.currentPlayer) || '1']?.health}</div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Turn Info & Phase */}
                <div className="w-48 bg-slate-800/50 p-4 border-r border-slate-700 flex flex-col gap-2">
                    <div className="text-sm text-slate-400">Phase</div>
                    <div className="text-xl font-bold uppercase text-yellow-500">{G.turnPhase}</div>

                    <div className="mt-8 text-sm text-slate-400">Rolls Left</div>
                    <div className="text-4xl font-mono">{3 - G.rollCount}</div>

                    <button
                        className="mt-auto py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded font-bold"
                        onClick={() => moves.passPhase()}
                    >
                        Next Phase
                    </button>
                </div>

                {/* Center: Play Area */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8 relative bg-[url(/assets/noise.svg)]">

                    {/* Dice Tray */}
                    <div className="flex gap-4 p-6 bg-slate-800/80 rounded-xl border border-slate-600 backdrop-blur-sm shadow-2xl">
                        {G.dice.map(die => (
                            <div
                                key={die.id}
                                onClick={() => moves.keepDice([die.id])}
                                className={`
                            w-20 h-20 rounded-lg flex items-center justify-center text-4xl font-black cursor-pointer transition-all transform hover:scale-105
                            ${die.isKept ? 'bg-green-600 ring-4 ring-green-400 -translate-y-2' : 'bg-slate-200 text-slate-900'}
                        `}
                            >
                                {die.value}
                            </div>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-4">
                        <button
                            className="py-3 px-8 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={G.rollCount >= 3 || G.turnPhase !== 'roll'}
                            onClick={() => moves.rollDice(G.dice.filter(d => !d.isKept).map(d => d.id))}
                        >
                            ROLL DICE
                        </button>
                    </div>

                </div>

                {/* Right: My Hero Board Placeholder */}
                <div className="w-80 bg-slate-800 p-4 border-l border-slate-700 overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">{player.id.toUpperCase()}</h2>
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-red-900/50 p-2 rounded border border-red-500/30">
                            <div className="text-xs text-red-400 uppercase">Health</div>
                            <div className="text-2xl font-mono">{player.health}</div>
                        </div>
                        <div className="flex-1 bg-yellow-900/50 p-2 rounded border border-yellow-500/30">
                            <div className="text-xs text-yellow-400 uppercase">CP</div>
                            <div className="text-2xl font-mono">{player.cp}</div>
                        </div>
                    </div>

                    {/* Abilities List Placeholder */}
                    <div className="space-y-2">
                        <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
                            <div className="font-bold text-sm">Basic Attack</div>
                            <div className="text-xs text-slate-400 flex gap-1 mt-1">
                                <span className="bg-slate-600 px-1 rounded">1</span>
                                <span className="bg-slate-600 px-1 rounded">2</span>
                                <span className="bg-slate-600 px-1 rounded">3</span>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
                            <div className="font-bold text-sm">Evaluation</div>
                            <div className="text-xs text-slate-400 flex gap-1 mt-1">
                                <span className="bg-slate-600 px-1 rounded">4</span>
                                <span className="bg-slate-600 px-1 rounded">5</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
