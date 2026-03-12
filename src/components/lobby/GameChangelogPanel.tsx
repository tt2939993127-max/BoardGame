import { useTranslation } from 'react-i18next';
import { Pin } from 'lucide-react';
import type { GameChangelogItem } from './gameDetailsContent';

interface GameChangelogPanelProps {
    items: GameChangelogItem[] | null;
    error?: boolean;
}

const resolveDisplayDate = (item: GameChangelogItem) => item.publishedAt || item.updatedAt || item.createdAt;

export const GameChangelogPanel = ({ items, error = false }: GameChangelogPanelProps) => {
    const { t } = useTranslation('lobby');

    return (
        <section>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8c7b64]">
                {t('leaderboard.changelogTitle')}
            </h4>

            {error ? (
                <div className="rounded-[6px] border border-dashed border-[#e5e0d0] bg-[#f8f4eb]/70 px-4 py-8 text-center">
                    <p className="text-sm italic text-[#8c7b64]">{t('leaderboard.changelogError')}</p>
                </div>
            ) : items === null ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-[#e5e0d0] bg-[#f8f4eb]/70">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-brown/20 border-t-parchment-brown" />
                    <p className="text-xs italic tracking-wider text-[#8c7b64]">{t('leaderboard.changelogLoading')}</p>
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-[6px] border border-dashed border-[#e5e0d0] bg-[#f8f4eb]/70 px-4 py-8 text-center">
                    <p className="text-sm italic text-[#433422]/60">{t('leaderboard.changelogEmpty')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <article
                            key={item.id}
                            className="rounded-[8px] border border-[#e5e0d0] bg-[#f8f4eb]/80 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-sm font-bold text-[#433422]">{item.title}</h5>
                                {item.versionLabel && (
                                    <span className="rounded-full border border-[#d8cfba] bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#8c7b64]">
                                        {item.versionLabel}
                                    </span>
                                )}
                                {item.pinned && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        <Pin size={10} />
                                        {t('leaderboard.changelogPinned')}
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-[11px] font-medium text-[#8c7b64]">
                                {t('leaderboard.changelogPublishedAt', {
                                    date: new Date(resolveDisplayDate(item)).toLocaleDateString(),
                                })}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#433422]/80">
                                {item.content}
                            </p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};
