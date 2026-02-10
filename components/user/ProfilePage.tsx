import React from 'react';
import { User, Mail, Shield, LogOut, Settings, Package, HelpCircle, Clock, AlertTriangle, LogIn } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/useOrderStore';

export const ProfilePage: React.FC = () => {
    const { user, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const { orders } = useOrderStore();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (!isSignedIn || !user) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-32 pt-10 px-6">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                    <div className="size-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Guest Mode</h2>
                        <p className="text-yellow-200/80 text-sm max-w-sm">
                            You are not signed in. Orders placed as a guest are stored on this device only and may be lost if you clear your browser data.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/sign-in')}
                        className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
                    >
                        <LogIn size={18} className="mr-2" />
                        Sign In to Save Orders
                    </Button>
                </div>

                {/* Recent Orders Section (Visible to Guest too) */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-2">Recent Device Orders</h3>
                    {orders.length === 0 ? (
                        <div className="bg-background-card border border-border rounded-3xl p-8 text-center">
                            <p className="text-text-muted">No orders yet.</p>
                            <Button variant="link" onClick={() => navigate('/')} className="text-white mt-2">
                                Start Printing
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-background-card border border-border rounded-3xl overflow-hidden divide-y divide-border">
                            {orders.slice(0, 3).map((order) => (
                                <div key={order.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-white text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                                                {order.otp && (
                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 tracking-wider">
                                                        OTP: {order.otp}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted">
                                                {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-bold text-white">₹{order.totalAmount.toFixed(2)}</span>
                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-full border border-green-500/20">
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-32">
            {/* Header / Profile Info */}
            <div className="bg-background-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
                <div className="size-24 rounded-full bg-white/10 flex items-center justify-center p-1 border border-white/20">
                    <img
                        src={user.imageUrl}
                        alt={user.fullName || 'User'}
                        className="w-full h-full rounded-full object-cover"
                    />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white font-display">{user.fullName}</h1>
                    <p className="text-text-muted">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
                <div className="flex gap-2">
                    {user.publicMetadata.role === 'ADMIN' && (
                        <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Admin</span>
                    )}
                    {user.publicMetadata.role === 'DEVELOPER' && (
                        <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Developer</span>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => navigate('/my-orders')}
                    className="flex items-center gap-4 p-5 bg-background-card border border-border rounded-2xl hover:border-white/20 transition-all group"
                >
                    <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                        <Package size={20} />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="font-bold text-white">My Orders</p>
                        <p className="text-xs text-text-muted">View and track your print jobs</p>
                    </div>
                    <Settings size={18} className="text-text-muted group-hover:text-white transition-colors" />
                </button>

                <button
                    onClick={() => navigate('/support')}
                    className="flex items-center gap-4 p-5 bg-background-card border border-border rounded-2xl hover:border-white/20 transition-all group"
                >
                    <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                        <HelpCircle size={20} />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="font-bold text-white">Help & Support</p>
                        <p className="text-xs text-text-muted">FAQs and contact information</p>
                    </div>
                    <Settings size={18} className="text-text-muted group-hover:text-white transition-colors" />
                </button>
            </div>

            {/* Recent Orders Section */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-2">Recent Orders</h3>
                {orders.length === 0 ? (
                    <div className="bg-background-card border border-border rounded-3xl p-8 text-center">
                        <p className="text-text-muted">No orders yet.</p>
                        <Button variant="link" onClick={() => navigate('/')} className="text-white mt-2">
                            Start Printing
                        </Button>
                    </div>
                ) : (
                    <div className="bg-background-card border border-border rounded-3xl overflow-hidden divide-y divide-border">
                        {orders.slice(0, 3).map((order) => (
                            <div key={order.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                                            {order.otp && (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 tracking-wider">
                                                    OTP: {order.otp}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-text-muted">
                                            {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-bold text-white">₹{order.totalAmount.toFixed(2)}</span>
                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-full border border-green-500/20">
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings & Danger Zone */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-2">Account Settings</h3>
                <div className="bg-background-card border border-border rounded-3xl overflow-hidden">
                    <button className="w-full flex items-center justify-between p-5 border-b border-border hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4 text-white">
                            <Shield size={20} />
                            <span className="font-medium">Security Settings</span>
                        </div>
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between p-5 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <LogOut size={20} />
                            <span className="font-bold">Sign Out</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
