import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../ui/Icon';
import { getDbUsage, cleanupOldOrders, snapshotDailyStats, DbUsage } from '../../services/data';

interface CleanupResult {
    success: boolean;
    ordersDeleted?: number;
    freedMbApprox?: number;
    error?: any;
}

export const StoragePanel: React.FC = () => {
    const [usage, setUsage] = useState<DbUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<string | null>(null);

    const loadUsage = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDbUsage();
            setUsage(data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsage();
    }, [loadUsage]);

    const handleSnapshot = async () => {
        setActionLoading('snapshot');
        setLastResult(null);
        try {
            const res = await snapshotDailyStats();
            setLastResult(
                res.success
                    ? `Snapshot complete — ${res.rowsUpserted || 0} day(s) synced`
                    : `Snapshot failed: ${res.error?.message || 'Unknown error'}`
            );
        } catch {
            setLastResult('Snapshot failed unexpectedly');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCleanup = async (keepDays: number, label: string) => {
        setActionLoading(label);
        setLastResult(null);
        try {
            const res: any = await cleanupOldOrders(keepDays, true);
            if (res.success) {
                setLastResult(
                    `Cleaned ${res.ordersDeleted || 0} orders older than ${keepDays} day(s) — freed ~${(res.freedMbApprox || 0).toFixed(1)} MB`
                );
                loadUsage();
            } else {
                const reason = res.reason || res.error?.message || 'RPC function not found — run the migration SQL first';
                setLastResult(`Cleanup: ${reason}`);
            }
        } catch {
            setLastResult('Cleanup failed — run the migration SQL to create the cleanup function');
        } finally {
            setActionLoading(null);
        }
    };

    const usagePercent = usage?.percent_used ?? 0;
    const barColor =
        usagePercent >= 90 ? 'bg-red-500' :
        usagePercent >= 70 ? 'bg-amber-500' :
        'bg-emerald-500';

    const statusColor =
        usagePercent >= 90 ? 'text-red-600 dark:text-red-400' :
        usagePercent >= 70 ? 'text-amber-600 dark:text-amber-400' :
        'text-emerald-600 dark:text-emerald-400';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Storage & Database</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Monitor database usage and manage data cleanup
                </p>
            </div>

            {/* DB Usage Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Icon name="database" className="text-blue-600 dark:text-blue-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Database Usage</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Supabase free tier — 500 MB limit</p>
                    </div>
                    <button
                        onClick={loadUsage}
                        disabled={loading}
                        className="ml-auto p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <Icon name="refresh" className={`text-slate-500 text-xl ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loading && !usage ? (
                    <div className="h-24 flex items-center justify-center text-slate-400">
                        <Icon name="hourglass_empty" className="text-2xl animate-pulse mr-2" />
                        Loading usage data...
                    </div>
                ) : usage ? (
                    <div className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {usage.used_mb.toFixed(1)}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 ml-1">
                                    / {usage.limit_mb} MB
                                </span>
                            </div>
                            <span className={`text-lg font-bold ${statusColor}`}>
                                {usagePercent.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {usagePercent >= 90
                                ? '⚠️ Critical — consider running cleanup immediately'
                                : usagePercent >= 70
                                ? '⚡ Getting full — plan a cleanup soon'
                                : '✅ Healthy storage levels'}
                        </p>
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
                        <Icon name="info" className="mr-2" />
                        Run the migration SQL to enable DB usage tracking
                    </div>
                )}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Snapshot Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Icon name="backup" className="text-violet-600 dark:text-violet-400 text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Snapshot Stats</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Persist today's analytics</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Saves today's order data into DailyStats so analytics survive even after old orders are cleaned up.
                    </p>
                    <button
                        onClick={handleSnapshot}
                        disabled={actionLoading !== null}
                        className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {actionLoading === 'snapshot' ? (
                            <Icon name="hourglass_empty" className="animate-spin" />
                        ) : (
                            <Icon name="backup" />
                        )}
                        Snapshot Daily Stats
                    </button>
                </div>

                {/* Cleanup Cards */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Icon name="auto_delete" className="text-amber-600 dark:text-amber-400 text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Cleanup Orders</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Free up database space</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Delete completed orders older than the selected threshold. Snapshot first to preserve analytics.
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={() => handleCleanup(90, 'clean90')}
                            disabled={actionLoading !== null}
                            className="w-full py-2 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {actionLoading === 'clean90' && <Icon name="hourglass_empty" className="animate-spin text-sm" />}
                            Clean 90+ days
                        </button>
                        <button
                            onClick={() => handleCleanup(30, 'clean30')}
                            disabled={actionLoading !== null}
                            className="w-full py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {actionLoading === 'clean30' && <Icon name="hourglass_empty" className="animate-spin text-sm" />}
                            Clean 30+ days
                        </button>
                        <button
                            onClick={() => handleCleanup(7, 'clean7')}
                            disabled={actionLoading !== null}
                            className="w-full py-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {actionLoading === 'clean7' && <Icon name="hourglass_empty" className="animate-spin text-sm" />}
                            ⚠️ Emergency — Clean 7+ days
                        </button>
                    </div>
                </div>
            </div>

            {/* Result Banner */}
            {lastResult && (
                <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                    lastResult.includes('failed')
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                    <Icon name={lastResult.includes('failed') ? 'error' : 'check_circle'} />
                    {lastResult}
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                    <Icon name="info" className="text-blue-600 dark:text-blue-400 text-xl mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-semibold">How auto-cleanup works</p>
                        <p>When the database reaches ~90% capacity, the system automatically archives completed orders older than 30 days on each dashboard load. Snapshot your stats regularly to preserve analytics history.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
