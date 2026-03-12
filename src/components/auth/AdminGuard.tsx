import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';

type AdminGuardProps = {
    children: ReactNode;
    allowedRoles?: UserRole[];
    fallbackPath?: string;
};

export default function AdminGuard({
    children,
    allowedRoles = ['admin'],
    fallbackPath = '/',
}: AdminGuardProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to={fallbackPath} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
