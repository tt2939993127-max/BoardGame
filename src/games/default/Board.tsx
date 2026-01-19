import React, { useEffect, useRef } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { TicTacToeState } from './game';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import { GameControls } from '../../components/game/GameControls';
import { useTutorial } from '../../contexts/TutorialContext';
import { TicTacToeTutorial } from './tutorial';

interface Props extends BoardProps<TicTacToeState> { }

// SVG 图标组件 - X (Neon Style)
// SVG 图标组件 - X (Hollow Neon Style)
// SVG 图标组件 - X (Hollow Neon Style - Smoother Animation)
// SVG 图标组件 - X (Hollow Neon Style - Intersection of two strokes)
// SVG 图标组件 - X (Hollow Neon Style - Square Caps - Genuine Masking)
const IconX = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <mask id="hollowMask">
                {/* Visible parts (white) */}
                <rect x="0" y="0" width="24" height="24" fill="white" />
                {/* Masked out parts (inner hollow - black) */}
                <path d="M5 5L19 19" stroke="black" strokeWidth="1.2" strokeLinecap="square" />
                <path d="M19 5L5 19" stroke="black" strokeWidth="1.2" strokeLinecap="square" />
            </mask>
        </defs>

        <g mask="url(#hollowMask)">
            {/* First Stroke */}
            <path
                d="M5 5L19 19"
                className="animate-[draw-stroke_0.3s_cubic-bezier(0.4,0,0.2,1)_forwards]"
                stroke="currentColor" strokeWidth="2.8" strokeLinecap="square"
                style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
            />
            {/* Second Stroke */}
            <path
                d="M19 5L5 19"
                className="animate-[draw-stroke_0.3s_cubic-bezier(0.4,0,0.2,1)_0.15s_forwards]"
                stroke="currentColor" strokeWidth="2.8" strokeLinecap="square"
                style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
            />
        </g>

        <style>{`
            @keyframes draw-stroke {
                to { stroke-dashoffset: 0; }
            }
        `}</style>
    </svg>
);

// SVG 图标组件 - O (Neon Style)
// SVG 图标组件 - O (Hollow Neon Style - Double Ring)
// SVG 图标组件 - O (Hollow Neon Style - Synchronized Double Ring)
// SVG 图标组件 - O (Hollow Neon Style - Consistent Width)
const IconO = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer Circle */}
        <circle className="animate-[draw-circle_0.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" cx="12" cy="12" r="9" strokeWidth="1.5" style={{ strokeDasharray: 60, strokeDashoffset: 60 }} />
        {/* Inner Circle - Same width as outer */}
        <circle className="animate-[draw-circle_0.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" cx="12" cy="12" r="5.5" strokeWidth="1.5" opacity="0.6" style={{ strokeDasharray: 40, strokeDashoffset: 40 }} />
        <style>{`
            @keyframes draw-circle {
                to { stroke-dashoffset: 0; }
            }
        `}</style>
    </svg>
);

export const TicTacToeBoard: React.FC<Props> = ({ ctx, G, moves, events, playerID }) => {
    const isGameOver = ctx.gameover;
    const isWinner = isGameOver?.winner !== undefined;
    const currentPlayer = ctx.currentPlayer;

    // Tutorial Integration
    const { startTutorial, isActive, currentStep, nextStep, registerMoveCallback, currentStepIndex } = useTutorial();

    // Track previous isActive state (MUST be at top level)
    const previousActiveRef = useRef(isActive);

    // Register move callback for AI moves
    useEffect(() => {
        registerMoveCallback((cellId: number) => {
            if (!isGameOver && G.cells[cellId] === null) {
                moves.clickCell(cellId);
            }
        });
    }, [registerMoveCallback, isGameOver, G.cells, moves]);

    const getWinningLine = (cells: (string | null)[]) => {
        if (!isWinner) return null;
        const positions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let pos of positions) {
            const [a, b, c] = pos;
            if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
                return pos;
            }
        }
        return null;
    };

    const winningLine = getWinningLine(G.cells);

    const onClick = (id: number) => {
        if (!isGameOver && G.cells[id] === null) {
            // Tutorial Check
            if (isActive) {
                if (currentStep?.requireAction) {
                    const targetId = `cell-${id}`;
                    // Only allow move if it matches target or no specific target
                    if (currentStep.highlightTarget && currentStep.highlightTarget !== targetId) {
                        return; // Block invalid tutorial moves
                    }

                    moves.clickCell(id);
                    // Advance tutorial
                    nextStep();
                } else {
                    return; // Block moves during read-only steps
                }
            } else {
                moves.clickCell(id);
            }
        }
    };

    // Handle tutorial start with game reset if needed
    const handleStartTutorial = () => {
        // Always reset game when starting tutorial for clean experience
        events.endGame?.();
        // Small delay to let game reset complete
        setTimeout(() => {
            startTutorial(TicTacToeTutorial);
        }, 100);
    };

    // Reset game when tutorial closes
    useEffect(() => {
        if (previousActiveRef.current && !isActive && ctx.turn > 0) {
            // Tutorial just closed and game has moves: automatically reset for clean UX
            setTimeout(() => events.endGame?.(), 300);
        }
        previousActiveRef.current = isActive;
    }, [isActive, ctx.turn, events]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-neon-void font-sans p-4 relative overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Background Texture & Ambience */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] bg-neon-blue/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-40 w-[600px] h-[600px] bg-neon-pink/10 blur-[120px] rounded-full pointer-events-none"></div>
            {/* Header */}
            <div className="my-8 md:mb-14 text-center relative z-10 transition-all duration-700">
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-[0.25em] uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    Neon <span className="text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">Tac</span> <span className="text-neon-pink drop-shadow-[0_0_10px_rgba(188,19,254,0.5)]">Toe</span>
                </h1>
                <div className="mt-6 flex items-center justify-center gap-6 opacity-40 group">
                    <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-neon-blue shadow-[0_0_8px_rgba(0,243,255,0.5)]"></div>
                    <p className="text-neon-blue text-[10px] tracking-[0.5em] uppercase font-bold group-hover:text-white transition-colors">
                        Protocol_Rev_4.0
                    </p>
                    <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-neon-pink shadow-[0_0_8px_rgba(188,19,254,0.5)]"></div>
                </div>

                {!isActive && (
                    <button
                        onClick={handleStartTutorial}
                        className="mt-10 px-10 py-2.5 bg-transparent border border-neon-blue/30 text-neon-blue hover:bg-neon-blue hover:text-neon-void rounded-none text-xs font-bold transition-all uppercase tracking-[0.4em] relative overflow-hidden group"
                    >
                        <span className="relative z-10 group-hover:animate-glitch inline-block">Execute_Training</span>
                        <div className="absolute inset-0 bg-neon-blue transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    </button>
                )}
            </div>

            {/* Main Interactive Container */}
            <div className="relative z-10 w-full max-w-md">

                {/* Status Bar */}
                <div className="flex justify-between items-end mb-12 px-6">
                    <div className={`transition-all duration-700 ${currentPlayer === '0' && !isGameOver ? 'scale-110' : 'opacity-20 grayscale'}`}>
                        <div className="text-[9px] text-neon-blue font-black tracking-[0.3em] uppercase mb-2">User_Alpha</div>
                        <div className={`flex items-center gap-4 px-5 py-3 border-l-2 ${currentPlayer === '0' && !isGameOver ? 'border-neon-blue bg-neon-blue/5 shadow-[0_0_20px_rgba(0,243,255,0.1)]' : 'border-white/10 bg-transparent'}`}>
                            <div className="w-5 h-5 text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,1)]"><IconX /></div>
                            <span className="text-white font-mono text-xs font-bold tracking-widest">PX-001</span>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-white/5 mx-4 mb-2"></div>

                    <div className={`transition-all duration-700 ${currentPlayer === '1' && !isGameOver ? 'scale-110' : 'opacity-20 grayscale text-right'}`}>
                        <div className="text-[9px] text-neon-pink font-black tracking-[0.3em] uppercase mb-2 text-right">User_Beta</div>
                        <div className={`flex items-center gap-4 px-5 py-3 border-r-2 ${currentPlayer === '1' && !isGameOver ? 'border-neon-pink bg-neon-pink/5 shadow-[0_0_20px_rgba(188,19,254,0.1)]' : 'border-white/10 bg-transparent'}`}>
                            <span className="text-white font-mono text-xs font-bold tracking-widest">PX-002</span>
                            <div className="w-5 h-5 text-neon-pink drop-shadow-[0_0_5px_rgba(188,19,254,1)]"><IconO /></div>
                        </div>
                    </div>
                </div>

                {/* The "Hash" (井) Style Grid - Refactored for Perfect Alignment */}
                <div className={`relative aspect-square w-full max-w-[min(85vw,320px)] mx-auto drop-shadow-[0_0_8px_rgba(0,243,255,0.6)] transition-all ${isActive ? 'z-[60]' : ''}`}>
                    {/* Interaction Grid with Integrated Borders */}
                    <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
                        {G.cells.map((cell, id) => {
                            const isWinningCell = winningLine?.includes(id);
                            const isOccupied = cell !== null;

                            // Determine borders based on cell position to form the '#' shape
                            const isRightBorder = id % 3 !== 2;
                            const isBottomBorder = id < 6;

                            // Is this cell the current tutorial target?
                            const isTutorialTarget = isActive && currentStep?.highlightTarget === `cell-${id}`;

                            return (
                                <div
                                    key={id}
                                    data-tutorial-id={`cell-${id}`}
                                    onClick={() => onClick(id)}
                                    className={`
                                        flex items-center justify-center transition-all duration-300 cursor-pointer relative
                                        ${!isOccupied && !isGameOver ? 'active:bg-white/[0.05] md:hover:bg-white/[0.03]' : ''}
                                        ${isRightBorder ? 'border-r-[2px] border-neon-blue' : ''}
                                        ${isBottomBorder ? 'border-b-[2px] border-neon-blue' : ''}
                                        ${isTutorialTarget ? 'z-[60] relative' : 'z-auto'}
                                    `}
                                    style={{
                                        // Optional: Add glow effect to borders via box-shadow if needed,
                                        // but simple borders are safest for alignment.
                                        boxShadow: isWinningCell ? 'inset 0 0 20px rgba(0,243,255,0.2)' : 'none'
                                    }}
                                >
                                    {/* Win Highlight Glow */}
                                    {isWinningCell && (
                                        <div className={`absolute inset-2 blur-2xl animate-pulse ${cell === '0' ? 'bg-neon-blue/20' : 'bg-neon-pink/20'}`}></div>
                                    )}

                                    <div className={`
                                        transition-all duration-500 transform
                                        ${isOccupied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
                                        ${isWinningCell ? 'scale-125 drop-shadow-[0_0_20px_currentColor]' : ''}
                                        ${!isWinningCell && isGameOver && isOccupied ? 'opacity-20 blur-[2px]' : ''}
                                    `}>
                                        {cell === '0' && (
                                            <div className="w-16 h-16 md:w-20 md:h-20 text-neon-blue drop-shadow-[0_0_30px_rgba(0,243,255,1)]">
                                                <IconX />
                                            </div>
                                        )}
                                        {cell === '1' && (
                                            <div className="w-16 h-16 md:w-20 md:h-20 text-neon-pink drop-shadow-[0_0_30px_rgba(188,19,254,1)]">
                                                <IconO />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Game Controls - Undo/Redo */}
                <div className="mt-8 flex justify-center">
                    <GameControls
                        G={G}
                        ctx={ctx}
                        moves={moves}
                        playerID={playerID}
                    />
                </div>

                {/* Game End Overlay */}
                {isGameOver && (
                    <div className="mt-20 text-center animate-fade-in relative z-20">
                        <div className="relative inline-block px-12 py-5 bg-neon-void/80 backdrop-blur-md border border-white/10 group cursor-pointer overflow-hidden" onClick={() => events.endGame?.()}>
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-transparent to-neon-pink/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <h2 className={`text-3xl font-black tracking-[0.5em] uppercase italic transition-all ${isWinner ? (ctx.gameover.winner === '0' ? 'text-neon-blue' : 'text-neon-pink') : 'text-white/60'}`}>
                                {isWinner ? (ctx.gameover.winner === '0' ? 'P1_VICTORY' : 'P2_VICTORY') : 'SYSTEM_DRAW'}
                            </h2>
                            <div className="mt-2 text-[10px] text-white/30 tracking-[0.8em] uppercase">Click_To_Reboot</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-12 opacity-30 hover:opacity-100 transition-opacity">
                <GameDebugPanel G={G} ctx={ctx} moves={moves} events={events} playerID={playerID} />
            </div>
        </div>
    );
};
