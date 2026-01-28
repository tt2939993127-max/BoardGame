import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModalStack } from '../../contexts/ModalStackContext';
import { useTranslation } from 'react-i18next';
import { LogOut, Mail, History, Image } from 'lucide-react';
import { MatchHistoryModal } from './MatchHistoryModal';

interface UserMenuProps {
    onLogout: () => void;
    onBindEmail: () => void;
}

export const UserMenu = ({ onLogout, onBindEmail }: UserMenuProps) => {
    const { user } = useAuth();
    const { openModal } = useModalStack();
    const { t } = useTranslation(['auth', 'social']);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleOpenHistory = () => {
        setIsOpen(false);
        openModal({
            closeOnBackdrop: true,
            closeOnEsc: true,
            render: ({ close }) => (
                <MatchHistoryModal isOpen onClose={close} />
            ),
        });
    };

    const handleSetAvatar = async () => {
        setIsOpen(false);
        const url = window.prompt(t('auth:prompt.avatarUrl') || 'Enter Avatar URL:');
        if (url) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/auth/update-avatar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ avatar: url })
                });
                if (res.ok) {
                    window.location.reload();
                } else {
                    alert('Failed to update avatar');
                }
            } catch (e) {
                console.error(e);
                alert('Error updating avatar');
            }
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group relative flex items-center gap-2 cursor-pointer transition-colors px-2 py-1 outline-none"
            >
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        className="w-8 h-8 rounded-full object-cover border border-parchment-card-border shadow-sm group-hover:border-parchment-light-text transition-colors"
                        alt={user.username}
                    />
                ) : (
                    <div className="relative group-hover:text-parchment-brown text-parchment-base-text">
                        <span className="font-bold text-sm tracking-tight">{user.username}</span>
                        <span className="underline-center" />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-parchment-card-bg shadow-parchment-card-hover border border-parchment-card-border rounded-sm py-2 px-2 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-1 flex flex-col gap-1">
                    {/* Match History */}
                    <button
                        onClick={handleOpenHistory}
                        className="w-full px-4 py-2.5 text-left cursor-pointer text-parchment-base-text font-bold text-xs hover:bg-parchment-base-bg rounded flex items-center gap-3 transition-colors"
                    >
                        <History size={16} />
                        {t('social:menu.matchHistory')}
                    </button>

                    <div className="h-px bg-parchment-card-border/30 my-1 mx-2 opacity-50" />

                    {/* Set Avatar */}
                    <button
                        onClick={handleSetAvatar}
                        className="w-full px-4 py-2.5 text-left cursor-pointer text-parchment-base-text font-bold text-xs hover:bg-parchment-base-bg rounded flex items-center gap-3 transition-colors"
                    >
                        <Image size={16} />
                        {t('auth:menu.setAvatar') || 'Set Avatar'}
                    </button>

                    {/* Bind Email */}
                    <button
                        onClick={() => { setIsOpen(false); onBindEmail(); }}
                        className="w-full px-4 py-2.5 text-left cursor-pointer text-parchment-base-text font-bold text-xs hover:bg-parchment-base-bg rounded flex items-center gap-3 transition-colors"
                    >
                        <Mail size={16} />
                        {user.emailVerified ? t('auth:menu.emailBound') : t('auth:menu.bindEmail')}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={() => { setIsOpen(false); onLogout(); }}
                        className="w-full px-4 py-2.5 text-left cursor-pointer text-parchment-light-text hover:text-red-500 font-bold text-xs hover:bg-parchment-base-bg rounded flex items-center gap-3 transition-colors"
                    >
                        <LogOut size={16} />
                        {t('auth:menu.logout')}
                    </button>
                </div>
            )}
        </div>
    );
};
