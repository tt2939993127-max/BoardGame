import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { Review } from '../../api/review';
import { ReviewItem } from './ReviewItem';

interface ReviewListProps {
    reviews: Review[];
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    currentUserId?: string;
    onDeleteReview: (gameId: string) => Promise<void>;
}

export const ReviewList = ({
    reviews,
    loading,
    hasMore,
    onLoadMore,
    currentUserId,
    onDeleteReview
}: ReviewListProps) => {
    const { t } = useTranslation(['review']);

    if (loading && reviews.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#433422]/50" size={24} />
            </div>
        );
    }

    if (!loading && reviews.length === 0) {
        return (
            <div className="text-center py-12 text-[#433422]/40 italic font-serif">
                {t('list.empty')}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                    <ReviewItem
                        key={review.user._id + review.gameId} // Assuming one review per user per game, but careful with keys.
                        review={review}
                        isMine={currentUserId === review.user._id}
                        onDelete={() => onDeleteReview(review.gameId)}
                    />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={onLoadMore}
                        disabled={loading}
                        className="px-6 py-2 bg-[#433422]/5 hover:bg-[#433422]/10 text-[#433422] text-sm font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={14} />}
                        {t('list.loadMore')}
                    </button>
                </div>
            )}
        </div>
    );
};
