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
        <div className="bg-[#fcfbf9] border border-[#d3ccba]/50 rounded p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#f3f0e6] flex items-center justify-center overflow-hidden border border-[#d3ccba]">
                        {review.user.avatar ? (
                            <img src={review.user.avatar} alt={review.user.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-[#433422]/50">
                                {review.user.username.slice(0, 2).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className="font-bold text-[#433422] text-sm leading-tight">
                            {review.user.username}
                        </span>
                        <span className="text-[10px] text-[#433422]/50 uppercase tracking-wide">
                            {formatDate(review.createdAt)}
                        </span>
                    </div>
                </div>

                {isMine && onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-[#433422]/40 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title={t('form.delete')}
                    >
                        <Trash2 size={14} />
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
                    <div className="text-sm text-[#433422]/90 leading-relaxed break-words whitespace-pre-wrap font-serif">
                        {review.content}
                    </div>
                )}
            </div>
        </div>
    );
};
