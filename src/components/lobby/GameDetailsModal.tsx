import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LobbyClient } from 'boardgame.io/client';
import { useAuth } from '../../contexts/AuthContext';
import { lobbySocket, type LobbyMatch } from '../../services/lobbySocket';
import { leaveMatch } from '../../hooks/useMatchStatus';
import { GameThumbnail } from './thumbnails';

// Server URL
const SERVER_URL = 'http://localhost:8000';
const lobbyClient = new LobbyClient({ server: SERVER_URL });

interface RoomPlayer {
    id: number;
    name?: string;
}

interface Room {
    matchID: string;
    players: RoomPlayer[];
}

interface GameDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: string;
    title: string;
}

export const GameDetailsModal = ({ isOpen, onClose, gameId, title }: GameDetailsModalProps) => {
    const navigate = useNavigate();
    const modalRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Real room state
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        matchID: string;
        myPlayerID: string;
        myCredentials: string;
        isHost: boolean;
    } | null>(null);

    // 使用 WebSocket 订阅房间列表更新（替代轮询）
    useEffect(() => {
        if (isOpen) {
            // 订阅大厅更新
            const unsubscribe = lobbySocket.subscribe((matches: LobbyMatch[]) => {
                // 转换为 Room 格式
                const roomList: Room[] = matches.map(m => ({
                    matchID: m.matchID,
                    players: m.players,
                }));
                setRooms(roomList);
            });

            // 请求初始数据
            lobbySocket.requestRefresh();

            return () => {
                unsubscribe();
            };
        }
    }, [isOpen]);

    // Detect user's current active room (where we have local credentials)
    const myActiveRoomMatchID = useMemo(() => {
        return rooms.find(r =>
            localStorage.getItem(`match_creds_${r.matchID}`)
        )?.matchID || null;
    }, [rooms]);


    const handleTutorial = () => {
        navigate(`/games/${gameId}/tutorial`);
    };

    const handleCreateRoom = async () => {

        setIsLoading(true);
        try {
            const numPlayers = 2;
            // 获取用户名或生成游客名
            const playerName = user?.username || `游客${Math.floor(Math.random() * 9000) + 1000}`;

            const { matchID } = await lobbyClient.createMatch('TicTacToe', { numPlayers });

            // Join as player 0
            const { playerCredentials } = await lobbyClient.joinMatch('TicTacToe', matchID, {
                playerID: '0',
                playerName,
            });

            // Save credentials for the MatchRoom to pick up (simplest way without complex context for now)
            localStorage.setItem(`match_creds_${matchID}`, JSON.stringify({
                playerID: '0',
                credentials: playerCredentials,
                matchID
            }));

            navigate(`/games/${gameId}/match/${matchID}?playerID=0`);
        } catch (error) {
            console.error('Failed to create match:', error);
            alert('创建房间失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (matchID: string) => {


        // Check available slot
        const match = rooms.find(r => r.matchID === matchID);
        if (!match) return;

        const player0 = match.players[0];
        const player1 = match.players[1];

        // 检查是否有已保存的凭证（重连场景）
        const savedCreds = localStorage.getItem(`match_creds_${matchID}`);
        if (savedCreds) {
            const data = JSON.parse(savedCreds);
            // 检查我们的位置是否仍然是我们的（名字匹配，或者是我们保存的游客身份）
            // 简单处理：只要有凭证且位置没变，就允许重连。
            // 实际上 boardgame.io 会校验 credentials，所以这里只要 ID 对应即可尝试
            const mySlot = match.players[parseInt(data.playerID)];
            if (mySlot) {
                // 直接重连，无需重新加入
                navigate(`/games/${gameId}/match/${matchID}?playerID=${data.playerID}`);
                return;
            }
        }

        // 新加入逻辑：找一个空位
        let targetPlayerID = '';
        if (!player0.name) targetPlayerID = '0';
        else if (!player1.name) targetPlayerID = '1';
        else {
            alert('房间已满');
            return;
        }

        try {
            // 获取用户名或生成游客名
            const playerName = user?.username || `游客${Math.floor(Math.random() * 9000) + 1000}`;

            const { playerCredentials } = await lobbyClient.joinMatch('TicTacToe', matchID, {
                playerID: targetPlayerID,
                playerName,
            });

            localStorage.setItem(`match_creds_${matchID}`, JSON.stringify({
                playerID: targetPlayerID,
                credentials: playerCredentials,
                matchID
            }));

            navigate(`/games/${gameId}/match/${matchID}?playerID=${targetPlayerID}`);
        } catch (error) {
            console.error('Join failed:', error);
            alert('加入房间失败');
        }
    };

    const handleAction = (matchID: string, myPlayerID: string, myCredentials: string, isHost: boolean) => {
        console.log('[LobbyModal] 点击销毁/离开', {
            matchID,
            myPlayerID,
            hasCredentials: !!myCredentials,
            isHost,
        });
        setPendingAction({ matchID, myPlayerID, myCredentials, isHost });
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        const { matchID, myPlayerID, myCredentials, isHost } = pendingAction;
        console.log('[LobbyModal] 确认执行', { matchID, myPlayerID, isHost });
        const success = await leaveMatch('TicTacToe', matchID, myPlayerID, myCredentials);
        console.log('[LobbyModal] 执行完成', { success });
        if (!success) {
            alert('操作失败，请稍后重试。');
            return;
        }
        setPendingAction(null);
        lobbySocket.requestRefresh();
    };

    const handleCancelAction = () => {
        if (pendingAction) {
            console.log('[LobbyModal] 取消操作', { matchID: pendingAction.matchID });
        }
        setPendingAction(null);
    };

    // Pre-process rooms with credentials metadata
    const roomItems = useMemo(() => {
        return rooms.map(room => {
            const p0 = room.players[0]?.name;
            const p1 = room.players[1]?.name;
            const playerCount = (p0 ? 1 : 0) + (p1 ? 1 : 0);
            const isFull = playerCount >= 2;

            const savedCreds = localStorage.getItem(`match_creds_${room.matchID}`);
            let myPlayerID: string | null = null;
            let myCredentials: string | null = null;

            if (savedCreds) {
                try {
                    const parsed = JSON.parse(savedCreds);
                    if (parsed.matchID === room.matchID) {
                        myPlayerID = parsed.playerID;
                        myCredentials = parsed.credentials;
                    }
                } catch (e) { }
            }

            const isUserRoom = user && (p0 === user.username || p1 === user.username);
            const canReconnect = !!myCredentials;
            const isMyRoom = canReconnect || isUserRoom;
            const isHost = myPlayerID === '0';

            return {
                ...room,
                p0, p1,
                isFull,
                isMyRoom,
                canReconnect,
                myPlayerID,
                myCredentials,
                isHost
            };
        });
    }, [rooms, user]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                    />

                    {/* Modal Container - Classic Style */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
                    >
                        <div
                            ref={modalRef}
                            className="bg-[#fcfbf9] pointer-events-auto w-full max-w-2xl h-[450px] rounded-sm shadow-[0_10px_40px_rgba(67,52,34,0.15)] flex flex-col md:flex-row border border-[#e5e0d0] relative overflow-hidden"
                        >
                            {/* Decorative Corners */}
                            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#c0a080]" />
                            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#c0a080]" />
                            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#c0a080]" />
                            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#c0a080]" />

                            {/* Left Panel - Game Info */}
                            <div className="w-full md:w-2/5 bg-[#f3f0e6]/50 border-r border-[#e5e0d0] p-8 flex flex-col items-center text-center font-serif">
                                <div className="w-20 h-20 bg-[#fcfbf9] border border-[#e5e0d0] rounded-[4px] shadow-sm flex items-center justify-center text-4xl text-[#433422] font-bold mb-6 overflow-hidden">
                                    <GameThumbnail gameId={gameId} />
                                </div>
                                <h2 className="text-xl font-bold text-[#433422] mb-2 tracking-wide">{title}</h2>
                                <div className="h-px w-12 bg-[#c0a080] opacity-30 mb-4" />
                                <p className="text-xs text-[#8c7b64] mb-8 leading-relaxed italic">
                                    经典策略游戏。连成3个符号即可获胜。
                                </p>

                                <div className="mt-auto w-full">
                                    <button
                                        onClick={() => navigate(`/games/${gameId}/local`)}
                                        className="w-full py-2 px-4 bg-[#fcfbf9] border border-[#e5e0d0] text-[#433422] font-bold rounded-[4px] hover:bg-[#efede6] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mb-2"
                                    >
                                        👥 本地同屏
                                    </button>
                                    <button
                                        onClick={handleTutorial}
                                        className="w-full py-2 px-4 bg-[#fcfbf9] border border-[#e5e0d0] text-[#433422] font-bold rounded-[4px] hover:bg-[#efede6] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                                    >
                                        🎓 教程模式
                                    </button>
                                </div>
                            </div>

                            {/* Right Panel - Lobby */}
                            <div className="flex-1 p-8 flex flex-col bg-[#fcfbf9] font-serif">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-[#433422] tracking-wider uppercase">在线大厅</h3>
                                    <button onClick={onClose} className="p-1 hover:bg-[#efede6] rounded-full text-[#8c7b64] hover:text-[#433422] transition-colors cursor-pointer">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Create Action */}
                                <div className="mb-6">
                                    {(() => {
                                        // Check if user is already in a match
                                        const activeMatch = user ? rooms.find(r => r.players.some(p => p.name === user.username)) : null;

                                        if (activeMatch) {
                                            return (
                                                <div className="w-full py-3 px-4 bg-[#f8f4e8] border border-[#c0a080] rounded-[4px] flex flex-col items-center gap-2">
                                                    <span className="text-xs text-[#8c7b64] font-bold uppercase tracking-wider">
                                                        您当前正在进行一场对局
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleJoinRoom(activeMatch.matchID)}
                                                            className="px-4 py-1.5 bg-[#c0a080] text-white text-xs font-bold rounded hover:bg-[#a08060] transition-colors cursor-pointer uppercase tracking-wider"
                                                        >
                                                            返回当前对局 (#{activeMatch.matchID.slice(0, 4)})
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                onClick={handleCreateRoom}
                                                disabled={isLoading}
                                                className="w-full py-3 bg-[#433422] hover:bg-[#2b2114] text-[#fcfbf9] font-bold rounded-[4px] shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm uppercase tracking-widest"
                                            >
                                                {isLoading ? '处理中...' : '开设新局'}
                                            </button>
                                        );
                                    })()}
                                </div>

                                {/* Room List */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {roomItems.length === 0 ? (
                                        <div className="text-center text-[#8c7b64] py-10 italic text-sm border border-dashed border-[#e5e0d0] rounded-[4px]">
                                            暂无活跃房间
                                        </div>
                                    ) : (
                                        roomItems.map((room) => (
                                            <div
                                                key={room.matchID}
                                                className={clsx(
                                                    "flex items-center justify-between p-3 rounded-[4px] border transition-colors",
                                                    room.isMyRoom
                                                        ? "border-[#c0a080] bg-[#f8f4e8]"
                                                        : "border-[#e5e0d0] bg-[#fcfbf9] hover:bg-[#f3f0e6]/30"
                                                )}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[#433422] text-sm">
                                                            对局 #{room.matchID.slice(0, 4)}
                                                        </span>
                                                        {room.isMyRoom && (
                                                            <span className="text-[8px] bg-[#c0a080] text-white px-1.5 py-0.5 rounded uppercase font-bold">
                                                                我的
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-[#8c7b64] mt-0.5">
                                                        {room.p0 || '空位'} vs {room.p1 || '空位'}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {room.canReconnect && room.myPlayerID && room.myCredentials && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAction(room.matchID, room.myPlayerID!, room.myCredentials!, room.isHost);
                                                            }}
                                                            className={clsx(
                                                                "px-3 py-1.5 rounded-[4px] text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider border",
                                                                room.isHost
                                                                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                                                    : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                                            )}
                                                        >
                                                            {room.isHost ? '销毁' : '离开'}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleJoinRoom(room.matchID)}
                                                        disabled={(room.isFull && !room.canReconnect) || (!!myActiveRoomMatchID && !room.canReconnect)}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-[4px] text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider",
                                                            room.canReconnect
                                                                ? "bg-[#c0a080] text-white hover:bg-[#a08060]"
                                                                : (room.isFull || (!!myActiveRoomMatchID && !room.canReconnect))
                                                                    ? "bg-[#e5e0d0] text-[#8c7b64] cursor-not-allowed"
                                                                    : "bg-[#433422] text-[#fcfbf9] hover:bg-[#2b2114]"
                                                        )}
                                                        title={myActiveRoomMatchID && !room.canReconnect ? "您当前已在另一场对局中" : undefined}
                                                    >
                                                        {room.canReconnect ? '重连' : (myActiveRoomMatchID && !room.canReconnect) ? '对局中' : room.isFull ? '已满' : '加入'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    {pendingAction && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleCancelAction}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="fixed inset-0 z-[61] flex items-center justify-center p-4"
                            >
                                <div className="bg-[#fcfbf9] border border-[#e5e0d0] shadow-[0_10px_40px_rgba(67,52,34,0.15)] rounded-sm p-6 w-full max-w-sm text-center font-serif">
                                    <div className="text-xs text-[#8c7b64] font-bold uppercase tracking-wider mb-2">
                                        {pendingAction.isHost ? '销毁房间' : '离开房间'}
                                    </div>
                                    <div className="text-[#433422] font-bold text-base mb-5">
                                        {pendingAction.isHost ? '确定要销毁房间吗？' : '确定要离开房间吗？'}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={handleCancelAction}
                                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#e5e0d0] text-[#433422] bg-[#fcfbf9] hover:bg-[#efede6] transition-colors rounded-[4px]"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleConfirmAction}
                                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#433422] text-[#fcfbf9] hover:bg-[#2b2114] transition-colors rounded-[4px]"
                                        >
                                            确认
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};

