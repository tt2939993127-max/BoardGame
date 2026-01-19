import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface Room {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    status: 'Waiting' | 'Playing';
}

interface GameDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: string;
    title: string;
}

// Mock room data for now
const MOCK_ROOMS: Room[] = [
    { id: '101', name: "Alpha的游戏", players: 1, maxPlayers: 2, status: 'Waiting' },
    { id: '102', name: "Beta的游戏", players: 1, maxPlayers: 2, status: 'Waiting' },
    { id: '103', name: "专业对战", players: 2, maxPlayers: 2, status: 'Playing' },
];

export const GameDetailsModal = ({ isOpen, onClose, gameId, title }: GameDetailsModalProps) => {
    const navigate = useNavigate();
    // Using a ref to prevent clicking outside from firing immediately if modal just opened
    const modalRef = useRef<HTMLDivElement>(null);

    const handleTutorial = () => {
        // In strict modal design, we might want to navigate to a tutorial route
        // OR just open the tutorial overlay.
        // For now, let's treat tutorial as a special match ID or query param?
        // User requested "Tutorial Entry" in the modal.
        // Let's assume we navigate to the game with tutorial mode enabled.
        // BUT current logic is: App -> Debug -> Truth.
        // Let's just navigate to match/tutorial for now and handle it there.
        navigate(`/games/${gameId}/tutorial`);
    };

    const handleCreateRoom = () => {
        // Navigate to a new match
        navigate(`/games/${gameId}/match/new-${Date.now()}`);
    };

    const handleJoinRoom = (roomId: string) => {
        navigate(`/games/${gameId}/match/${roomId}`);
    };

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

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
                    >
                        {/* Modal Card */}
                        <div
                            ref={modalRef}
                            className="bg-white pointer-events-auto w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
                        >
                            {/* Left Panel: Hero & Info */}
                            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-5xl text-white font-bold mb-6">
                                    {title[0]}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
                                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                    经典策略游戏。连成3个符号即可获胜。易学难精。
                                </p>

                                <div className="mt-auto w-full">
                                    <button
                                        onClick={handleTutorial}
                                        className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="text-blue-500">🎓</span>
                                        教程模式
                                    </button>
                                </div>
                            </div>

                            {/* Right Panel: Actions & Rooms */}
                            <div className="flex-1 p-8 flex flex-col bg-white">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">大厅</h3>
                                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Create Action */}
                                <div className="mb-8">
                                    <button
                                        onClick={handleCreateRoom}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        创建新房间
                                    </button>
                                </div>

                                {/* Room List header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">可用房间</h4>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{MOCK_ROOMS.length} 个活跃</span>
                                </div>

                                {/* Room List */}
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar">
                                    {MOCK_ROOMS.map((room) => (
                                        <div
                                            key={room.id}
                                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
                                        >
                                            <div>
                                                <div className="font-semibold text-slate-700">{room.name}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                    <span className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        room.status === 'Waiting' ? "bg-green-400" : "bg-orange-400"
                                                    )} />
                                                    {room.id} • {room.players}/{room.maxPlayers} 玩家
                                                </div>
                                            </div>

                                            <button
                                                disabled={room.status === 'Playing'}
                                                onClick={() => handleJoinRoom(room.id)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                                    room.status === 'Playing'
                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                        : "bg-white border border-slate-200 text-slate-700 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white group-hover:shadow-md"
                                                )}
                                            >
                                                {room.status === 'Playing' ? '已满' : '加入'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
