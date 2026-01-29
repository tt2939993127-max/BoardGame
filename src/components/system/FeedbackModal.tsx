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

export const FeedbackModal = ({ onClose }: FeedbackModalProps) => {
    // const { t } = useTranslation('common'); // Unused for now
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
        // Auto-detect game from URL
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
            error('Please login to submit feedback');
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

            success('Feedback submitted successfully. Thank you!');
            onClose();
        } catch (err) {
            console.error(err);
            error('Failed to submit feedback');
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
                            <h2 className="text-lg font-bold text-white tracking-wide">Feedback</h2>
                            <p className="text-xs text-zinc-400">Help us improve your experience</p>
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
                    {/* Game Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Related Game (Optional)</label>
                        <select
                            value={gameName}
                            onChange={(e) => setGameName(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors"
                        >
                            <option value="">-- General Feedback --</option>
                            <option value="dicethrone">Dice Throne</option>
                            <option value="tictactoe">Tic Tac Toe</option>
                            {/* Add other games dynamically if possible */}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Type Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</label>
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
                                        <span className="capitalize">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Severity Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors capitalize"
                            >
                                {Object.values(FeedbackSeverity).map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className="block p-3 w-full text-sm text-zinc-900 bg-zinc-50 rounded-xl border border-zinc-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder="Describe the issue or suggestion..."
                            required
                        ></textarea>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact (Optional)</label>
                        <input
                            type="text"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                            placeholder="Email or QQ for follow-up"
                        />
                    </div>

                    <div className="pt-4 border-t border-zinc-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !content.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Submit Feedback
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
