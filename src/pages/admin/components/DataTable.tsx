import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => ReactNode;
    width?: string;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
        totalItems?: number;
    };
    className?: string; // Add className
}

export default function DataTable<T extends { id: string | number }>({
    columns,
    data,
    loading,
    pagination,
    className
}: DataTableProps<T>) {
    return (
        <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn("px-6 py-4 font-medium", col.className)}
                                    style={{ width: col.width }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {columns.map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                                    暂无数据
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    {columns.map((col, idx) => (
                                        <td key={idx} className={cn("px-6 py-4 text-slate-700", col.className)}>
                                            {col.cell
                                                ? col.cell(item)
                                                : (item[col.accessorKey as keyof T] as ReactNode)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        共 {pagination.totalItems || 0} 条
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                            disabled={pagination.currentPage <= 1 || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-medium text-slate-700">
                            Page {pagination.currentPage} of {pagination.totalPages || 1}
                        </span>
                        <button
                            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                            disabled={pagination.currentPage >= pagination.totalPages || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
