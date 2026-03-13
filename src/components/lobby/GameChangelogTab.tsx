import { useTranslation } from 'react-i18next';

interface GameChangelogTabProps {
    gameId: string;
}

export const GameChangelogTab = ({ gameId: _gameId }: GameChangelogTabProps) => {
    const { t } = useTranslation('lobby');

    return (
        <section aria-live="polite" className="py-1">
            <div className="px-0.5 py-2 text-sm leading-6 text-[#8c7b64]">
                {t('leaderboard.changelogEmpty')}
            </div>
        </section>
    );
};
