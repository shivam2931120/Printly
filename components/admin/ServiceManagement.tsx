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
 <h2 className="text-2xl font-bold text-foreground ">Service Management</h2>
 <p className="text-foreground-muted text-sm mt-1">Manage binding, lamination, and other services</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving || !dirty}
 className="inline-flex items-center justify-center h-10 px-4 bg-green-600 text-foreground text-sm font-bold hover:bg-green-700 transition-colors gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Icon name={saving ? 'hourglass_empty' : 'save'} className="text-lg" />
 {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
 </button>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-background-subtle "><Icon name="build" className="text-xl text-primary " /></div>
 <div><p className="text-2xl font-bold text-foreground ">{services.length}</p><p className="text-sm text-foreground-muted ">Total Services</p></div>
 </div>
 </div>
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-green-900/20 bg-green-900/20"><Icon name="check_circle" className="text-xl text-green-400 " /></div>
 <div><p className="text-2xl font-bold text-foreground ">{activeCount}</p><p className="text-sm text-foreground-muted ">Active Services</p></div>
 </div>
 </div>
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary/10"><Icon name="category" className="text-xl text-primary " /></div>
 <div><p className="text-2xl font-bold text-foreground ">{SERVICE_CATEGORIES.length}</p><p className="text-sm text-foreground-muted ">Categories</p></div>
 </div>
 </div>
 </div>

 {/* Category Filter */}
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
 selectedCategory === 'all'
 ? 'bg-background-card bg-background-card text-foreground '
 : 'bg-background-card text-foreground-muted border border-border hover:bg-background-subtle '
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
 ? 'bg-background-card bg-background-card text-foreground '
 : 'bg-background-card text-foreground-muted border border-border hover:bg-background-subtle '
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
 <div className="size-8 border-2 border-border border-t-primary animate-spin mx-auto mb-3" />
 <p className="text-foreground-muted text-sm">Loading services…</p>
 </div>
 ) : (
 <div className="space-y-4">
 {filteredServices.map((service) => (
 <div
 key={service.id}
 className={`bg-background-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all ${!service.isActive ? 'opacity-60' : ''}`}
 >
 {/* Service Header */}
 <div
 className="flex items-center justify-between p-5 cursor-pointer hover:bg-background-card /50 transition-colors"
 onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
 >
 <div className="flex items-center gap-4">
 <div className="p-3 bg-background-subtle ">
 <Icon
 name={SERVICE_CATEGORIES.find(c => c.id === service.category)?.icon || 'build'}
 className="text-2xl text-primary "
 />
 </div>
 <div>
 <h3 className="font-semibold text-foreground ">{service.name}</h3>
 <p className="text-sm text-foreground-muted ">{service.description}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-lg font-bold text-foreground ">From ₹{service.basePrice}</span>
 <button
 onClick={(e) => { e.stopPropagation(); handleToggleActive(service.id); }}
 className={`px-3 py-1 text-xs font-medium ${
 service.isActive
 ? 'bg-green-900/20 text-green-400 '
 : 'bg-background-subtle text-foreground-muted '
 }`}
 >
 {service.isActive ? 'Active' : 'Inactive'}
 </button>
 <Icon name={expandedService === service.id ? 'expand_less' : 'expand_more'} className="text-xl text-foreground-muted" />
 </div>
 </div>

 {/* Expanded Variants */}
 {expandedService === service.id && (
 <div className="border-t border-border p-5 bg-background-card /30">
 <h4 className="text-sm font-semibold text-foreground-muted mb-3">Pricing Variants</h4>
 <div className="grid gap-3">
 {service.variants.map((variant, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-background-card ">
 <span className="text-foreground-muted ">{variant.name}</span>
 <div className="flex items-center gap-2">
 <span className="text-foreground-muted">₹</span>
 <input
 type="number"
 value={variant.price}
 onChange={(e) => handleUpdatePrice(service.id, index, Number(e.target.value))}
 className="w-20 px-2 py-1 bg-background-card border border-border rounded-2xl shadow-2xl rounded text-right text-foreground focus:ring-2 focus:ring-primary"
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
 <Icon name="build" className="text-4xl text-foreground-muted mb-3" />
 <p className="text-foreground-muted ">No services in this category</p>
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

