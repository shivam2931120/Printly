import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Icon } from '../ui/Icon';
import { Service, SERVICE_CATEGORIES, ServiceCategory } from '../../types';
import { fetchServices, saveServices } from '../../services/data';

export const ServiceManagement: React.FC = () => {
 const [services, setServices] = useState<Service[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [dirty, setDirty] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
 const [expandedService, setExpandedService] = useState<string | null>(null);

 useEffect(() => {
 setLoading(true);
 fetchServices()
 .then(setServices)
 .finally(() => setLoading(false));
 }, []);

 const filteredServices = services.filter(service =>
 selectedCategory === 'all' || service.category === selectedCategory
 );

 const handleToggleActive = (serviceId: string) => {
 setServices(prev => prev.map(s => s.id === serviceId ? { ...s, isActive: !s.isActive } : s));
 setDirty(true);
 };

 const handleUpdatePrice = (serviceId: string, variantIndex: number, newPrice: number) => {
 setServices(prev => prev.map(s => {
 if (s.id === serviceId) {
 const updatedVariants = [...s.variants];
 updatedVariants[variantIndex] = { ...updatedVariants[variantIndex], price: newPrice };
 return { ...s, variants: updatedVariants, basePrice: updatedVariants[0]?.price ?? s.basePrice };
 }
 return s;
 }));
 setDirty(true);
 };

 const handleSave = async () => {
 setSaving(true);
 const result = await saveServices(services);
 setSaving(false);
 if (result.success) {
 toast.success('Services saved!');
 setDirty(false);
 } else {
 toast.error('Failed to save services');
 }
 };

 const activeCount = services.filter(s => s.isActive).length;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold text-white ">Service Management</h2>
 <p className="text-[#666] text-sm mt-1">Manage binding, lamination, and other services</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving || !dirty}
 className="inline-flex items-center justify-center h-10 px-4 bg-green-600 text-white text-sm font-bold shadow-md hover:bg-green-700 transition-colors gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Icon name={saving ? 'hourglass_empty' : 'save'} className="text-lg" />
 {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
 </button>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-[#111] "><Icon name="build" className="text-xl text-red-500 " /></div>
 <div><p className="text-2xl font-bold text-white ">{services.length}</p><p className="text-sm text-[#666] ">Total Services</p></div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-green-900/20 bg-green-900/20"><Icon name="check_circle" className="text-xl text-green-400 " /></div>
 <div><p className="text-2xl font-bold text-white ">{activeCount}</p><p className="text-sm text-[#666] ">Active Services</p></div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-purple-900/20 bg-purple-900/20"><Icon name="category" className="text-xl text-purple-400 " /></div>
 <div><p className="text-2xl font-bold text-white ">{SERVICE_CATEGORIES.length}</p><p className="text-sm text-[#666] ">Categories</p></div>
 </div>
 </div>
 </div>

 {/* Category Filter */}
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
 selectedCategory === 'all'
 ? 'bg-[#0A0A0A] bg-[#0A0A0A] text-white shadow-md'
 : 'bg-[#0A0A0A] text-[#666] border border-[#333] hover:bg-[#111] '
 }`}
 >
 All Services
 </button>
 {SERVICE_CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 onClick={() => setSelectedCategory(cat.id)}
 className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
 selectedCategory === cat.id
 ? 'bg-[#0A0A0A] bg-[#0A0A0A] text-white shadow-md'
 : 'bg-[#0A0A0A] text-[#666] border border-[#333] hover:bg-[#111] '
 }`}
 >
 <Icon name={cat.icon} className="text-lg" />
 {cat.name}
 </button>
 ))}
 </div>

 {/* Service List */}
 {loading ? (
 <div className="py-16 text-center">
 <div className="size-8 border-2 border-[#333] border-t-primary animate-spin mx-auto mb-3" />
 <p className="text-[#666] text-sm">Loading services…</p>
 </div>
 ) : (
 <div className="space-y-4">
 {filteredServices.map((service) => (
 <div
 key={service.id}
 className={`bg-[#0A0A0A] border border-[#333] overflow-hidden transition-all ${!service.isActive ? 'opacity-60' : ''}`}
 >
 {/* Service Header */}
 <div
 className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#0A0A0A] /50 transition-colors"
 onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
 >
 <div className="flex items-center gap-4">
 <div className="p-3 bg-[#111] ">
 <Icon
 name={SERVICE_CATEGORIES.find(c => c.id === service.category)?.icon || 'build'}
 className="text-2xl text-red-500 "
 />
 </div>
 <div>
 <h3 className="font-semibold text-white ">{service.name}</h3>
 <p className="text-sm text-[#666] ">{service.description}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-lg font-bold text-white ">From ₹{service.basePrice}</span>
 <button
 onClick={(e) => { e.stopPropagation(); handleToggleActive(service.id); }}
 className={`px-3 py-1 text-xs font-medium ${
 service.isActive
 ? 'bg-green-900/20 text-green-400 '
 : 'bg-[#111] text-[#666] '
 }`}
 >
 {service.isActive ? 'Active' : 'Inactive'}
 </button>
 <Icon name={expandedService === service.id ? 'expand_less' : 'expand_more'} className="text-xl text-[#666]" />
 </div>
 </div>

 {/* Expanded Variants */}
 {expandedService === service.id && (
 <div className="border-t border-[#333] p-5 bg-[#0A0A0A] /30">
 <h4 className="text-sm font-semibold text-[#666] mb-3">Pricing Variants</h4>
 <div className="grid gap-3">
 {service.variants.map((variant, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] ">
 <span className="text-[#666] ">{variant.name}</span>
 <div className="flex items-center gap-2">
 <span className="text-[#666]">₹</span>
 <input
 type="number"
 value={variant.price}
 onChange={(e) => handleUpdatePrice(service.id, index, Number(e.target.value))}
 className="w-20 px-2 py-1 bg-[#0A0A0A] border border-[#333] rounded text-right text-white focus:ring-2 focus:ring-primary"
 min="0"
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}

 {filteredServices.length === 0 && (
 <div className="text-center py-12">
 <Icon name="build" className="text-4xl text-[#666] mb-3" />
 <p className="text-[#666] ">No services in this category</p>
 </div>
 )}
 </div>
 )}

 {dirty && !loading && (
 <p className="text-xs text-amber-400 text-center">You have unsaved changes — click “Save Changes” to persist them.</p>
 )}
 </div>
 );
};

