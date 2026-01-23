import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut,
    Trash2,
    Monitor,
    Users,
    Copy,
    Check,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AudioControlSection } from './AudioControlSection';

interface GameHUDProps {
    mode: 'local' | 'online' | 'tutorial';

    // Online specific props
    matchId?: string;
    isHost?: boolean;
    credentials?: string;

    // Player status (for online)
    myPlayerId?: string | null;
    opponentName?: string | null;
    opponentConnected?: boolean;

    // Actions
    onLeave?: () => void;
    onDestroy?: () => void;
    isLoading?: boolean;
}

export const GameHUD = ({
    mode,
    matchId,
    isHost,
    credentials,
    opponentName,
    opponentConnected,
    onLeave,
    onDestroy,
    isLoading = false
}: GameHUDProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation('game');
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('game_hud_position');
        return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    });

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const copyRoomId = () => {
        if (matchId) {
            navigator.clipboard.writeText(matchId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleExpand = () => setExpanded(!expanded);

    const handleLeave = () => {
        if (isLoading) return;
        if (onLeave) onLeave();
        else navigate('/');
    };

    const handleDestroy = () => {
        if (isLoading) return;
        if (onDestroy) onDestroy();
    };

    // Derived states
    const isOnline = mode === 'online';
    const isLocal = mode === 'local';
    const isTutorial = mode === 'tutorial';

    return (
        <motion.div
            ref={containerRef}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
                const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
                setPosition(newPos);
                localStorage.setItem('game_hud_position', JSON.stringify(newPos));
            }}
            animate={position}
            className="fixed bottom-8 right-8 z-[10000] flex flex-col items-end gap-2 font-sans"
        >
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl w-[85vw] max-w-[320px] md:min-w-[260px] flex flex-col gap-4 mb-2 cursor-default"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when interacting with menu
                    >
                        {/* Header Section */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                {isLocal ? t('hud.mode.local') : isTutorial ? t('hud.mode.tutorial') : t('hud.mode.online')}
                            </span>
                            {isOnline && matchId && (
                                <button
                                    onClick={copyRoomId}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors group"
                                    title={t('hud.copyRoomId')}
                                >
                                    <span className="text-white/40 text-[10px] font-mono group-hover:text-white/80 transition-colors">
                                        {t('hud.roomId', { id: matchId.slice(0, 4) })}
                                    </span>
                                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="text-white/40 group-hover:text-white/80" />}
                                </button>
                            )}
                        </div>

                        {/* Status Section */}
                        <div className="space-y-3">
                            {isOnline && (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                            <span className="text-white/90 font-medium">{t('hud.status.self')}</span>
                                        </div>
                                        <span className="text-white/40 text-xs">{t('hud.status.connected')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${opponentName ? (opponentConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse') : 'bg-yellow-500 animate-pulse'}`} />
                                            <span className={`${opponentName ? 'text-white/90' : 'text-white/50'} font-medium`}>
                                                {opponentName || t('hud.status.waiting')}
                                            </span>
                                        </div>
                                        <span className="text-white/40 text-xs">
                                            {opponentName ? (opponentConnected ? t('hud.status.opponent') : t('hud.status.offline')) : t('hud.status.searching')}
                                        </span>
                                    </div>
                                </>
                            )}

                            {isLocal && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Monitor size={16} className="text-neon-blue" />
                                        <span className="text-neon-blue font-bold text-sm">{t('hud.status.localTitle')}</span>
                                    </div>
                                    <p className="text-white/40 text-xs leading-relaxed">
                                        {t('hud.status.localDescription')}
                                    </p>
                                </div>
                            )}

                            {isTutorial && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Check size={16} className="text-green-400" />
                                        <span className="text-green-400 font-bold text-sm">{t('hud.status.tutorialTitle')}</span>
                                    </div>
                                    <p className="text-white/40 text-xs leading-relaxed">
                                        {t('hud.status.tutorialDescription')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Audio Section */}
                        <AudioControlSection />

                        {/* Actions Section */}
                        <div className="pt-2 flex flex-col gap-2">
                            {isOnline && isHost && (
                                <button
                                    onClick={handleDestroy}
                                    disabled={!credentials || isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                    <span>{t('hud.actions.destroy')}</span>
                                </button>
                            )}

                            <button
                                onClick={handleLeave}
                                disabled={isOnline && (!credentials || isLoading)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 hover:border-white/20 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                                <span>{isHost ? t('hud.actions.leaveKeep') : t('hud.actions.backToLobby')}</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The Floating Ball (Trigger) */}
            <motion.button
                layout
                onClick={toggleExpand}
                className={`
                    shadow-2xl flex items-center justify-center rounded-full 
                    border backdrop-blur-md transition-all active:scale-95
                    ${expanded
                        ? 'p-4 bg-white/20 border-white/30 text-white ring-2 ring-white/10'
                        : 'w-12 h-12 bg-black/60 border-white/10 text-white/80 hover:bg-black/80 hover:border-white/30 hover:shadow-neon-blue/20'
                    }
                    cursor-grab active:cursor-grabbing
                `}
                whileHover={{ scale: 1.1 }}
                title={expanded ? t('hud.toggle.collapse') : t('hud.toggle.expand')}
            >
                <AnimatePresence mode="wait">
                    {expanded ? (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                        >
                            <ChevronRight size={20} className="rotate-90" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className={`
                                flex items-center justify-center
                                ${isOnline ? 'text-indigo-400' : isLocal ? 'text-neon-blue' : 'text-emerald-400'}
                            `}
                        >
                            {isOnline ? <Users size={20} /> : isLocal ? <Monitor size={20} /> : <Check size={20} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </motion.div>
    );
};
