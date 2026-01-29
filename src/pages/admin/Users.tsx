import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from './components/DataTable';
import { ADMIN_API_URL } from '../../config/server';
import { useToast } from '../../contexts/ToastContext';
import { Search, Ban, CheckCircle, Eye } from 'lucide-react';
import { cn } from '../../lib/utils'; // Fixed import path

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
    }, [page, token]); // Search triggers separate fetch usually or debounced, here simplifying

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
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-bold text-slate-500">{user.username[0]?.toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{user.username}</div>
                        <div className="text-xs text-slate-500">{user.email || 'No email'}</div>
                    </div>
                </div>
            )
        },
        {
            header: '角色',
            accessorKey: 'role',
            cell: (user) => (
                <span className={cn(
                    "px-2 py-1 text-xs rounded-full font-medium",
                    user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                )}>
                    {user.role}
                </span>
            )
        },
        {
            header: '状态',
            accessorKey: 'banned',
            cell: (user) => (
                <span className={cn(
                    "px-2 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1",
                    user.banned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                )}>
                    {user.banned ? <Ban size={12} /> : <CheckCircle size={12} />}
                    {user.banned ? '已封禁' : '正常'}
                </span>
            )
        },
        {
            header: '注册时间',
            accessorKey: 'createdAt',
            cell: (user) => new Date(user.createdAt).toLocaleDateString()
        },
        {
            header: '操作',
            cell: (user) => (
                <div className="flex items-center gap-2">
                    <Link
                        to={`/admin/users/${user.id}`}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="查看详情"
                    >
                        <Eye size={18} />
                    </Link>
                    <button
                        onClick={() => handleBanToggle(user)}
                        className={cn(
                            "p-1 transition-colors",
                            user.banned ? "text-green-600 hover:bg-green-50" : "text-red-400 hover:text-red-600"
                        )}
                        title={user.banned ? "解封" : "封禁"}
                    >
                        {user.banned ? <CheckCircle size={18} /> : <Ban size={18} />}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="搜索用户..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
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
