import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, Loader2, Shield, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { fetchUserDevices, revokeDevice, DeviceCredential } from '../../lib/biometricAuth';
import { toast } from 'sonner';

interface DeviceManagerProps {
    userId: string;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ userId }) => {
    const [devices, setDevices] = useState<DeviceCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    useEffect(() => {
        loadDevices();
    }, [userId]);

    const loadDevices = async () => {
        setLoading(true);
        const devs = await fetchUserDevices(userId);
        setDevices(devs);
        setLoading(false);
    };

    const handleRevoke = async (deviceId: string, deviceName: string) => {
        if (!confirm(`Remove biometric access for "${deviceName}"? This device will need to re-register.`)) return;

        setRevoking(deviceId);
        const success = await revokeDevice(deviceId);
        if (success) {
            setDevices(prev => prev.filter(d => d.id !== deviceId));
            toast.success(`Removed ${deviceName}`);
        } else {
            toast.error('Failed to remove device');
        }
        setRevoking(null);
    };

    const getDeviceIcon = (name: string) => {
        if (name.includes('iOS') || name.includes('Android')) return Smartphone;
        if (name.includes('iPad') || name.includes('Tablet')) return Tablet;
        return Monitor;
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diff = now.getTime() - d.getTime();
            const mins = Math.floor(diff / 60_000);
            const hrs = Math.floor(diff / 3_600_000);
            const days = Math.floor(diff / 86_400_000);

            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            if (hrs < 24) return `${hrs}h ago`;
            if (days < 7) return `${days}d ago`;
            return d.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    };

    if (loading) {
        return (
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                    <span className="text-text-muted text-sm">Loading devices...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Trusted Devices</h3>
                        <p className="text-text-muted text-xs">{devices.length} device{devices.length !== 1 ? 's' : ''} registered</p>
                    </div>
                </div>
                <button
                    onClick={loadDevices}
                    className="size-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4 text-text-muted" />
                </button>
            </div>

            {devices.length === 0 ? (
                <div className="text-center py-8">
                    <Smartphone className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-text-muted text-sm">No devices registered yet</p>
                    <p className="text-text-muted/50 text-xs mt-1">Enable biometric authentication to add this device</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {devices.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.deviceName);
                        return (
                            <div
                                key={device.id}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    device.isCurrent
                                        ? 'bg-green-500/5 border-green-500/20'
                                        : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'
                                }`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center ${
                                    device.isCurrent ? 'bg-green-500/10' : 'bg-white/5'
                                }`}>
                                    <DeviceIcon className={`w-5 h-5 ${
                                        device.isCurrent ? 'text-green-400' : 'text-text-muted'
                                    }`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white truncate">
                                            {device.deviceName}
                                        </span>
                                        {device.isCurrent && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                                This device
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-text-muted text-xs">
                                        Last used: {formatDate(device.lastUsed)}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleRevoke(device.id, device.deviceName)}
                                    disabled={revoking === device.id}
                                    className="size-9 rounded-xl flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                    title="Remove device"
                                >
                                    {revoking === device.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
