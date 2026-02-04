import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    className?: string;
}

export default function DataTable<T extends { id: string | number }>({
    columns,
    data,
    loading,
    pagination,
    className
}: DataTableProps<T>) {
    return (
        <div className={cn("bg-white rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50 flex flex-col overflow-hidden", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn("px-6 py-4 font-semibold text-zinc-500 uppercase tracking-wider text-xs", col.className)}
                                    style={{ width: col.width }}
                                >
                                    <div className="flex items-center gap-1 group cursor-pointer hover:text-zinc-800 transition-colors">
                                        {col.header}
                                        {/* 排序占位 */}
                                        {/* <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" /> */}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {columns.map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-5 bg-zinc-100 rounded-md animate-pulse w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-20 text-center text-zinc-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-2">
                                            <span className="text-2xl font-sans text-zinc-300">∅</span>
                                        </div>
                                        <p>暂无数据</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="hover:bg-zinc-50/80 transition-colors group"
                                >
                                    {columns.map((col, idx) => (
                                        <td key={idx} className={cn("px-6 py-4 text-zinc-700 group-hover:text-zinc-900 transition-colors", col.className)}>
                                            {col.cell
                                                ? col.cell(item)
                                                : (item[col.accessorKey as keyof T] as ReactNode)}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/30">
                    <div className="text-xs font-medium text-zinc-400">
                        Total {pagination.totalItems || 0} items
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                            disabled={pagination.currentPage <= 1 || loading}
                            className="p-2 rounded-lg hover:bg-white hover:shadow-sm hover:border-zinc-200 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-500 hover:text-indigo-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm">
                            {pagination.currentPage} / {pagination.totalPages || 1}
                        </span>
                        <button
                            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                            disabled={pagination.currentPage >= pagination.totalPages || loading}
                            className="p-2 rounded-lg hover:bg-white hover:shadow-sm hover:border-zinc-200 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-500 hover:text-indigo-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
