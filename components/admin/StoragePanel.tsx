import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../ui/Icon';
import { getDbUsage, DbUsage } from '../../services/data';

export const StoragePanel: React.FC = () => {
    const [usage, setUsage] = useState<DbUsage | null>(null);
    const [loading, setLoading] = useState(true);

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

    const usagePercent = usage?.percent_used ?? 0;
    const barColor =
        usagePercent >= 90 ? 'bg-red-900/20' :
            usagePercent >= 70 ? 'bg-amber-900/200' :
                'bg-emerald-900/200';

    const statusColor =
        usagePercent >= 90 ? 'text-red-500 ' :
            usagePercent >= 70 ? 'text-amber-400 ' :
                'text-emerald-400';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white ">Storage & Database</h2>
                <p className="text-[#666] text-sm mt-1">
                    Monitor database usage limits
                </p>
            </div>

            {/* DB Usage Card */}
            <div className="bg-[#0A0A0A] border border-[#333] p-6 max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 bg-red-900/20 flex items-center justify-center">
                        <Icon name="database" className="text-red-500 text-xl" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white ">Database Usage</h3>
                        <p className="text-sm text-[#666] ">Supabase free tier — 500 MB limit</p>
                    </div>
                    <button
                        onClick={loadUsage}
                        disabled={loading}
                        className="ml-auto p-2 hover:bg-[#111] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <Icon name="refresh" className={`text-[#666] text-xl ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loading && !usage ? (
                    <div className="h-24 flex items-center justify-center text-[#666]">
                        <Icon name="hourglass_empty" className="text-2xl animate-pulse mr-2" />
                        Loading usage data...
                    </div>
                ) : usage ? (
                    <div className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-3xl font-bold text-white ">
                                    {usage.used_mb.toFixed(1)}
                                </span>
                                <span className="text-[#666] ml-1">
                                    / {usage.limit_mb} MB
                                </span>
                            </div>
                            <span className={`text-lg font-bold ${statusColor}`}>
                                {usagePercent.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full h-3 bg-[#1A1A1A] overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                        </div>
                        <p className="text-xs text-[#666] ">
                            {usagePercent >= 90
                                ? '⚠️ Critical — storage limits nearly reached'
                                : usagePercent >= 70
                                    ? '⚡ Getting full — monitor usage'
                                    : '✅ Healthy storage levels'}
                        </p>
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-[#666] text-sm">
                        <Icon name="info" className="mr-2" />
                        Run the migration SQL to enable DB usage tracking
                    </div>
                )}
            </div>
        </div>
    );
};
