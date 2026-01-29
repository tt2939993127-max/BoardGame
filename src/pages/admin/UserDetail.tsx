import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Mail, Calendar, Hash, Ban, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
// import DataTable from './components/DataTable'; // If we want match history here

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
    // matches: Match[]; // If API returns matches
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

    if (loading) return <div className="p-8">Loading...</div>;
    if (!user) return null;

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
            >
                <ArrowLeft size={20} className="mr-2" />
                返回用户列表
            </button>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-2xl font-bold text-slate-500">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <span>{user.username[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{user.username}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium",
                                    user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                                )}>
                                    {user.role}
                                </span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                                    user.banned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                )}>
                                    {user.banned ? <Ban size={10} /> : <CheckCircle size={10} />}
                                    {user.banned ? '已封禁' : '状态正常'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">基本信息</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Hash size={18} />
                                <span className="font-mono text-sm">{user.id}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Mail size={18} />
                                <span>{user.email || '未绑定邮箱'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Calendar size={18} />
                                <span>注册于 {new Date(user.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {user.banned && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <h3 className="text-red-800 font-semibold mb-2">封禁详情</h3>
                            <p className="text-sm text-red-600">
                                <span className="font-medium">原因:</span> {user.bannedReason || '未说明'}
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                <span className="font-medium">时间:</span> {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : '-'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Placeholder for match history if needed */}
            {/*
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">对局历史</h2>
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    功能开发中...
                </div>
            </div>
            */}
        </div>
    );
}
