import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Client } from 'boardgame.io/react';
import { TicTacToe } from '../games/default/game';
import { TicTacToeBoard } from '../games/default/Board';
import { TicTacToeTutorial } from '../games/default/tutorial';
import { useDebug } from '../contexts/DebugContext';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import { useTutorial } from '../contexts/TutorialContext';
import { useMatchStatus, leaveMatch } from '../hooks/useMatchStatus';

import { SocketIO } from 'boardgame.io/multiplayer';

const GameClient = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
    debug: false,
    multiplayer: SocketIO({ server: 'http://localhost:8000' }),
});

const TutorialClient = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
    debug: false,
    numPlayers: 2,
});

export const MatchRoom = () => {
    const { playerID: debugPlayerID } = useDebug();
    const { matchId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { startTutorial, closeTutorial, isActive } = useTutorial();

    const [isLeaving, setIsLeaving] = useState(false);
    const [pendingDestroy, setPendingDestroy] = useState(false);
    const tutorialStartedRef = useRef(false);

    const isTutorialRoute = window.location.pathname.endsWith('/tutorial');

    // Get playerID from URL query params
    const urlPlayerID = searchParams.get('playerID');

    // Retrieve credentials
    const credentials = useMemo(() => {
        if (matchId && urlPlayerID) {
            const stored = localStorage.getItem(`match_creds_${matchId}`);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.playerID === urlPlayerID) {
                    return data.credentials;
                }
            }
        }
        return undefined;
    }, [matchId, urlPlayerID]);

    const tutorialPlayerID = debugPlayerID ?? urlPlayerID ?? '0';

    // 联机对局优先使用 URL playerID，避免调试默认值覆盖真实身份
    const effectivePlayerID = (isActive || isTutorialRoute)
        ? tutorialPlayerID
        : (urlPlayerID ?? debugPlayerID ?? undefined);

    const statusPlayerID = urlPlayerID ?? debugPlayerID ?? null;

    // 使用房间状态 Hook（以真实玩家身份为准）
    const matchStatus = useMatchStatus(matchId, statusPlayerID);

    useEffect(() => {
        if (!isTutorialRoute) return;
        // Only start if not already active to avoid loops/resets on re-renders
        if (!isActive) {
            startTutorial(TicTacToeTutorial);
        }
    }, [startTutorial, isTutorialRoute, isActive]);

    useEffect(() => {
        if (!isTutorialRoute) return;
        if (isActive) {
            tutorialStartedRef.current = true;
        }
    }, [isTutorialRoute, isActive]);

    useEffect(() => {
        if (!isTutorialRoute) return;
        if (!tutorialStartedRef.current) return;
        if (!isActive) {
            // 返回上一个路由（通常是带游戏参数的首页，会自动打开详情弹窗）
            navigate(-1);
        }
    }, [isTutorialRoute, isActive, navigate]);

    useEffect(() => {
        return () => {
            if (isActive) {
                closeTutorial();
            }
        };
    }, [closeTutorial, isActive]);

    const clearMatchCredentials = () => {
        if (matchId) {
            localStorage.removeItem(`match_creds_${matchId}`);
        }
    };

    // 离开房间处理 - 只断开连接，不删除房间（保留房间以便重连）
    const handleLeaveRoom = async () => {
        if (!matchId) {
            navigate('/');
            return;
        }

        if (!statusPlayerID || !credentials) {
            clearMatchCredentials();
            navigate('/');
            return;
        }

        setIsLeaving(true);
        const success = await leaveMatch('TicTacToe', matchId, statusPlayerID, credentials);
        if (!success) {
            alert('离开房间失败，请稍后重试。');
            setIsLeaving(false);
            return;
        }
        clearMatchCredentials();
        navigate('/');
    };

    // 真正销毁房间（仅房主可用）
    const handleDestroyRoom = async () => {
        if (!matchId || !statusPlayerID || !credentials || !matchStatus.isHost) {
            if (!credentials) {
                alert('无法销毁房间：缺少凭证，请刷新或重新进入对局。');
            }
            return;
        }

        setPendingDestroy(true);
    };

    const handleConfirmDestroy = async () => {
        if (!matchId || !statusPlayerID || !credentials || !matchStatus.isHost) {
            alert('无法销毁房间：权限或凭证异常。');
            setPendingDestroy(false);
            return;
        }

        setIsLeaving(true);
        // 调用 leaveMatch 会让 boardgame.io 检查是否删除房间
        await leaveMatch('TicTacToe', matchId, statusPlayerID, credentials);
        setPendingDestroy(false);
        navigate('/');
    };

    const handleCancelDestroy = () => {
        setPendingDestroy(false);
    };

    const handleExitRoom = async () => {
        if (matchStatus.error) {
            clearMatchCredentials();
            navigate('/');
            return;
        }

        if (matchStatus.isHost) {
            await handleDestroyRoom();
            return;
        }
        await handleLeaveRoom();
    };

    // 如果房间不存在，显示错误并自动跳转
    useEffect(() => {
        if (matchStatus.error && !isTutorialRoute) {
            const timer = setTimeout(() => {
                navigate('/');
            }, 2500); // 2.5 秒后自动跳转

            return () => clearTimeout(timer);
        }
    }, [matchStatus.error, isTutorialRoute, navigate]);

    if (matchStatus.error && !isTutorialRoute) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white/60 text-lg mb-4">{matchStatus.error}</div>
                    <div className="text-white/40 text-sm mb-6 animate-pulse">即将自动返回大厅...</div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        立即返回首页
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
            {/* Top Left: Back Button */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={handleExitRoom}
                    disabled={isLeaving}
                    className="bg-black/40 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-bold border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2 group disabled:opacity-50 shadow-lg"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    {isLeaving ? '离开中...' : '离开'}
                </button>
            </div>

            {/* Top Right: Status & Actions */}
            {!isTutorialRoute && matchId && (
                <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                    {/* Opponent Status */}
                    <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                        {matchStatus.opponentName ? (
                            <>
                                <span className={`w-2 h-2 rounded-full ${matchStatus.opponentConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
                                <span className={`text-sm ${matchStatus.opponentConnected ? 'text-white/90' : 'text-red-400 font-bold'}`}>
                                    {matchStatus.opponentName}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                <span className="text-white/60 text-sm">等待对手...</span>
                            </>
                        )}
                    </div>

                    {/* Room ID */}
                    <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 shadow-lg hidden sm:block">
                        <span className="text-white/40 text-xs">ID: </span>
                        <span className="text-white/80 text-xs font-mono">{matchId.slice(0, 4)}</span>
                    </div>

                    {/* Destroy Room Button (Host Only) */}
                    {matchStatus.isHost ? (
                        <button
                            onClick={handleDestroyRoom}
                            disabled={isLeaving || !credentials}
                            className="bg-red-500/20 backdrop-blur-md text-red-400 px-3 py-2 rounded-full text-xs font-bold border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50 shadow-lg"
                            title={!credentials ? '缺少凭证，无法销毁' : '销毁房间'}
                        >
                            销毁
                        </button>
                    ) : (
                        <button
                            onClick={handleLeaveRoom}
                            disabled={isLeaving || !credentials}
                            className="bg-white/10 backdrop-blur-md text-white/80 px-3 py-2 rounded-full text-xs font-bold border border-white/10 hover:bg-white/20 transition-all disabled:opacity-50 shadow-lg"
                            title={!credentials ? '缺少凭证，无法离开' : '离开房间'}
                        >
                            离开
                        </button>
                    )}
                </div>
            )}

            {/* Game Board - Full Screen */}
            <div className="w-full h-full">
                {isTutorialRoute ? (
                    <TutorialClient />
                ) : (
                    <GameClient
                        playerID={effectivePlayerID}
                        matchID={matchId}
                        credentials={credentials}
                    />
                )}
            </div>

            <TutorialOverlay />

            {pendingDestroy && (
                <>
                    <div
                        onClick={handleCancelDestroy}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />
                    <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
                        <div className="bg-[#fcfbf9] border border-[#e5e0d0] shadow-[0_10px_40px_rgba(0,0,0,0.35)] rounded-sm p-6 w-full max-w-sm text-center">
                            <div className="text-xs text-[#8c7b64] font-bold uppercase tracking-wider mb-2">
                                销毁房间
                            </div>
                            <div className="text-[#433422] font-bold text-base mb-5">
                                确定要销毁房间吗？这将结束对局且无法恢复。
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={handleCancelDestroy}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#e5e0d0] text-[#433422] bg-[#fcfbf9] hover:bg-[#efede6] transition-colors rounded-[4px]"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleConfirmDestroy}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#433422] text-[#fcfbf9] hover:bg-[#2b2114] transition-colors rounded-[4px]"
                                >
                                    确认销毁
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
