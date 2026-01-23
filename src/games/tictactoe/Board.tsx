import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { BoardProps } from 'boardgame.io/react';
import { LobbyClient } from 'boardgame.io/client';
import type { TicTacToeState } from './game';
import { GameDebugPanel } from '../../components/GameDebugPanel';
import { GameControls } from '../../components/game/GameControls';
import { useDebug } from '../../contexts/DebugContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { useToast } from '../../contexts/ToastContext';
import { useGameAudio } from '../../lib/audio/useGameAudio';
import { TIC_TAC_TOE_AUDIO_CONFIG } from './audio.config';
import { GAME_SERVER_URL } from '../../config/server';

type Props = BoardProps<TicTacToeState>;

const lobbyClient = new LobbyClient({ server: GAME_SERVER_URL });

type LocalScoreboard = {
    xWins: number;
    oWins: number;
};

const LOCAL_SCOREBOARD_KEY = 'tictactoe_scoreboard_v1';

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

// SVG 图标组件 - X (霓虹风格)
const IconX = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
        <path
            d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            className="animate-[draw-stroke_0.3s_cubic-bezier(0.4,0,0.2,1)_forwards]"
            style={{ strokeDasharray: 40, strokeDashoffset: 40 }}
        />
        <style>{`
            @keyframes draw-stroke {
                to { stroke-dashoffset: 0; }
            }
        `}</style>
    </svg>
);

const IconO = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
        <circle
            cx="12" cy="12" r="8"
            stroke="currentColor"
            strokeWidth="4.5"
            className="animate-[draw-circle_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]"
            style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
        />
        <style>{`
            @keyframes draw-circle {
                to { stroke-dashoffset: 0; }
            }
        `}</style>
    </svg>
);

export const TicTacToeBoard: React.FC<Props> = ({ ctx, G, moves, events, playerID, reset, matchData, matchID, credentials, isMultiplayer }) => {
    const isGameOver = ctx.gameover;
    const isWinner = isGameOver?.winner !== undefined;
    const currentPlayer = ctx.currentPlayer;
    const isSpectator = playerID === null || playerID === undefined;
    const isPlayerTurn = isSpectator || currentPlayer === playerID;
    const navigate = useNavigate();
    const { t } = useTranslation('game-tictactoe');
    const toast = useToast();
    const [isRematchLoading, setIsRematchLoading] = useState(false);
    const [scoreboard, setScoreboard] = useState<LocalScoreboard>(() => readLocalScoreboard());

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

    // 音效系统
    useGameAudio({ config: TIC_TAC_TOE_AUDIO_CONFIG, G, ctx });

    const undoHistory = G.sys?.history || [];
    const undoRequest = G.sys?.undoRequest;
    const isCurrentPlayer = playerID !== null && playerID !== undefined && playerID === ctx.currentPlayer;
    const canRequestUndo = undoHistory.length > 0 && !undoRequest && !isCurrentPlayer;
    const canReviewUndo = !!undoRequest && undoRequest.requester !== playerID && isCurrentPlayer;
    const isUndoRequester = undoRequest?.requester === playerID;
    const showUndoControls = !isGameOver && playerID !== null && playerID !== undefined && (canRequestUndo || canReviewUndo || isUndoRequester);
    const showPostGameActions = !!isGameOver;

    // 追踪先前的激活状态（必须在顶层）
    const previousActiveRef = useRef(isActive);

    const isGameOverRef = useRef(isGameOver);
    const cellsRef = useRef(G.cells);
    const didCountResultRef = useRef(false);

    // 为 AI 移动注册回调
    useEffect(() => {
        registerMoveCallback((cellId: number) => {
            if (isGameOverRef.current) return;
            if (cellsRef.current[cellId] !== null) return;
            moves.clickCell(cellId);
        });
    }, [registerMoveCallback, moves]);

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

    const winningLine = getWinningLine(G.cells);

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
        cellsRef.current = G.cells;
    }, [G.cells]);

    useEffect(() => {
        if (!isActive) return;
        if (currentPlayer === null || currentPlayer === undefined) return;
        if (playerID !== currentPlayer) {
            setPlayerID(currentPlayer);
        }
    }, [isActive, currentPlayer, playerID, setPlayerID]);

    // 开发环境下的点击调试日志
    useEffect(() => {
        if (!import.meta.env.DEV) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (window.localStorage.getItem('debug_click') !== '1') return;
            const target = event.target as HTMLElement | null;
            const hit = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
            const targetId = target?.getAttribute?.('data-tutorial-id') ?? target?.id;
            const hitId = hit?.getAttribute?.('data-tutorial-id') ?? hit?.id;
            console.info('[Board] pointerdown', {
                target: target?.tagName,
                targetId,
                hit: hit?.tagName,
                hitId,
                isActive,
                currentStep: currentStep?.id,
                showMask: currentStep?.showMask,
                playerID,
                currentPlayer,
                isGameOver
            });
        };

        window.addEventListener('pointerdown', handlePointerDown, true);
        return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, [isActive, currentStep, playerID, currentPlayer, isGameOver]);

    // 记录点击被拦截的原因
    const logClickBlock = (id: number, reason: string) => {
        if (!import.meta.env.DEV) return;
        if (window.localStorage.getItem('debug_click') !== '1') return;
        console.info('[Board] click blocked', {
            id,
            reason,
            isActive,
            currentStep: currentStep?.id,
            highlightTarget: currentStep?.highlightTarget,
            playerID,
            currentPlayer,
            isGameOver
        });
    };

    const resetGame = useCallback(() => {
        if (typeof reset === 'function') {
            reset();
        } else {
            window.location.reload();
        }
    }, [reset]);

    const handlePlayAgain = useCallback(async () => {
        if (!isMultiplayer) {
            resetGame();
            return;
        }

        if (isRematchLoading) return;

        if (!matchID || !playerID || !credentials) {
            toast.warning({ kind: 'i18n', key: 'rematch.missingInfo', ns: 'game-tictactoe' });
            return;
        }

        setIsRematchLoading(true);
        try {
            const { nextMatchID } = await lobbyClient.playAgain('tictactoe', matchID, {
                playerID,
                credentials,
            });

            const playerName = getPlayerName(String(playerID));
            const { playerCredentials } = await lobbyClient.joinMatch('tictactoe', nextMatchID, {
                playerID: String(playerID),
                playerName,
            });

            localStorage.removeItem(`match_creds_${matchID}`);
            localStorage.setItem(`match_creds_${nextMatchID}`, JSON.stringify({
                playerID: String(playerID),
                credentials: playerCredentials,
                matchID: nextMatchID,
                gameName: 'tictactoe',
            }));

            navigate(`/play/tictactoe/match/${nextMatchID}?playerID=${playerID}`);
        } catch (error) {
            console.error('再来一局失败:', error);
            toast.error({ kind: 'i18n', key: 'rematch.failed', ns: 'game-tictactoe' });
        } finally {
            setIsRematchLoading(false);
        }
    }, [isMultiplayer, isRematchLoading, matchID, playerID, credentials, resetGame, navigate, getPlayerName]);

    const onClick = (id: number) => {
        if (isGameOver) return logClickBlock(id, 'gameover');
        if (G.cells[id] !== null) return logClickBlock(id, 'occupied');

        if (!isPlayerTurn) return logClickBlock(id, 'not-your-turn');

        if (isActive) {
            if (currentStep?.requireAction) {
                const targetId = `cell-${id}`;
                if (currentStep.highlightTarget && currentStep.highlightTarget !== targetId) {
                    return logClickBlock(id, 'not-highlight-target');
                }

                moves.clickCell(id);
                nextStep();
            } else {
                return logClickBlock(id, 'tutorial-no-action');
            }
        } else {
            moves.clickCell(id);
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
        <div className="flex flex-col items-center h-[100dvh] w-full font-sans bg-[#050510] bg-[radial-gradient(ellipse_at_center,_#1a1d2d_0%,_#050510_100%)] overflow-hidden relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* 噪点纹理背景 */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            ></div>

            {/* 页眉 - 居中标题 */}
            <div className="w-full max-w-3xl flex-none flex flex-col items-center mt-4 mb-4 relative z-10">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase italic transform -skew-x-6 select-none leading-none">
                    <span className="text-neon-blue drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">{t('title.primary')}</span>
                    <span className="text-neon-pink drop-shadow-[0_0_15px_rgba(188,19,254,0.8)]">{t('title.secondary')}</span>
                </h1>
            </div>

            {/* 棋盘区域 - 自适应剩余空间 */}
            <div className="flex-1 w-full flex items-center justify-center min-h-0 px-4 py-2 relative pointer-events-none">
                <div className={`relative aspect-square h-full max-h-full max-w-full mx-auto pointer-events-auto transition-all duration-500 ${isActive ? 'z-auto' : 'drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]'}`}>
                    {/* 网格背景线 - 稳定的绝对定位实现 */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* 垂直线 */}
                        <div className="absolute top-0 bottom-0 left-1/3 w-[2px] -translate-x-1/2 bg-neon-blue shadow-[0_0_12px_#00f3ff,0_0_24px_rgba(0,243,255,0.4)]" />
                        <div className="absolute top-0 bottom-0 left-2/3 w-[2px] -translate-x-1/2 bg-neon-blue shadow-[0_0_12px_#00f3ff,0_0_24px_rgba(0,243,255,0.4)]" />

                        {/* 水平线 */}
                        <div className="absolute left-0 right-0 top-1/3 h-[2px] -translate-y-1/2 bg-neon-blue shadow-[0_0_12px_#00f3ff,0_0_243px_rgba(0,243,255,0.4)]" />
                        <div className="absolute left-0 right-0 top-2/3 h-[2px] -translate-y-1/2 bg-neon-blue shadow-[0_0_12px_#00f3ff,0_0_243px_rgba(0,243,255,0.4)]" />
                    </div>

                    <div className="grid grid-cols-3 grid-rows-3 h-full w-full" data-tutorial-id="board-grid">
                        {G.cells.map((cell: string | null, id: number) => {
                            const isWinningCell = winningLine?.includes(id);
                            const isOccupied = cell !== null;
                            const isTutorialTarget = isActive && currentStep?.highlightTarget === `cell-${id}`;
                            const isClickable = !isOccupied && !isGameOver && (playerID === null || currentPlayer === playerID) && (!isActive || (currentStep?.requireAction && (!currentStep.highlightTarget || currentStep.highlightTarget === `cell-${id}`)));

                            // 根据棋子颜色设置胜利发光效果
                            const winningGlow = cell === '0'
                                ? 'filter [--tw-drop-shadow:drop-shadow(0_0_15px_rgba(0,243,255,1))_drop-shadow(0_0_40px_rgba(0,243,255,0.8))]'
                                : 'filter [--tw-drop-shadow:drop-shadow(0_0_15px_rgba(188,19,254,1))_drop-shadow(0_0_40px_rgba(188,19,254,0.8))]';

                            const pieceGlow = cell === '0'
                                ? 'filter [--tw-drop-shadow:drop-shadow(0_0_12px_rgba(0,243,255,0.8))_drop-shadow(0_0_25px_rgba(0,243,255,0.3))]'
                                : 'filter [--tw-drop-shadow:drop-shadow(0_0_12px_rgba(188,19,254,0.8))_drop-shadow(0_0_25px_rgba(188,19,254,0.3))]';

                            return (
                                <div
                                    key={id}
                                    data-tutorial-id={`cell-${id}`}
                                    onClick={() => onClick(id)}
                                    className={`
                                        flex items-center justify-center relative
                                        ${isClickable ? 'cursor-pointer' : ''}
                                        ${isTutorialTarget ? 'z-[10000]' : 'z-auto'}
                                    `}
                                >
                                    <div className={`
                                        w-[65%] h-[65%] transition-all duration-300 flex items-center justify-center
                                        ${isOccupied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
                                        ${isOccupied ? pieceGlow : ''}
                                        ${isWinningCell ? `scale-110 ${winningGlow} brightness-125 animate-pulse` : ''}
                                        ${cell === '0' ? 'text-neon-blue' : 'text-neon-pink'}
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

            {/* 底部区域 - 分数与状态 */}
            <div className="flex-none w-full max-w-2xl px-6 z-10 relative pb-2">
                <div className="flex justify-between items-center w-full text-center text-white/80 relative">
                    {/* 左侧玩家 (P0) */}
                    <div className="flex flex-col items-center gap-2 transition-all duration-300">
                        <div className="flex flex-row items-center gap-2">
                            <span className={`text-[10px] md:text-xs font-bold tracking-[0.2em] text-neon-blue uppercase truncate flex-1 min-w-0 transition-opacity duration-300 ${String(currentPlayer) === '0' ? 'opacity-100' : 'opacity-40'}`}>
                                {getPlayerName('0')}
                            </span>
                            {String(playerID) === '0' && (
                                <span className="px-1.5 py-0.5 rounded-full bg-neon-blue text-black text-[9px] font-bold shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                                    {t('player.self')}
                                </span>
                            )}
                        </div>
                        <div className={`w-8 h-8 md:w-10 md:h-10 text-neon-blue transition-opacity duration-300 ${String(currentPlayer) === '0' ? 'opacity-100' : 'opacity-40'}`}>
                            <IconX />
                        </div>
                        <span className="text-2xl md:text-3xl font-black font-mono">{scoreboard.xWins}</span>
                    </div>

                    {/* 状态文本 - 绝对居中 */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                        {isGameOver ? (
                            <span className="text-xl md:text-2xl font-black tracking-widest text-white animate-pulse whitespace-nowrap">
                                {isWinner ? t('status.win', { player: getPlayerName(ctx.gameover.winner) }) : t('status.draw')}
                            </span>
                        ) : (
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-2 uppercase tracking-[0.2em] font-black text-white italic text-base md:text-lg whitespace-nowrap">
                                    <span className={String(currentPlayer) === '0' ? "text-neon-blue" : "text-neon-pink"}>
                                        {getPlayerName(currentPlayer)}
                                    </span>
                                    <span>{t('status.turnSuffix')}</span>
                                </div>
                                <div className="h-[10px]">
                                    <span
                                        className={`text-[9px] text-white/40 tracking-[0.5em] whitespace-nowrap transition-opacity ${String(currentPlayer) !== String(playerID) ? 'opacity-100 animate-pulse' : 'opacity-0'}`}
                                    >
                                        {t('status.thinking')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧玩家 (P1) */}
                    <div className="flex flex-col items-center gap-2 transition-all duration-300">
                        <div className="flex flex-row items-center gap-2">
                            <span className={`text-[10px] md:text-xs font-bold tracking-[0.2em] text-neon-pink uppercase truncate flex-1 min-w-0 transition-opacity duration-300 ${String(currentPlayer) === '1' ? 'opacity-100' : 'opacity-40'}`}>
                                {getPlayerName('1')}
                            </span>
                            {String(playerID) === '1' && (
                                <span className="px-1.5 py-0.5 rounded-full bg-neon-pink text-black text-[9px] font-bold shadow-[0_0_10px_rgba(188,19,254,0.8)]">
                                    {t('player.self')}
                                </span>
                            )}
                        </div>
                        <div className={`w-8 h-8 md:w-10 md:h-10 text-neon-pink transition-opacity duration-300 ${String(currentPlayer) === '1' ? 'opacity-100' : 'opacity-40'}`}>
                            <IconO />
                        </div>
                        <span className="text-2xl md:text-3xl font-black font-mono">{scoreboard.oWins}</span>
                    </div>
                </div>
            </div>

            {/* 底部操作区域 - 绝对定位悬浮，不占据实际空间 */}
            <div className="absolute bottom-2 left-0 w-full z-30 pointer-events-none">
                {(showPostGameActions || showUndoControls) && (
                    <div className="flex items-center justify-center pointer-events-auto">
                        <div className="flex items-center justify-center transition-all duration-300 transform translate-y-0">
                            {showPostGameActions ? (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handlePlayAgain}
                                        disabled={isRematchLoading}
                                        className="px-5 py-2 rounded-full text-sm font-bold tracking-[0.2em] uppercase text-white/90 border border-white/20 hover:border-neon-blue/60 hover:text-neon-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 backdrop-blur-md"
                                    >
                                        {isRematchLoading ? t('rematch.creating') : t('rematch.playAgain')}
                                    </button>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="px-5 py-2 rounded-full text-sm font-bold tracking-[0.2em] uppercase text-white/70 border border-white/10 hover:border-white/40 hover:text-white transition-colors bg-black/40 backdrop-blur-md"
                                    >
                                        {t('rematch.backToLobby')}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/5">
                                    <GameControls G={G} ctx={ctx} moves={moves} playerID={playerID} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 调试面板 - 覆盖层 */}
            <div className="fixed bottom-0 right-0 p-2 z-50">
                <GameDebugPanel G={G} ctx={ctx} moves={moves} events={events} playerID={playerID} />
            </div>
        </div>
    );
};

export default TicTacToeBoard;
