import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface GameNamespaceLoadErrorProps {
    gameId?: string;
    error?: string | null;
    onRetry: () => void;
}

export const GameNamespaceLoadError = ({
    gameId,
    error,
    onRetry,
}: GameNamespaceLoadErrorProps) => {
    const { t } = useTranslation('lobby');
    const navigate = useNavigate();

    const handleBack = useCallback(() => {
        if (gameId) {
            navigate(`/?game=${gameId}`, { replace: true });
            return;
        }
        navigate('/', { replace: true });
    }, [gameId, navigate]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans flex items-center justify-center px-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-white">
                    {t('matchRoom.namespaceLoadFailed')}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/70">
                    {t('matchRoom.namespaceLoadFailedDesc')}
                </p>
                {error ? (
                    <p className="mt-3 break-all text-xs leading-5 text-white/45">
                        {error}
                    </p>
                ) : null}
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        onClick={onRetry}
                        className="rounded-lg bg-amber-600/80 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500/90"
                    >
                        {t('matchRoom.connectionTimeout.retry')}
                    </button>
                    <button
                        onClick={handleBack}
                        className="rounded-lg bg-white/10 px-5 py-2 text-sm text-white/70 transition-colors hover:bg-white/20"
                    >
                        {t('matchRoom.connectionTimeout.backToLobby')}
                    </button>
                </div>
            </div>
        </div>
    );
};
