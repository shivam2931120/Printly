import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { supabase } from '../../services/data';

interface Shop {
 id: string;
 shopName: string;
 tagline: string;
 location: string;
 contact: string;
 email: string;
 isActive: boolean;
 createdAt: string;
 totalOrders: number;
 totalRevenue: number;
}

export const ShopsManagement: React.FC<{ onSelectShop?: (shopId: string) => void; onManageShop?: (shopId: string) => void }> = ({ onSelectShop, onManageShop }) => {
 const [shops, setShops] = useState<Shop[]>([]);
 const [loading, setLoading] = useState(true);
 const [isAddingShop, setIsAddingShop] = useState(false);
 const [newShopName, setNewShopName] = useState('');

 const loadShops = async () => {
 setLoading(true);
 try {
 const { data: shopRows, error } = await supabase
 .from('Shop')
 .select('*')
 .order('createdAt', { ascending: false });

 if (error) {
 console.error('Error fetching shops:', error);
 setShops([]);
 return;
 }

 // Get order counts / revenue per shop
 const { data: orderStats } = await supabase
 .from('Order')
 .select('shopId, totalAmount');

 const shopStats: Record<string, { orders: number; revenue: number }> = {};
 (orderStats || []).forEach((o: any) => {
 const sid = o.shopId || 'unknown';
 if (!shopStats[sid]) shopStats[sid] = { orders: 0, revenue: 0 };
 shopStats[sid].orders++;
 shopStats[sid].revenue += o.totalAmount || 0;
 });

 const mapped: Shop[] = (shopRows || []).map((s: any) => ({
 id: s.id,
 shopName: s.shopName || s.name || 'Unnamed Shop',
 tagline: s.tagline || '',
 location: s.location || '',
 contact: s.contact || '',
 email: s.email || '',
 isActive: s.isActive ?? true,
 createdAt: s.createdAt,
 totalOrders: shopStats[s.id]?.orders || 0,
 totalRevenue: shopStats[s.id]?.revenue || 0,
 }));

 setShops(mapped);
 } catch (e) {
 console.error('Failed to load shops:', e);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { loadShops(); }, []);

 const addShop = async () => {
 if (!newShopName.trim()) return;
 try {
 const { error } = await supabase.from('Shop').insert({
 shopName: newShopName.trim(),
 tagline: 'Print Shop',
 isActive: true,
 });
 if (error) {
 console.error('Error adding shop:', error);
 return;
 }
 setNewShopName('');
 setIsAddingShop(false);
 loadShops();
 } catch (e) {
 console.error('Failed to add shop:', e);
 }
 };

 const toggleShopStatus = async (shopId: string, currentlyActive: boolean) => {
 try {
 const { error } = await supabase
 .from('Shop')
 .update({ isActive: !currentlyActive })
 .eq('id', shopId);
 if (error) {
 console.error('Error toggling shop status:', error);
 return;
 }
 loadShops();
 } catch (e) {
 console.error('Failed to toggle shop:', e);
 }
 };

 const handleManageShop = (shop: Shop) => {
 onSelectShop?.(shop.id);
 onManageShop?.(shop.id);
 };

 const totalRevenue = shops.reduce((sum, s) => sum + s.totalRevenue, 0);
 const totalOrders = shops.reduce((sum, s) => sum + s.totalOrders, 0);
 const activeShops = shops.filter(s => s.isActive).length;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold text-white">Shops Management</h2>
 <p className="text-[#666] text-sm mt-1">
 Manage all registered shops on the platform
 </p>
 </div>
 <button
 onClick={() => setIsAddingShop(true)}
 className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#333] text-white text-sm font-semibold hover:bg-[#0A0A0A]/15 transition-colors"
 >
 <Icon name="add_business" className="text-lg" />
 Add Shop
 </button>
 </div>

 {/* Stats Overview */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
 <div className="bg-[#0A0A0A] border border-[#333]/[0.06] p-5 transition-colors duration-200">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-[#111]0/10">
 <Icon name="store" className="text-xl text-blue-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-white">{shops.length}</p>
 <p className="text-sm text-text-secondary">Total Shops</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333]/[0.06] p-5 transition-colors duration-200">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-green-900/20/10">
 <Icon name="check_circle" className="text-xl text-green-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-white">{activeShops}</p>
 <p className="text-sm text-text-secondary">Active</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333]/[0.06] p-5 transition-colors duration-200">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-purple-900/200/10">
 <Icon name="receipt_long" className="text-xl text-purple-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-white">{totalOrders}</p>
 <p className="text-sm text-text-secondary">Total Orders</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333]/[0.06] p-5 transition-colors duration-200">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-amber-900/200/10">
 <Icon name="payments" className="text-xl text-amber-400" />
 </div>
 <div>
 <p className="text-2xl font-bold text-white">₹{totalRevenue.toLocaleString()}</p>
 <p className="text-sm text-text-secondary">Total Revenue</p>
 </div>
 </div>
 </div>
 </div>

 {/* Add Shop Modal */}
 {isAddingShop && (
 <div className="bg-[#0A0A0A] border border-[#333] p-6">
 <h3 className="text-lg font-bold text-white mb-4">Add New Shop</h3>
 <div className="flex gap-3">
 <input
 type="text"
 placeholder="Shop Name"
 value={newShopName}
 onChange={(e) => setNewShopName(e.target.value)}
 className="flex-1 px-4 py-2 bg-[#111] border border-[#333] text-white placeholder:text-[#666] focus:outline-none focus:border-red-600"
 />
 <button
 onClick={addShop}
 className="px-4 py-2 bg-green-900/20/90 text-white font-semibold hover:bg-green-400 transition-colors"
 >
 Create
 </button>
 <button
 onClick={() => setIsAddingShop(false)}
 className="px-4 py-2 bg-[#111] border border-[#333] text-text-secondary font-medium hover:text-white hover:bg-[#0A0A0A]/[0.1] transition-colors"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* Shops List */}
 {loading ? (
 <div className="flex items-center justify-center py-20">
 <div className="size-8 border-2 border-[#333] border-t-white animate-spin" />
 </div>
 ) : (
 <div className="bg-[#0A0A0A] border border-[#333]/[0.06] overflow-hidden">
 <table className="w-full">
 <thead>
 <tr className="bg-surface-darker/50 border-b border-border-dark">
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Shop</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Location</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Orders</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Revenue</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
 <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border-dark">
 {shops.map((shop) => (
 <tr key={shop.id} className="hover:bg-[#0A0A0A] transition-colors group">
 <td className="py-4 px-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary/10">
 <Icon name="store" className="text-primary" />
 </div>
 <div>
 <p className="font-semibold text-text-primary">{shop.shopName}</p>
 <p className="text-sm text-text-secondary">{shop.tagline}</p>
 </div>
 </div>
 </td>
 <td className="py-4 px-4 text-text-secondary text-sm">{shop.location}</td>
 <td className="py-4 px-4 font-medium text-text-primary">{shop.totalOrders}</td>
 <td className="py-4 px-4 font-semibold text-success">₹{shop.totalRevenue.toLocaleString()}</td>
 <td className="py-4 px-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${shop.isActive
 ? 'bg-success/10 text-success'
 : 'bg-red-900/20/10 text-red-500'
 }`}>
 {shop.isActive ? 'Active' : 'Suspended'}
 </span>
 </td>
 <td className="py-4 px-4 text-right">
 <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => handleManageShop(shop)}
 className="flex items-center gap-1 px-3 py-1.5 bg-[#0A0A0A] border border-[#333] text-xs font-medium text-text-secondary hover:text-white hover:bg-[#111] hover:border-[#333] transition-all duration-200"
 >
 <Icon name="admin_panel_settings" className="text-sm" />
 Manage
 </button>
 <button
 onClick={() => {
 if (confirm(`Are you sure you want to ${shop.isActive ? 'suspend' : 'activate'} this shop?`)) {
 toggleShopStatus(shop.id, shop.isActive);
 }
 }}
 className={`flex items-center gap-1 px-3 py-1.5 border text-xs font-medium transition-colors ${shop.isActive
 ? 'border-red-900/30 text-red-400 bg-red-900/10 hover:bg-red-900/20 hover:border-red-900/50'
 : 'border-green-900/30 text-green-400 bg-green-900/10 hover:bg-green-900/30 hover:border-green-900/50'
 }`}
 title={shop.isActive ? 'Suspend Shop' : 'Activate Shop'}
 >
 <Icon name={shop.isActive ? 'block' : 'check_circle'} className="text-sm" />
 {shop.isActive ? 'Suspend' : 'Activate'}
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {shops.length === 0 && (
 <div className="py-12 text-center">
 <Icon name="store" className="text-4xl text-[#666] mb-3" />
 <p className="text-[#666]">No shops registered yet</p>
 </div>
 )}
 </div>
 )}
 </div>
 );
};
