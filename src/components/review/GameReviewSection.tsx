import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { getGamesByCategory } from '../../config/games.config';
import { ApprovalBar } from './ApprovalBar';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import {
    fetchReviewStats,
    fetchReviews,
    fetchMyReview,
    createReview,
    deleteReview
} from '../../api/review';
import { useToast } from '../../contexts/ToastContext';

export const GameReviewSection = () => {
    const { t } = useTranslation(['review', 'common']);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { success, error } = useToast();

    // Get all games for the selector
    const games = useMemo(() => getGamesByCategory('All'), []);
    const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '');

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['reviewStats', selectedGameId],
        queryFn: () => fetchReviewStats(selectedGameId),
        enabled: !!selectedGameId,
    });

    // Fetch my review
    const { data: myReview } = useQuery({
        queryKey: ['myReview', selectedGameId],
        queryFn: () => fetchMyReview(selectedGameId),
        enabled: !!selectedGameId && !!user,
        retry: false,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: { isPositive: boolean; content: string }) =>
            createReview(selectedGameId, data.isPositive, data.content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviewStats', selectedGameId] });
            queryClient.invalidateQueries({ queryKey: ['reviews', selectedGameId] });
            queryClient.invalidateQueries({ queryKey: ['myReview', selectedGameId] });
            success(t('form.success', '评价已发布'));
        },
        onError: (err: Error) => {
            error(err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (gameId: string) => deleteReview(gameId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviewStats', selectedGameId] });
            queryClient.invalidateQueries({ queryKey: ['reviews', selectedGameId] });
            queryClient.invalidateQueries({ queryKey: ['myReview', selectedGameId] });
            success(t('form.deleted', '评价已删除'));
        },
        onError: (err: Error) => {
            error(err.message);
        }
    });

    return (
        <section className="w-full max-w-4xl mx-auto py-12 px-6 flex flex-col gap-8">
            <div className="flex flex-col gap-4 items-center text-center">
                <h2 className="text-2xl font-bold text-[#433422] tracking-wider uppercase">
                    {t('section.title')}
                </h2>
                <div className="h-px w-24 bg-[#433422]/20" />
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left: Game Selector & Stats */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-[#433422]/50 uppercase tracking-wide">
                            {t('section.selectGame', '选择游戏')}
                        </label>
                        <select
                            value={selectedGameId}
                            onChange={(e) => setSelectedGameId(e.target.value)}
                            className="w-full p-2.5 bg-white border border-[#d3ccba] rounded font-bold text-[#433422] focus:outline-none focus:border-[#8c7b64]"
                        >
                            {games.map(game => (
                                <option key={game.id} value={game.id}>
                                    {String(t(game.titleKey as any))}
                                </option>
                            ))}
                        </select>
                    </div>

                    {stats && (
                        <div className="bg-[#fcfbf9] p-6 rounded border border-[#d3ccba]/50 shadow-sm flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded shadow-md border border-[#d3ccba] overflow-hidden flex items-center justify-center bg-white">
                                {games.find(g => g.id === selectedGameId)?.thumbnail}
                            </div>
                            <ApprovalBar
                                total={stats.total}
                                rate={stats.rate}
                                positive={stats.positive}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Review Form & List */}
                <div className="w-full md:w-2/3 flex flex-col gap-6">
                    {user ? (
                        <ReviewForm
                            onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
                            initialData={myReview ? { isPositive: myReview.isPositive, content: myReview.content } : undefined}
                            isSubmitting={createMutation.isPending}
                        />
                    ) : (
                        <div className="bg-[#fcfbf9] border border-[#d3ccba] rounded p-6 text-center text-[#433422]/60 italic">
                            {t('form.loginToReview')}
                        </div>
                    )}

                    <div className="h-px w-full bg-[#d3ccba]/30" />

                    <ReviewListWrapper
                        gameId={selectedGameId}
                        currentUserId={user?.id}
                        onDeleteReview={async (gid) => { await deleteMutation.mutateAsync(gid); }}
                    />
                </div>
            </div>
        </section>
    );
};

const ReviewListWrapper = ({
    gameId,
    currentUserId,
    onDeleteReview
}: {
    gameId: string,
    currentUserId?: string,
    onDeleteReview: (id: string) => Promise<void>
}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isLoading
    } = useInfiniteQuery({
        queryKey: ['reviews', gameId],
        queryFn: ({ pageParam }) => fetchReviews(gameId, pageParam as number, 10),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    });

    const reviews = useMemo(() => data?.pages.flatMap(p => p.items) || [], [data]);

    return (
        <ReviewList
            reviews={reviews}
            loading={isLoading}
            hasMore={!!hasNextPage}
            onLoadMore={() => fetchNextPage()}
            currentUserId={currentUserId}
            onDeleteReview={onDeleteReview}
        />
    );
}
