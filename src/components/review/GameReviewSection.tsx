import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { ApprovalBar } from './ApprovalBar';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import { fetchReviewStats, fetchReviews, fetchMyReview, createReview, deleteReview } from '../../api/review';
import { useToast } from '../../contexts/ToastContext';
import { useModalStack } from '../../contexts/ModalStackContext';
import { ModalBase } from '../common/overlays/ModalBase';
import { Edit2, Plus, X } from 'lucide-react';

export const GameReviews = ({ gameId }: { gameId: string }) => {
    const { t } = useTranslation(['review', 'common']);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { success, error } = useToast();
    const { openModal } = useModalStack();

    // Fetch stats
    const { data: stats, isError: isStatsError } = useQuery({
        queryKey: ['reviewStats', gameId],
        queryFn: () => fetchReviewStats(gameId),
        enabled: !!gameId,
    });

    // Fetch my review
    const { data: myReview } = useQuery({
        queryKey: ['myReview', gameId],
        queryFn: () => fetchMyReview(gameId),
        enabled: !!gameId && !!user,
        retry: false,
    });

    const refreshData = () => {
        queryClient.invalidateQueries({ queryKey: ['reviewStats', gameId] });
        queryClient.invalidateQueries({ queryKey: ['reviews', gameId] });
        queryClient.invalidateQueries({ queryKey: ['myReview', gameId] });
    };

    const handleOpenReviewModal = () => {
        if (!user) return;

        openModal({
            closeOnBackdrop: true,
            render: ({ close }) => (
                <ModalBase onClose={close}>
                    <div className="bg-parchment-card-bg w-full max-w-lg rounded-sm shadow-parchment-card border border-parchment-card-border/30 overflow-hidden pointer-events-auto flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-parchment-card-border/10">
                            <span className="text-lg font-bold text-parchment-base-text uppercase tracking-widest">
                                {myReview ? t('form.editTitle', '修改我的评价') : t('form.newTitle', '撰写评价')}
                            </span>
                            <button onClick={close} className="p-1 hover:bg-parchment-base-bg rounded-full text-parchment-light-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <ReviewForm
                                onSubmit={async (data) => {
                                    try {
                                        await createReview(gameId, data.isPositive, data.content);
                                        success(t('form.success', '评价已发布'));
                                        refreshData();
                                        close();
                                    } catch (err: any) {
                                        error(err.message);
                                    }
                                }}
                                initialData={myReview ? { isPositive: myReview.isPositive, content: myReview.content } : undefined}
                            />
                        </div>
                    </div>
                </ModalBase>
            )
        });
    };

    const deleteMutation = useMutation({
        mutationFn: (gid: string) => deleteReview(gid),
        onSuccess: () => {
            refreshData();
            success(t('form.deleted', '评价已删除'));
        },
        onError: (err: Error) => {
            error(err.message);
        }
    });

    return (
        <div className="flex flex-col gap-3 h-full px-1">
            {/* Header with Stats and Mini Action */}
            <div className="bg-parchment-card-bg/50 p-3 rounded-sm border border-parchment-card-border/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-parchment-base-text uppercase tracking-widest opacity-80">{t('section.stats', '玩家评价')}</span>
                    {user && (
                        <button
                            onClick={handleOpenReviewModal}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-parchment-base-text text-parchment-card-bg text-[10px] font-bold rounded-sm hover:bg-parchment-brown transition-all active:scale-95 uppercase tracking-widest cursor-pointer shadow-sm"
                        >
                            {myReview ? (
                                <>
                                    <Edit2 size={11} />
                                    {t('form.edit', '修改评价')}
                                </>
                            ) : (
                                <>
                                    <Plus size={11} />
                                    {t('form.writeReview', '写评价')}
                                </>
                            )}
                        </button>
                    )}
                </div>

                {stats ? (
                    <div className="flex flex-col gap-1">
                        <ApprovalBar
                            total={stats.total}
                            rate={stats.rate}
                            positive={stats.positive}
                        />
                        <div className="flex justify-between items-center text-[9px] text-parchment-light-text/60 italic px-0.5">
                            <span>{stats.total > 0 ? t('section.ratingCount', { count: stats.total }) : t('section.noRatings', '暂无评分')}</span>
                        </div>
                    </div>
                ) : isStatsError ? (
                    <div className="text-[10px] text-parchment-light-text italic opacity-60">
                        {t('section.statsError', '暂时无法加载统计信息')}
                    </div>
                ) : (
                    <div className="h-1.5 w-full bg-parchment-base-bg/30 animate-pulse rounded-full" />
                )}
            </div>

            {!user && (
                <div className="text-center py-1 text-[10px] text-parchment-light-text italic opacity-50 font-serif">
                    {t('form.loginToReview')}
                </div>
            )}

            {/* Review List - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 mt-1">
                <ReviewListWrapper
                    gameId={gameId}
                    currentUserId={user?.id}
                    onDeleteReview={async (gid) => { await deleteMutation.mutateAsync(gid); }}
                />
            </div>
        </div>
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
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ['reviews', gameId],
        queryFn: ({ pageParam }) => fetchReviews(gameId, pageParam as number, 10),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    });

    const { t } = useTranslation(['review']);
    const reviews = useMemo(() => data?.pages.flatMap(p => p.items) || [], [data]);

    if (isError) {
        return (
            <div className="text-center py-10 text-parchment-light-text italic text-sm">
                {t('list.error', '加载评价失败，请稍后重试')}
            </div>
        );
    }

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
};
