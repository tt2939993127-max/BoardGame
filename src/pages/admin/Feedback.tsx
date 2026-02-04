import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircle, Circle, Clock, Contact, MoreVertical, AlertTriangle, Lightbulb, HelpCircle, Gamepad2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackItem {
    _id: string;
    userId: {
        _id: string;
        username: string;
        avatar?: string;
    };
    content: string;
    type: 'bug' | 'suggestion' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    gameName?: string;
    contactInfo?: string;
    createdAt: string;
}

export default function AdminFeedbackPage() {
    const { token } = useAuth();
    const { success, error } = useToast();
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('open');

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                limit: '50',
                status: statusFilter === 'all' ? '' : statusFilter
            });

            const res = await fetch(`${ADMIN_API_URL}/feedback/admin?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch feedbacks');
            const data = await res.json();
            setFeedbacks(data.items);
        } catch (err) {
            console.error(err);
            error('获取反馈列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, statusFilter]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`${ADMIN_API_URL}/feedback/admin/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update status');

            // 乐观更新或重新拉取
            setFeedbacks(prev => prev.map(f => f._id === id ? { ...f, status: newStatus as any } : f));
            success('状态已更新');
        } catch (err) {
            console.error(err);
            error('更新状态失败');
        }
    };

    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'bug': return <AlertTriangle size={14} className="text-red-500" />;
            case 'suggestion': return <Lightbulb size={14} className="text-yellow-500" />;
            default: return <HelpCircle size={14} className="text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">反馈管理</h1>
                    <p className="text-sm text-zinc-500 mt-1">查看并处理用户反馈与建议</p>
                </div>

                <div className="flex bg-zinc-100 p-1 rounded-xl">
                    {['open', 'in_progress', 'resolved', 'all'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                                statusFilter === status
                                    ? "bg-white text-zinc-900 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-700"
                            )}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Clock className="animate-spin text-zinc-300" size={32} />
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20 bg-white rounded-2xl border border-dashed border-zinc-200"
                        >
                            <p className="text-zinc-400">暂无相关反馈</p>
                        </motion.div>
                    ) : (
                        feedbacks.map((item) => (
                            <motion.div
                                key={item._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* 状态切换按钮（仿勾选交互） */}
                                    <button
                                        onClick={() => handleStatusUpdate(item._id, item.status === 'resolved' ? 'open' : 'resolved')}
                                        className={cn(
                                            "mt-1 p-1 rounded-full border transition-colors shrink-0",
                                            item.status === 'resolved'
                                                ? "bg-green-100 border-green-200 text-green-600"
                                                : "bg-zinc-50 border-zinc-200 text-zinc-300 hover:border-indigo-300 hover:text-indigo-300"
                                        )}
                                        title={item.status === 'resolved' ? "Reopen" : "Mark as Resolved"}
                                    >
                                        {item.status === 'resolved' ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={cn("px-2 py-0.5 text-xs font-bold rounded capitalize border", getSeverityColor(item.severity))}>
                                                {item.severity}
                                            </span>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-xs font-medium text-zinc-600 capitalize">
                                                {getTypeIcon(item.type)}
                                                {item.type}
                                            </div>
                                            {item.gameName && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-xs font-medium text-zinc-600">
                                                    <Gamepad2 size={12} />
                                                    {item.gameName}
                                                </div>
                                            )}
                                            <span className="ml-auto text-xs text-zinc-400 font-mono">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-zinc-800 text-base leading-relaxed whitespace-pre-wrap">
                                            {item.content}
                                        </p>

                                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400 overflow-hidden">
                                                    {item.userId.avatar ? (
                                                        <img src={item.userId.avatar} alt={item.userId.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.userId.username?.[0]?.toUpperCase()
                                                    )}
                                                </div>
                                                <span className="text-sm text-zinc-500">{item.userId.username}</span>
                                                {item.contactInfo && (
                                                    <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded">
                                                        <Contact size={12} />
                                                        {item.contactInfo}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 快捷操作 */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.status !== 'in_progress' && item.status !== 'resolved' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(item._id, 'in_progress')}
                                                        className="text-xs font-medium text-zinc-500 hover:text-indigo-600 px-2 py-1 hover:bg-indigo-50 rounded"
                                                    >
                                                        处理中
                                                    </button>
                                                )}
                                                <button className="p-1 rounded hover:bg-zinc-100 text-zinc-400">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
