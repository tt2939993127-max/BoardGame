import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ReviewFormProps {
    onSubmit: (data: { isPositive: boolean; content: string }) => Promise<void>;
    initialData?: {
        isPositive: boolean;
        content?: string;
    };
    isSubmitting?: boolean;
}

export const ReviewForm = ({ onSubmit, initialData, isSubmitting }: ReviewFormProps) => {
    const { t } = useTranslation(['review']);
    const [isPositive, setIsPositive] = useState<boolean | null>(initialData?.isPositive ?? null);
    const [content, setContent] = useState(initialData?.content || '');
    const [error, setError] = useState<string | null>(null);

    // Initial data might load later
    useEffect(() => {
        if (initialData) {
            setIsPositive(initialData.isPositive);
            setContent(initialData.content || '');
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (isPositive === null) {
            setError(t('errors.required'));
            return;
        }

        if (content.length > 500) {
            setError(t('errors.contentLength'));
            return;
        }

        try {
            await onSubmit({ isPositive, content });
        } catch (err) {
            // Error handling usually done by parent or toast
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#fcfbf9] border border-[#d3ccba] rounded p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#433422]">{t('form.label', '你的评价')}</label>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setIsPositive(true)}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded border transition-all duration-200",
                            isPositive === true
                                ? "bg-green-600 text-white border-green-700 shadow-sm"
                                : "bg-white text-[#433422] border-[#d3ccba] hover:border-green-500/50 hover:text-green-600"
                        )}
                    >
                        <ThumbsUp size={18} className={clsx(isPositive === true ? "fill-current" : "")} />
                        <span className="font-bold">{t('form.positive')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPositive(false)}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded border transition-all duration-200",
                            isPositive === false
                                ? "bg-orange-600 text-white border-orange-700 shadow-sm"
                                : "bg-white text-[#433422] border-[#d3ccba] hover:border-orange-500/50 hover:text-orange-600"
                        )}
                    >
                        <ThumbsDown size={18} className={clsx(isPositive === false ? "fill-current" : "")} />
                        <span className="font-bold">{t('form.negative')}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('form.placeholder')}
                    className="w-full min-h-[100px] p-3 rounded border border-[#d3ccba] bg-white text-[#433422] placeholder:text-[#433422]/30 focus:outline-none focus:border-[#433422] focus:ring-1 focus:ring-[#433422]/20 resize-y font-serif text-sm"
                    maxLength={500}
                />
                <div className="flex justify-between items-center text-xs text-[#433422]/50">
                    <span>{error && <span className="text-red-500">{error}</span>}</span>
                    <span className={clsx(content.length > 500 ? "text-red-500" : "")}>{content.length}/500</span>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || isPositive === null}
                    className="px-6 py-2.5 bg-[#433422] text-[#fcfbf9] font-bold rounded shadow-sm hover:bg-[#2c2216] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {initialData ? t('form.update') : t('form.submit')}
                </button>
            </div>
        </form>
    );
};
