import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { ModalBase } from '../common/overlays/ModalBase';

interface AvatarUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    closeOnBackdrop?: boolean;
}

export const AvatarUpdateModal = ({ isOpen, onClose, closeOnBackdrop }: AvatarUpdateModalProps) => {
    const { t } = useTranslation('auth');
    const { updateAvatar, user } = useAuth();
    const [avatar, setAvatar] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAvatar(user?.avatar ?? '');
            setError('');
            setIsLoading(false);
        }
    }, [isOpen, user]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedAvatar = avatar.trim();
        if (!normalizedAvatar) {
            setError(t('avatar.error.missing'));
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await updateAvatar(normalizedAvatar);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('avatar.error.updateFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalBase
            onClose={onClose}
            closeOnBackdrop={closeOnBackdrop}
            containerClassName="p-4 sm:p-6"
        >
            <div className="bg-parchment-card-bg pointer-events-auto w-full max-w-[360px] shadow-parchment-card-hover border border-parchment-card-border/50 p-6 sm:p-8 relative rounded-sm font-serif">
                <div className="text-center mb-5">
                    <div className="text-xs sm:text-sm text-parchment-light-text font-bold uppercase tracking-wider">
                        {t('avatar.title')}
                    </div>
                    <div className="h-px w-10 bg-parchment-card-border/70 mx-auto mt-2" />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-parchment-light-text uppercase tracking-wider mb-2">
                            {t('avatar.label')}
                        </label>
                        <input
                            type="url"
                            value={avatar}
                            onChange={(event) => setAvatar(event.target.value)}
                            placeholder={t('avatar.placeholder')}
                            className="w-full px-3 py-2 bg-parchment-base-bg/30 border border-parchment-card-border/50 text-parchment-base-text placeholder:text-parchment-light-text/60 focus:outline-none focus:border-parchment-base-text transition-colors text-sm rounded-[4px]"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider border border-parchment-card-border/50 text-parchment-base-text bg-parchment-card-bg hover:bg-parchment-base-bg transition-colors rounded-[4px]"
                        >
                            {t('avatar.button.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-parchment-base-text text-parchment-card-bg hover:bg-parchment-brown transition-colors rounded-[4px] disabled:opacity-60"
                        >
                            {isLoading ? t('avatar.button.saving') : t('avatar.button.save')}
                        </button>
                    </div>
                </form>
            </div>
        </ModalBase>
    );
};
