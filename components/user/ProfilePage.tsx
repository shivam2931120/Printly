import React from 'react';
import { User as UserIcon, Shield, LogOut, Package, HelpCircle, LogIn, AlertTriangle, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/useOrderStore';

export const ProfilePage: React.FC = () => {
    const { user, isSignedIn, signOut } = useAuth();
    const navigate = useNavigate();
    const { orders } = useOrderStore();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (!isSignedIn || !user) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-32 pt-10 px-6">
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-[32px] p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-xl">
                    <div className="size-20 rounded-[24px] bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white mb-2 font-display">Guest Session</h2>
                        <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">
                            Sign in to sync your orders across devices and access premium features.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/sign-in')}
                        className="bg-white text-black hover:bg-white/90 font-black px-8 h-12 rounded-2xl transition-all"
                    >
                        <LogIn size={18} className="mr-2" />
                        Sign In Now
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
                                            <Package size={20} />
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
                                                {order.items.length} items
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
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-[40px] p-10 flex flex-col items-center text-center backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="relative mb-6">
                    <div className="size-28 rounded-[32px] bg-white/[0.05] p-1 border border-white/10 shadow-2xl">
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            alt={user.name || 'User'}
                            className="w-full h-full rounded-[28px] object-cover"
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-8 rounded-xl bg-white text-black flex items-center justify-center border-4 border-[#050505]">
                        <UserIcon size={14} fill="currentColor" />
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    <h1 className="text-3xl font-black text-white font-display tracking-tight">{user.name}</h1>
                    <p className="text-text-muted text-sm font-medium opacity-60">{user.email}</p>
                </div>

                <div className="flex gap-2">
                    {user.isAdmin && (
                        <span className="px-4 py-1.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.15em]">Administrator</span>
                    )}
                    {user.isDeveloper && (
                        <span className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em]">Developer</span>
                    )}
                    {!user.isAdmin && !user.isDeveloper && (
                        <span className="px-4 py-1.5 bg-white/10 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-[0.15em]">Member</span>
                    )}
                </div>
            </div>

            {/* Dashboard shortcut for admin/developer */}
            {(user.isDeveloper || user.isAdmin) && (
                <button
                    onClick={() => navigate(user.isDeveloper ? '/developer' : '/admin')}
                    className="w-full flex items-center justify-between p-5 bg-blue-500/10 border border-blue-500/20 rounded-[28px] hover:bg-blue-500/15 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <LayoutDashboard size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-white text-sm uppercase tracking-wider">
                                {user.isDeveloper ? 'Developer' : 'Admin'} Dashboard
                            </p>
                            <p className="text-[10px] text-blue-400/60 font-bold uppercase tracking-widest mt-0.5">
                                Manage your shop
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-400 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/my-orders')}
                    className="flex flex-col items-start gap-4 p-6 bg-white/[0.03] border border-white/[0.05] rounded-[32px] hover:bg-white/[0.06] transition-all group backdrop-blur-md"
                >
                    <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm uppercase tracking-wider">Orders</p>
                        <p className="text-[10px] text-text-muted font-bold opacity-40 uppercase tracking-widest mt-1">Track history</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/support')}
                    className="flex flex-col items-start gap-4 p-6 bg-white/[0.03] border border-white/[0.05] rounded-[32px] hover:bg-white/[0.06] transition-all group backdrop-blur-md"
                >
                    <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <HelpCircle size={24} />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm uppercase tracking-wider">Support</p>
                        <p className="text-[10px] text-text-muted font-bold opacity-40 uppercase tracking-widest mt-1">Get assistance</p>
                    </div>
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
                                        <Package size={20} />
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
                                            {order.items.length} items
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

            {/* Settings & Logout */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4 opacity-50">Account Control</h3>
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-[32px] overflow-hidden backdrop-blur-xl">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between p-6 text-red-400 hover:bg-red-500/5 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <LogOut size={20} />
                            </div>
                            <span className="font-black text-sm uppercase tracking-widest">Sign Out</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>
        </div>
    );
};
