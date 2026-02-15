import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { fetchAuditLog, AuditLogEntry } from '../../services/data';

export const AuditViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);

    useEffect(() => {
        loadLogs();
    }, [limit]);

    const loadLogs = async () => {
        setLoading(true);
        const data = await fetchAuditLog(limit);
        setLogs(data);
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const actionColors: Record<string, string> = {
        'UPDATE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'INSERT': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const getStatusChange = (log: AuditLogEntry): string | null => {
        const oldStatus = log.oldData?.status;
        const newStatus = log.newData?.status;
        if (oldStatus && newStatus && oldStatus !== newStatus) {
            return `${oldStatus} → ${newStatus}`;
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Track all order status changes and database modifications
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        aria-label="Number of log entries to show"
                    >
                        <option value={25}>Last 25</option>
                        <option value={50}>Last 50</option>
                        <option value={100}>Last 100</option>
                        <option value={200}>Last 200</option>
                    </select>
                    <button
                        onClick={loadLogs}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        aria-label="Refresh audit log"
                    >
                        <Icon name="refresh" className="text-lg mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="size-8 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                        <Icon name="history" className="text-4xl text-slate-300 dark:text-slate-600 mb-3 block mx-auto" />
                        <p className="font-medium">No audit logs yet</p>
                        <p className="text-xs mt-1">Status changes on orders will appear here automatically</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-light dark:divide-border-dark">
                        {logs.map((log) => {
                            const statusChange = getStatusChange(log);
                            return (
                                <div
                                    key={log.id}
                                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-0.5">
                                            <div className={`size-8 rounded-full flex items-center justify-center ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                                                <Icon
                                                    name={log.action === 'UPDATE' ? 'edit' : log.action === 'INSERT' ? 'add' : 'delete'}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${actionColors[log.action] || 'bg-gray-100'}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {log.tableName}
                                                </span>
                                                <span className="font-mono text-xs text-slate-400">
                                                    #{log.recordId.slice(-8)}
                                                </span>
                                            </div>

                                            {statusChange && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Icon name="swap_horiz" className="text-sm text-slate-400" />
                                                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                        {statusChange}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                                                <span>{formatDate(log.createdAt)}</span>
                                                {log.changedBy && (
                                                    <span className="font-mono">by {log.changedBy.slice(-8)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Load More */}
            {logs.length >= limit && (
                <div className="text-center">
                    <button
                        onClick={() => setLimit(prev => prev + 50)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        Load more entries...
                    </button>
                </div>
            )}
        </div>
    );
};
