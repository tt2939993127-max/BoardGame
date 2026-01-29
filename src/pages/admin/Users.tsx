import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Search, Ban, CheckCircle, Eye, Shield, ShieldAlert, BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/utils';


interface User {
    id: string;
    username: string;
    email?: string;
    role: 'user' | 'admin';
    banned: boolean;
    lastOnline?: string;
    createdAt: string;
    avatar?: string;
}

export default function UsersPage() {
    const { token } = useAuth();
    const { success, error } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search
            });
            const res = await fetch(`${ADMIN_API_URL}/users?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.items);
            setTotalPages(Math.ceil(data.total / data.limit));
            setTotalItems(data.total);
        } catch (err) {
            console.error(err);
            error('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, token]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleBanToggle = async (user: User) => {
        if (!confirm(`确定要${user.banned ? '解封' : '封禁'}该用户吗？`)) return;

        try {
            const action = user.banned ? 'unban' : 'ban';
            const res = await fetch(`${ADMIN_API_URL}/users/${user.id}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Action failed');

            success('操作成功');
            fetchUsers();
        } catch (err) {
            console.error(err);
            error('操作失败');
        }
    };

    const columns: Column<User>[] = [
        {
            header: '用户',
            cell: (user) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-zinc-400">{user.username[0]?.toUpperCase()}</span>
                        )}
                        <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", user.lastOnline ? "bg-green-500" : "bg-zinc-300")} title={user.lastOnline ? "在线" : "离线"} />
                    </div>
                    <div>
                        <div className="font-semibold text-zinc-900">{user.username}</div>
                        <div className="text-xs text-zinc-500 font-mono">{user.email || '未绑定邮箱'}</div>
                    </div>
                </div>
            )
        },
        {
            header: '角色',
            accessorKey: 'role',
            cell: (user) => (
                <div className="flex items-center">
                    {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            <Shield size={12} fill="currentColor" className="opacity-80" />
                            管理员
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            用户
                        </span>
                    )}
                </div>
            )
        },
        {
            header: '状态',
            accessorKey: 'banned',
            cell: (user) => (
                <span className={cn(
                    "px-2.5 py-1 text-xs rounded-full font-semibold inline-flex items-center gap-1.5 border",
                    user.banned
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-green-50 text-green-700 border-green-200"
                )}>
                    {user.banned ? <ShieldAlert size={12} /> : <BadgeCheck size={12} />}
                    {user.banned ? '已封禁' : '正常'}
                </span>
            )
        },
        {
            header: '注册时间',
            accessorKey: 'createdAt',
            cell: (user) => <span className="text-zinc-500 font-medium text-xs font-mono">{new Date(user.createdAt).toLocaleDateString()}</span>
        },
        {
            header: '操作',
            className: 'text-right',
            cell: (user) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        to={`/admin/users/${user.id}`}
                        className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                        title="查看详情"
                    >
                        <Eye size={16} />
                    </Link>
                    <button
                        onClick={() => handleBanToggle(user)}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors border border-transparent",
                            user.banned
                                ? "text-green-600 hover:bg-green-50 hover:border-green-100"
                                : "text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                        )}
                        title={user.banned ? "解封" : "封禁"}
                    >
                        {user.banned ? <CheckCircle size={16} /> : <Ban size={16} />}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">用户管理</h1>
                    <p className="text-sm text-zinc-500 mt-1">管理平台用户及其权限状态</p>
                </div>
                <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="搜索用户名或邮箱..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-80 shadow-sm transition-all text-sm"
                    />
                </form>
            </div>

            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                pagination={{
                    currentPage: page,
                    totalPages,
                    onPageChange: setPage,
                    totalItems
                }}
            />
        </div>
    );
}
