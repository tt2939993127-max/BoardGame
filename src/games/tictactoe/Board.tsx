import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardProps } from 'boardgame.io/react';
import type { MatchState } from '../../engine/types';
import type { TicTacToeCore } from './domain';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import { EndgameOverlay } from '../../components/game/EndgameOverlay';
import { UndoProvider } from '../../contexts/UndoContext';
import { useDebug } from '../../contexts/DebugContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { useRematch } from '../../contexts/RematchContext';
import { useGameMode } from '../../contexts/GameModeContext';
import { useGameAudio, playSound } from '../../lib/audio/useGameAudio';
import { TIC_TAC_TOE_AUDIO_CONFIG } from './audio.config';

type Props = BoardProps<MatchState<TicTacToeCore>>;

type LocalScoreboard = {
    xWins: number;
    oWins: number;
};

const LOCAL_SCOREBOARD_KEY = 'tictactoe_scoreboard_v1';

const clearLocalScoreboard = () => {
    try {
        localStorage.removeItem(LOCAL_SCOREBOARD_KEY);
    } catch {
        // ignore
    }
};

const readLocalScoreboard = (): LocalScoreboard => {
    try {
        const raw = localStorage.getItem(LOCAL_SCOREBOARD_KEY);
        if (!raw) return { xWins: 0, oWins: 0 };
        const parsed = JSON.parse(raw) as Partial<LocalScoreboard>;
        return {
            xWins: Number(parsed.xWins) || 0,
            oWins: Number(parsed.oWins) || 0,
        };
    } catch {
        return { xWins: 0, oWins: 0 };
    }
};

const writeLocalScoreboard = (next: LocalScoreboard) => {
    try {
        localStorage.setItem(LOCAL_SCOREBOARD_KEY, JSON.stringify(next));
    } catch {
        // ignore
    }
};



// SVG 图标组件 - X (Premium Neon)
const IconX = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
        <path
            d="M6 6L18 18M18 6L6 18"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="animate-[icon-pop_0.25s_ease-out]"
        />
        <style>{`
            @keyframes icon-pop {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `}</style>
    </svg>
);

// SVG 图标组件 - O (Premium Neon)
const IconO = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
        <circle
            cx="12" cy="12" r="7"
            stroke="currentColor"
            strokeWidth="3.5"
            className="animate-[icon-pop_0.3s_ease-out]"
        />
        <style>{`
            @keyframes icon-pop {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `}</style>
    </svg>
);

export const TicTacToeBoard: React.FC<Props> = ({ ctx, G, moves, events, playerID, reset, matchData, isMultiplayer }) => {
    const isGameOver = ctx.gameover;
    const isWinner = isGameOver?.winner !== undefined;
    const coreCurrentPlayer = G.core.currentPlayer;
    const currentPlayer = coreCurrentPlayer ?? ctx.currentPlayer;
    const gameMode = useGameMode();
    const isLocalMatch = gameMode ? !gameMode.isMultiplayer : !isMultiplayer;
    const isSpectator = !!gameMode?.isSpectator;
    const isPlayerTurn = isLocalMatch || (!isSpectator && currentPlayer === playerID);
    const { t } = useTranslation('game-tictactoe');

    // 本地同屏(hotseat)模式：开始一局时清空本机累计，避免上一轮对战/联机残留造成“离谱分数”。
    // 注意：多人联机的“再来一局”可能是新 match；我们只在本地同屏下清理。
    const isHotseatLocal = isLocalMatch;
    const didClearOnStartRef = useRef(false);

    const [scoreboard, setScoreboard] = useState<LocalScoreboard>(() => {
        if (isHotseatLocal && !didClearOnStartRef.current) {
            didClearOnStartRef.current = true;
            clearLocalScoreboard();
            return { xWins: 0, oWins: 0 };
        }
        return readLocalScoreboard();
    });

    // 获取玩家名称的辅助函数
    const getPlayerName = (pid: string) => {
        if (matchData) {
            const player = matchData.find(p => String(p.id) === pid);
            if (player?.name) return player.name;
        }
        return t('player.guest', { number: Number(pid) + 1 });
    };

    // 教学系统集成
    const { isActive, currentStep, nextStep, registerMoveCallback } = useTutorial();
    const { setPlayerID } = useDebug();

    // 重赛系统（多人模式使用 socket）
    const { state: rematchState, vote: handleRematchVote, registerReset } = useRematch();

    // 注册 reset 回调（当双方都投票后由 socket 触发）
    useEffect(() => {
        if (isMultiplayer && reset) {
            registerReset(reset);
        }
    }, [isMultiplayer, reset, registerReset]);

    // 音效系统
    useGameAudio({ config: TIC_TAC_TOE_AUDIO_CONFIG, G: G.core, ctx });


    // 追踪先前的激活状态（必须在顶层）
    const previousActiveRef = useRef(isActive);
    const isGameOverRef = useRef(isGameOver);
    const cellsRef = useRef(G.core.cells);
    const didCountResultRef = useRef(false);

    useEffect(() => {
        registerMoveCallback((cellId: number) => {
            if (isSpectator) return;
            if (isGameOverRef.current) return;
            if (cellsRef.current[cellId] !== null) return;
            moves.CLICK_CELL({ cellId });
        });
    }, [registerMoveCallback, moves, isSpectator]);

    const getWinningLine = (cells: (string | null)[]) => {
        if (!isWinner) return null;
        const positions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const pos of positions) {
            const [a, b, c] = pos;
            if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
                return pos;
            }
        }
        return null;
    };

    const winningLine = getWinningLine(G.core.cells);

    useEffect(() => {
        isGameOverRef.current = isGameOver;
    }, [isGameOver]);

    useEffect(() => {
        if (!isGameOver) {
            didCountResultRef.current = false;
            return;
        }
        if (didCountResultRef.current) return;

        const winner = isGameOver?.winner;
        const next: LocalScoreboard = { ...scoreboard };
        if (String(winner) === '0') {
            next.xWins += 1;
        } else if (String(winner) === '1') {
            next.oWins += 1;
        }

        didCountResultRef.current = true;
        setScoreboard(next);
        writeLocalScoreboard(next);
    }, [isGameOver, scoreboard]);

    useEffect(() => {
        cellsRef.current = G.core.cells;
    }, [G.core.cells]);

    useEffect(() => {
        if (!isActive) return;
        if (currentPlayer === null || currentPlayer === undefined) return;
        if (playerID !== currentPlayer) {
            setPlayerID(currentPlayer);
        }
    }, [isActive, currentPlayer, playerID, setPlayerID]);

    const resetGame = useCallback(() => {
        if (typeof reset === 'function') {
            reset();
        } else {
            window.location.reload();
        }
    }, [reset]);

    const onClick = (id: number) => {
        if (isGameOver) return;
        if (G.core.cells[id] !== null) return;
        if (isSpectator) {
            if (import.meta.env.DEV) {
                console.warn('[Spectate][TicTacToe] blocked click', { id, playerID, currentPlayer });
            }
            return;
        }

        if (!isPlayerTurn) return;

        playSound('click');

        if (isActive) {
            if (currentStep?.requireAction) {
                const targetId = `cell-${id}`;
                if (currentStep.highlightTarget && currentStep.highlightTarget !== targetId) return;

                moves.CLICK_CELL({ cellId: id });
                nextStep();
            } else {
                return;
            }
        } else {
            moves.CLICK_CELL({ cellId: id });
        }
    };

    useEffect(() => {
        if (!previousActiveRef.current && isActive) {
            resetGame();
        }

        if (previousActiveRef.current && !isActive && (ctx.turn > 0 || ctx.gameover != null)) {
            setTimeout(() => resetGame(), 300);
        }
        previousActiveRef.current = isActive;
    }, [isActive, ctx.turn, ctx.gameover, resetGame]);

    return (
        <UndoProvider value={{ G, ctx, moves, playerID, isGameOver: !!isGameOver, isLocalMode: isLocalMatch }}>
            <div className="flex flex-col items-center h-[100dvh] w-full font-sans bg-black overflow-hidden relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] select-none">

                {/* 顶部标题 - 霞红青色交错的现代风格 */}
                <div className="flex-none flex flex-col items-center mt-8 mb-4 z-10">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tight flex items-center gap-1">
                        <span className="text-neon-blue drop-shadow-[0_0_15px_rgba(0,243,255,0.7)]">TIC</span>
                        <span className="text-neon-pink drop-shadow-[0_0_15px_rgba(188,19,254,0.7)]">TAC TOE</span>
                    </h1>
                </div>

                {/* 棋盘主区域 - 增加圆角外框模拟图片中的底座感 */}
                <div className="flex-1 w-full flex items-center justify-center p-6 min-h-0 relative z-0">
                    <div className="relative aspect-square h-full max-h-[80vw] md:max-h-[60vh] max-w-full p-4 border border-white/10 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">

                        {/* 核心网格线：立体霓虹灯管效果 - 对应图片：左上红，右下蓝 */}
                        <div className="absolute inset-6 pointer-events-none z-10">
                            {/* 垂直线 */}
                            {/* 左竖线 - 粉色 (Pink/Magenta) */}
                            <div className="absolute top-2 bottom-2 left-1/3 w-2 -translate-x-1/2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(188,19,254,0.8),inset_0_0_4px_rgba(255,255,255,0.4)]" />
                            {/* 右竖线 - 青色 (Blue/Cyan) */}
                            <div className="absolute top-2 bottom-2 left-2/3 w-2 -translate-x-1/2 bg-neon-blue rounded-full shadow-[0_0_15px_rgba(0,243,255,0.8),inset_0_0_4px_rgba(255,255,255,0.4)]" />

                            {/* 水平线 */}
                            {/* 上横线 - 粉色 (Pink/Magenta) */}
                            <div className="absolute left-2 right-2 top-1/3 h-2 -translate-y-1/2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(188,19,254,0.8),inset_0_0_4px_rgba(255,255,255,0.4)]" />
                            {/* 下横线 - 青色 (Blue/Cyan) */}
                            <div className="absolute left-2 right-2 top-2/3 h-2 -translate-y-1/2 bg-neon-blue rounded-full shadow-[0_0_15px_rgba(0,243,255,0.8),inset_0_0_4px_rgba(255,255,255,0.4)]" />
                        </div>

                        {/* 棋子层 - 提升 z-index 确保可点击，并使用 inset-0 配合父级的 p-4 */}
                        <div className="grid grid-cols-3 grid-rows-3 h-full w-full absolute inset-0 p-4 z-20">
                            {G.core.cells.map((cell: string | null, id: number) => {
                                const isWinningCell = winningLine?.includes(id);
                                const isOccupied = cell !== null;
                                const isTutorialTarget = isActive && currentStep?.highlightTarget === `cell-${id}`;
                                const isClickable = !isOccupied && !isGameOver && isPlayerTurn && (!isActive || (currentStep?.requireAction && (!currentStep.highlightTarget || currentStep.highlightTarget === `cell-${id}`)));

                                // 动态光晕颜色 (匹配图片：X为粉，O为青)
                                const glowColor = cell === '0' ? 'rgba(188,19,254,' : 'rgba(0,243,255,';
                                const dynamicGlow = isWinningCell
                                    ? `drop-shadow-[0_0_20px_${glowColor}1)] drop-shadow-[0_0_40px_${glowColor}0.8)]`
                                    : `drop-shadow-[0_0_10px_${glowColor}0.6)]`;

                                return (
                                    <div
                                        key={id}
                                        data-tutorial-id={`cell-${id}`}
                                        onClick={() => onClick(id)}
                                        className={`
                                            flex items-center justify-center relative
                                            ${isClickable ? 'cursor-pointer hover:bg-white/5 transition-colors duration-200' : ''}
                                            ${isTutorialTarget ? 'z-[10000] ring-2 ring-white' : ''}
                                        `}
                                    >
                                        <div className={`
                                            w-3/5 h-3/5 flex items-center justify-center 
                                            transition-all duration-300 ease-out
                                            ${isOccupied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
                                            ${isWinningCell ? 'scale-110 brightness-150' : ''}
                                            ${cell === '0' ? 'text-neon-pink' : 'text-neon-blue'}
                                            ${isOccupied ? dynamicGlow : ''}
                                        `}>
                                            {cell === '0' && <IconX className="w-full h-full" />}
                                            {cell === '1' && <IconO className="w-full h-full" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 底部 HUD 仪表盘 */}
                <div className="flex-none w-full max-w-2xl px-8 pb-12 z-10">
                    <div className="relative flex justify-between items-end">

                        {/* 左侧玩家 P0 (X - Pink) */}
                        <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${String(currentPlayer) === '0' || isGameOver ? 'opacity-100' : 'opacity-40'}`}>
                            <div className="text-neon-pink font-bold tracking-widest text-xs md:text-sm uppercase mb-1">
                                {getPlayerName('0')}
                            </div>
                            <IconX className="w-8 h-8 md:w-10 md:h-10 text-neon-pink drop-shadow-[0_0_10px_rgba(188,19,254,0.6)]" />
                            <div className="text-3xl md:text-4xl font-black text-neon-pink mt-2 leading-none">
                                {scoreboard.xWins}
                            </div>
                        </div>

                        {/* 中间状态栏 */}
                        <div className="flex-1 flex flex-col items-center justify-end pb-2">
                            {isGameOver ? (
                                <div className="text-xl md:text-2xl font-black italic text-white tracking-widest animate-pulse whitespace-nowrap drop-shadow-lg">
                                    {isWinner ?
                                        (String(ctx.gameover.winner) === '0' ? <span className="text-neon-pink">{getPlayerName('0')} WINS</span> : <span className="text-neon-blue">{getPlayerName('1')} WINS</span>)
                                        : "DRAW GAME"
                                    }
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className={`text-2xl md:text-3xl font-black italic tracking-wider ${String(currentPlayer) === '0' ? 'text-neon-pink drop-shadow-[0_0_15px_rgba(188,19,254,0.6)]' : 'text-neon-blue drop-shadow-[0_0_15px_rgba(0,243,255,0.6)]'}`}>
                                            {getPlayerName(currentPlayer)}
                                        </span>
                                        <span className="text-sm md:text-base font-bold text-white/80 italic">'S TURN</span>
                                    </div>
                                    <div className="h-1 w-24 bg-gray-800 rounded-full overflow-hidden">
                                        <div className={`h-full w-full rounded-full animate-[loading_1.5s_ease-in-out_infinite] ${String(currentPlayer) === '0' ? 'bg-neon-pink' : 'bg-neon-blue'}`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 右侧玩家 P1 (O - Blue) */}
                        <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${String(currentPlayer) === '1' || isGameOver ? 'opacity-100' : 'opacity-40'}`}>
                            <div className="text-neon-blue font-bold tracking-widest text-xs md:text-sm uppercase mb-1">
                                {getPlayerName('1')}
                            </div>
                            <IconO className="w-8 h-8 md:w-10 md:h-10 text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]" />
                            <div className="text-3xl md:text-4xl font-black text-neon-blue mt-2 leading-none">
                                {scoreboard.oWins}
                            </div>
                        </div>

                    </div>
                </div>

                {/* 统一结束页面遮罩 */}
                <EndgameOverlay
                    isGameOver={!!isGameOver}
                    result={isGameOver}
                    playerID={playerID}
                    reset={isSpectator ? undefined : reset}
                    isMultiplayer={isSpectator ? false : isMultiplayer}
                    totalPlayers={matchData?.length}
                    rematchState={rematchState}
                    onVote={isSpectator ? undefined : handleRematchVote}
                />
                {!isSpectator && (
                    <div className="fixed bottom-0 right-0 p-2 z-50 opacity-0 hover:opacity-100 transition-opacity">
                        <GameDebugPanel G={G} ctx={ctx} moves={moves} events={events} playerID={playerID} autoSwitch={!isMultiplayer} />
                    </div>
                )}
            </div>
        </UndoProvider>
    );
};

export default TicTacToeBoard;
