import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocial } from '../../contexts/SocialContext';
import { useModalStack } from '../../contexts/ModalStackContext';
import { useAuth } from '../../contexts/AuthContext';
import { FriendsChatModal } from '../social/FriendsChatModal';
import { FabMenu } from './FabMenu';
import { AudioControlSection } from '../game/AudioControlSection';
import { MessageSquare, Settings, Info, MessageSquareWarning, Maximize, Minimize } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AboutModal } from './AboutModal';
import { FeedbackModal } from './FeedbackModal';

export const GlobalHUD = () => {
    const { t } = useTranslation('game');
    const { unreadTotal, requests } = useSocial();
    const { openModal } = useModalStack();
    const { user } = useAuth();
    const location = useLocation();

    // Determine theme based on route
    const isGamePage = location.pathname.startsWith('/play/');
    const isDark = isGamePage;

    const totalBadge = unreadTotal + requests.length;

    const [showAbout, setShowAbout] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setIsFullscreen(false));
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // If in game page, let GameHUD handle the floating menu to avoid duplicates
    if (isGamePage) {
        return null;
    }

    const btnClass = isDark
        ? "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white/90"
        : "bg-parchment-base-bg/50 hover:bg-parchment-base-bg/80 border border-parchment-card-border/20 text-parchment-base-text shadow-sm";

    return (
        <>
            <FabMenu
                isDark={isDark}
                icon={
                    <div className="relative">
                        <Settings size={20} />
                        {totalBadge > 0 && (
                            <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border border-black/50" />
                        )}
                    </div>
                }
                activeColor={isDark ? "text-white/80" : "text-parchment-base-text"}
                className="fixed bottom-8 right-8 z-[9000] flex flex-col items-end gap-2 font-sans"
                titleExpand={t('hud.toggle.expand') || 'Expand'}
                titleCollapse={t('hud.toggle.collapse') || 'Collapse'}
            >
                {/* Social Section */}
                {user && (
                    <div className="pt-1 pb-1 w-full">
                        <button
                            onClick={() => {
                                openModal({
                                    closeOnBackdrop: true,
                                    closeOnEsc: true,
                                    render: ({ close }) => (
                                        <FriendsChatModal isOpen onClose={close} />
                                    ),
                                });
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-semibold text-sm group ${btnClass}`}
                        >
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} />
                                <span>{t('hud.actions.social') || 'Social'}</span>
                            </div>
                            {totalBadge > 0 && (
                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white font-bold">
                                    {totalBadge > 9 ? '9+' : totalBadge}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* System Actions */}
                <div className="flex gap-2 w-full">
                    <button
                        onClick={() => setShowAbout(true)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${btnClass}`}
                        title="About"
                    >
                        <Info size={16} />
                        <span>关于</span>
                    </button>
                    <button
                        onClick={() => setShowFeedback(true)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${btnClass}`}
                        title="Feedback"
                    >
                        <MessageSquareWarning size={16} />
                        <span>反馈</span>
                    </button>
                </div>

                <div className="w-full">
                    <button
                        onClick={toggleFullscreen}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${btnClass}`}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        <span>{isFullscreen ? '退出全屏' : '全屏模式'}</span>
                    </button>
                </div>

                {/* Audio Section */}
                <div className="w-full">
                    <AudioControlSection isDark={isDark} />
                </div>
            </FabMenu>

            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
            {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
        </>
    );
};
