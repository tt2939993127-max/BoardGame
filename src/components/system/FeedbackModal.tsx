import { useRef, useState, useEffect } from 'react';
import { X, MessageSquareWarning, Send, Loader2, AlertTriangle, Lightbulb, HelpCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import { FEEDBACK_API_URL as API_URL } from '../../config/server';

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
    [FeedbackType.BUG]: 'Bug',
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
    const [pastedImage, setPastedImage] = useState<string | null>(null);

    useEffect(() => {
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

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    compressImage(blob).then((dataUrl) => {
                        setPastedImage(dataUrl);
                    });
                }
                return;
            }
        }
    };

    const clearImage = () => setPastedImage(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !pastedImage) return;
        if (!token) {
            error('请先登录再提交反馈');
            return;
        }

        setSubmitting(true);
        try {
            // Append image to content as Markdown if present
            let finalContent = content;
            if (pastedImage) {
                finalContent += `\n\n![Screenshot](${pastedImage})`;
            }

            const res = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: finalContent,
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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-serif"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-parchment-base-bg rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-2 border-parchment-brown/30"
            >
                {/* Header */}
                <div className="bg-parchment-brown px-6 py-4 flex items-center justify-between shrink-0 border-b border-parchment-gold/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-parchment-gold/20 rounded-lg text-parchment-cream">
                            <MessageSquareWarning size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-parchment-cream tracking-wide">反馈</h2>
                            <p className="text-xs text-parchment-cream/70">帮助我们改进体验</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-parchment-cream/60 hover:text-parchment-cream hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
                    {/* Game Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-parchment-light-text uppercase tracking-wider">关联游戏（可选）</label>
                        <select
                            value={gameName}
                            onChange={(e) => setGameName(e.target.value)}
                            className="w-full bg-parchment-card-bg border border-parchment-brown/20 text-parchment-base-text text-sm rounded-lg focus:ring-parchment-gold focus:border-parchment-gold block p-2.5 transition-colors outline-none"
                        >
                            <option value="">-- 通用反馈 --</option>
                            <option value="dicethrone">骰子王座</option>
                            <option value="tictactoe">井字棋</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Type Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-parchment-light-text uppercase tracking-wider">类型</label>
                            <div className="flex bg-parchment-card-bg p-1 rounded-lg border border-parchment-brown/20">
                                {Object.values(FeedbackType).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center py-2 rounded-md text-xs font-bold transition-all gap-1.5",
                                            type === t
                                                ? "bg-parchment-brown text-parchment-cream shadow-sm"
                                                : "text-parchment-light-text hover:text-parchment-base-text hover:bg-parchment-brown/10"
                                        )}
                                    >
                                        {getTypeIcon(t)}
                                        <span>{FEEDBACK_TYPE_LABELS[t]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Severity Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-parchment-light-text uppercase tracking-wider">优先级</label>
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                                className="w-full bg-parchment-card-bg border border-parchment-brown/20 text-parchment-base-text text-sm rounded-lg focus:ring-parchment-gold focus:border-parchment-gold block p-2.5 transition-colors outline-none"
                            >
                                {Object.values(FeedbackSeverity).map((s) => (
                                    <option key={s} value={s}>{FEEDBACK_SEVERITY_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-parchment-light-text uppercase tracking-wider">描述</label>
                        <div className="relative">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onPaste={handlePaste}
                                rows={6}
                                className="block p-3 w-full text-sm text-parchment-base-text bg-parchment-card-bg rounded-lg border border-parchment-brown/20 focus:ring-parchment-gold focus:border-parchment-gold resize-none outline-none placeholder:text-parchment-light-text/50"
                                placeholder={`请描述问题或建议...\n支持粘贴截图 (Ctrl+V)`}
                                required={!pastedImage}
                            ></textarea>
                            {/* Paste Hint */}
                            {!pastedImage && !content && (
                                <div className="absolute bottom-3 right-3 text-[10px] text-parchment-light-text/60 pointer-events-none flex items-center gap-1">
                                    <ImageIcon size={12} />
                                    <span>支持截图粘贴</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Image Preview */}
                    <AnimatePresence>
                        {pastedImage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative group rounded-lg overflow-hidden border border-parchment-brown/20 bg-parchment-card-bg"
                            >
                                <img src={pastedImage} alt="Pasted" className="w-full h-auto max-h-48 object-contain bg-black/5" />
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                    title="删除图片"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">
                                    已添加截图
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Contact Info */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-parchment-light-text uppercase tracking-wider">联系方式（可选）</label>
                        <input
                            type="text"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            className="bg-parchment-card-bg border border-parchment-brown/20 text-parchment-base-text text-sm rounded-lg focus:ring-parchment-gold focus:border-parchment-gold block w-full p-2.5 outline-none placeholder:text-parchment-light-text/50"
                            placeholder="邮箱或 QQ（便于跟进）"
                        />
                    </div>

                    <div className="pt-4 border-t border-parchment-brown/10 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || (!content.trim() && !pastedImage)}
                            className="flex items-center gap-2 px-6 py-2 bg-parchment-brown hover:bg-parchment-brown/90 text-parchment-cream rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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


// ── 图片压缩工具 ──

/** 最大 base64 大小约 500KB（压缩后） */
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 960;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;

            // 等比缩放
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas 不可用')); return; }
            ctx.drawImage(img, 0, 0, width, height);

            // 输出为 JPEG（体积远小于 PNG base64）
            const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
            resolve(dataUrl);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('图片加载失败'));
        };
        img.src = url;
    });
}
