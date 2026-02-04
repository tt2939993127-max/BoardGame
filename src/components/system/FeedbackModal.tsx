import { useRef, useState, useEffect } from 'react';
import { X, MessageSquareWarning, Send, Loader2, AlertTriangle, Lightbulb, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import { ADMIN_API_URL as API_URL } from '../../config/server';

interface FeedbackModalProps {
    onClose: () => void;
}

const FeedbackType = {
    BUG: 'bug',
    SUGGESTION: 'suggestion',
    OTHER: 'other'
} as const;

type FeedbackType = typeof FeedbackType[keyof typeof FeedbackType];

const FeedbackSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
} as const;

type FeedbackSeverity = typeof FeedbackSeverity[keyof typeof FeedbackSeverity];

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
    [FeedbackType.BUG]: '缺陷',
    [FeedbackType.SUGGESTION]: '建议',
    [FeedbackType.OTHER]: '其他',
};

const FEEDBACK_SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
    [FeedbackSeverity.LOW]: '低',
    [FeedbackSeverity.MEDIUM]: '中',
    [FeedbackSeverity.HIGH]: '高',
    [FeedbackSeverity.CRITICAL]: '严重',
};

export const FeedbackModal = ({ onClose }: FeedbackModalProps) => {
    // 预留国际化翻译函数（暂未使用）
    const { token } = useAuth();
    const { success, error } = useToast();
    const location = useLocation();
    const backdropRef = useRef<HTMLDivElement>(null);

    const [content, setContent] = useState('');
    const [type, setType] = useState<FeedbackType>(FeedbackType.BUG);
    const [severity, setSeverity] = useState<FeedbackSeverity>(FeedbackSeverity.LOW);
    const [gameName, setGameName] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // 自动从地址检测游戏名
        const path = location.pathname;
        if (path.startsWith('/play/')) {
            const parts = path.split('/');
            if (parts[2]) {
                setGameName(parts[2]);
            }
        }
    }, [location]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (backdropRef.current === e.target) {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (!token) {
            error('请先登录再提交反馈');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content,
                    type,
                    severity,
                    gameName: gameName || undefined,
                    contactInfo: contactInfo || undefined
                })
            });

            if (!res.ok) throw new Error('Failed to submit feedback');

            success('反馈已提交，感谢支持！');
            onClose();
        } catch (err) {
            console.error(err);
            error('提交失败，请稍后再试');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeIcon = (t: FeedbackType) => {
        switch (t) {
            case FeedbackType.BUG: return <AlertTriangle size={16} />;
            case FeedbackType.SUGGESTION: return <Lightbulb size={16} />;
            default: return <HelpCircle size={16} />;
        }
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <MessageSquareWarning size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">反馈</h2>
                            <p className="text-xs text-zinc-400">帮助我们改进体验</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    {/* 游戏选择 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">关联游戏（可选）</label>
                        <select
                            value={gameName}
                            onChange={(e) => setGameName(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors"
                        >
                            <option value="">-- 通用反馈 --</option>
                            <option value="dicethrone">骰子王座</option>
                            <option value="tictactoe">井字棋</option>
                            {/* 若可能，后续改为动态加载其他游戏 */}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 类型选择 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">类型</label>
                            <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-200">
                                {Object.values(FeedbackType).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all gap-1.5",
                                            type === t
                                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200"
                                                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50"
                                        )}
                                    >
                                        {getTypeIcon(t)}
                                        <span>{FEEDBACK_TYPE_LABELS[t]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 严重度选择 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">优先级</label>
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors"
                            >
                                {Object.values(FeedbackSeverity).map((s) => (
                                    <option key={s} value={s}>{FEEDBACK_SEVERITY_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 内容 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">描述</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className="block p-3 w-full text-sm text-zinc-900 bg-zinc-50 rounded-xl border border-zinc-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder="请描述问题或建议..."
                            required
                        ></textarea>
                    </div>

                    {/* 联系方式 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">联系方式（可选）</label>
                        <input
                            type="text"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                            placeholder="邮箱或 QQ（便于跟进）"
                        />
                    </div>

                    <div className="pt-4 border-t border-zinc-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !content.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            提交反馈
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
