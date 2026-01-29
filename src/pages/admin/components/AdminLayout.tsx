import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { LayoutDashboard, Users, Gamepad2, LogOut } from 'lucide-react';
import { cn } from '../../../lib/utils'; // Assuming cn utility is available, found in most shadcn/ui projects or I'll implement a simple one or confirm.

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: '概览', path: '/admin' },
        { icon: Users, label: '用户管理', path: '/admin/users' },
        { icon: Gamepad2, label: '对局记录', path: '/admin/matches' },
    ];

    const isActive = (path: string) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-blue-400">ADMIN</span>
                        <span>PANEL</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive(item.path)
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 mb-4 px-4">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.username}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email || 'Admin'}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        退出登录
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {navItems.find(i => isActive(i.path))?.label || 'Dashboard'}
                    </h2>
                    <Link to="/" className="text-sm text-slate-500 hover:text-blue-600">
                        返回主站 &rarr;
                    </Link>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

// Simple fallback for cn if it doesn't exist
// I should verify if lib/utils exists.
