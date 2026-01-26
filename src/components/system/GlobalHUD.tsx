import { useTranslation } from 'react-i18next';
import { useSocial } from '../../contexts/SocialContext';
import { useModalStack } from '../../contexts/ModalStackContext';
import { FriendsChatModal } from '../social/FriendsChatModal';
import { FabMenu } from './FabMenu';
import { AudioControlSection } from '../game/AudioControlSection';
import { MessageSquare, Settings } from 'lucide-react';

// Global HUD logic
// Checks if we are in game, if so, returns null (let GameHUD handle it) -> NOW CHANGED: Always render.

export const GlobalHUD = () => {
    const { t } = useTranslation(['game', 'hud']);
    const { unreadTotal, requests } = useSocial(); // We can show red dot on the fab itself if we want
    const { openModal } = useModalStack();

    const totalBadge = unreadTotal + requests.length;

    return (
        <FabMenu
            icon={
                <div className="relative">
                    <Settings size={20} />
                    {totalBadge > 0 && (
                        <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border border-black/50" />
                    )}
                </div>
            }
            activeColor="text-white/80"
            className="fixed bottom-8 right-8 z-[9000] flex flex-col items-end gap-2 font-sans"
            titleExpand={t('hud:toggle.expand') || 'Expand'}
            titleCollapse={t('hud:toggle.collapse') || 'Collapse'}
        >
            {/* Social Section */}
            <div className="pt-1 pb-1">
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
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all font-semibold text-sm group"
                >
                    <div className="flex items-center gap-2 text-white/90">
                        <MessageSquare size={16} />
                        <span>{t('hud:actions.social') || 'Social'}</span>
                    </div>
                    {totalBadge > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white font-bold">
                            {totalBadge > 9 ? '9+' : totalBadge}
                        </span>
                    )}
                </button>
            </div>

            {/* Audio Section */}
            <AudioControlSection />
        </FabMenu>
    );
};
