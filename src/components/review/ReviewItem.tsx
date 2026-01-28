import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import type { Review } from '../../api/review';

interface ReviewItemProps {
    review: Review;
    isMine?: boolean;
    onDelete?: () => void;
}

export const ReviewItem = ({ review, isMine, onDelete }: ReviewItemProps) => {
    const { t, i18n } = useTranslation(['review']);

    const formatDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat(i18n.language, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(new Date(dateString));
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="bg-parchment-card-bg border border-parchment-card-border/20 rounded-sm p-3 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    {/* Avatar - Only show if image exists */}
                    {review.user?.avatar && (
                        <div className="w-8 h-8 rounded-full bg-parchment-base-bg flex items-center justify-center overflow-hidden border border-parchment-card-border/30 shrink-0">
                            <img src={review.user.avatar} alt={review.user.username} className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className="flex flex-col">
                        <span className="font-bold text-parchment-base-text text-sm leading-tight">
                            {review.user?.username || t('common.unknownUser', '未知用户')}
                        </span>
                        <span className="text-[10px] text-parchment-base-text/40 uppercase tracking-wide">
                            {formatDate(review.createdAt)}
                        </span>
                    </div>
                </div>

                {isMine && onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-1 text-parchment-base-text/30 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title={t('form.delete')}
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            <div className="flex items-start gap-3 pl-1">
                <div className="mt-0.5 shrink-0" title={review.isPositive ? t('form.positive') : t('form.negative')}>
                    {review.isPositive ? (
                        <ThumbsUp size={16} className="text-green-600/80 fill-green-600/10" />
                    ) : (
                        <ThumbsDown size={16} className="text-orange-500/80 fill-orange-500/10" />
                    )}
                </div>
                {review.content && (
                    <div className="text-sm text-parchment-base-text selection:bg-parchment-brown/20 leading-relaxed break-words whitespace-pre-wrap font-serif">
                        {review.content}
                    </div>
                )}
            </div>
        </div>
    );
};
