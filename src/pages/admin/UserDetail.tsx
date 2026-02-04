import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Mail, Calendar, Hash, Ban, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
// import DataTable from './components/DataTable'; // 如需在此显示对局历史

interface UserDetail {
    id: string;
    username: string;
    email?: string;
    role: string;
    banned: boolean;
    bannedReason?: string;
    bannedAt?: string;
    createdAt: string;
    lastOnline?: string;
    avatar?: string;
    // matches: Match[]; // 如果 API 返回 matches 列表
}

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { error: toastError } = useToast();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${ADMIN_API_URL}/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch user');
                const data = await res.json();
                setUser(data);
            } catch (err) {
                console.error(err);
                toastError('获取详情失败');
                navigate('/admin/users');
            } finally {
                setLoading(false);
            }
        };

        if (token && id) fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, token]);

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin text-zinc-400">Loading...</div>
        </div>
    );
    if (!user) return null;

    return (
        <div className="space-y-8 max-w-[1000px] mx-auto">
            <button
                onClick={() => navigate('/admin/users')}
                className="group flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
                <div className="p-1 rounded-lg group-hover:bg-zinc-100 transition-colors mr-2">
                    <ArrowLeft size={16} />
                </div>
                返回用户列表
            </button>

            <div className="bg-white rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50 overflow-hidden">
                <div className="relative h-32 bg-zinc-900">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50" />
                </div>

                <div className="px-8 pb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg ring-1 ring-zinc-100">
                            <div className="w-full h-full rounded-xl bg-zinc-100 flex items-center justify-center overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-zinc-400">{user.username[0]?.toUpperCase()}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 mb-2">
                            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{user.username}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                    user.role === 'admin'
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                        : "bg-zinc-50 text-zinc-600 border-zinc-100"
                                )}>
                                    {user.role === 'admin' ? '系统管理员' : '普通用户'}
                                </span>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
                                    user.banned
                                        ? "bg-red-50 text-red-700 border-red-100"
                                        : "bg-green-50 text-green-700 border-green-100"
                                )}>
                                    {user.banned ? <Ban size={10} /> : <CheckCircle size={10} />}
                                    {user.banned ? '已封禁' : '状态正常'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                            {/* 预留操作按钮区域 */}
                            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                                发送消息
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-zinc-100">
                        <div className="col-span-2 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">基本信息</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-500"><Hash size={16} /></div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase">User ID</span>
                                        </div>
                                        <p className="font-mono text-sm text-zinc-700 ml-11">{user.id}</p>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-500"><Mail size={16} /></div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase">Email</span>
                                        </div>
                                        <p className="font-medium text-sm text-zinc-700 ml-11">{user.email || '未绑定邮箱'}</p>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-500"><Calendar size={16} /></div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase">Joined</span>
                                        </div>
                                        <p className="font-medium text-sm text-zinc-700 ml-11">{new Date(user.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-zinc-500"><Clock size={16} /></div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase">Last Online</span>
                                        </div>
                                        <p className="font-medium text-sm text-zinc-700 ml-11">
                                            {user.lastOnline ? new Date(user.lastOnline).toLocaleString() : 'Never'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {user.banned && (
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <div className="flex items-center gap-2 text-red-800 font-bold mb-3">
                                        <Ban size={18} />
                                        <h3>封禁详情</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs font-semibold text-red-400 uppercase block mb-1">原因</span>
                                            <p className="text-sm font-medium text-red-700 bg-white/50 p-2 rounded-lg border border-red-100/50">
                                                {user.bannedReason || '未说明原因'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-red-400 uppercase block mb-1">操作时间</span>
                                            <p className="text-sm text-red-700">
                                                {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 统计信息占位 */}
                            <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl">
                                <h3 className="text-sm font-bold opacity-80 mb-4">游戏数据</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-zinc-400">总胜率</span>
                                        <span className="font-bold text-xl text-emerald-400">55%</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[55%]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <span className="text-xs text-zinc-500 block">胜场</span>
                                            <span className="font-bold">128</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-zinc-500 block">胜率排名</span>
                                            <span className="font-bold">#42</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
