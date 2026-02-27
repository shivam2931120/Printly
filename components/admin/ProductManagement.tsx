import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { Product, PRODUCT_CATEGORIES, ProductCategory } from '../../types';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../services/data';

interface ProductFormData {
 name: string;
 description: string;
 category: ProductCategory;
 price: number;
 stock: number;
}

export const ProductManagement: React.FC = () => {
 const [products, setProducts] = useState<Product[]>([]);
 const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingProduct, setEditingProduct] = useState<Product | null>(null);
 const [formData, setFormData] = useState<ProductFormData>({
 name: '',
 description: '',
 category: 'stationery',
 price: 0,
 stock: 0,
 });

 // Load products on mount
 useEffect(() => {
 loadProducts();
 }, []);

 const loadProducts = async () => {
 const data = await fetchProducts();
 setProducts(data);
 };

 const filteredProducts = products.filter(product => {
 const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
 const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesCategory && matchesSearch;
 });

 const handleAddProduct = () => {
 setEditingProduct(null);
 setFormData({ name: '', description: '', category: 'stationery', price: 0, stock: 0 });
 setIsModalOpen(true);
 };

 const handleEditProduct = (product: Product) => {
 setEditingProduct(product);
 setFormData({
 name: product.name,
 description: product.description,
 category: product.category,
 price: product.price,
 stock: product.stock,
 });
 setIsModalOpen(true);
 };

 const handleSaveProduct = async () => {
 if (editingProduct) {
 const updatedProduct = { ...editingProduct, ...formData };
 const { success } = await updateProduct(updatedProduct);
 if (success) {
 setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
 setIsModalOpen(false);
 } else {
 alert('Failed to update product');
 }
 } else {
 const newProduct: Product = {
 id: `P${Date.now()}`, // Simple ID generation
 ...formData,
 image: '📦',
 isActive: true,
 };
 const { success } = await createProduct(newProduct);
 if (success) {
 setProducts(prev => [...prev, newProduct]);
 setIsModalOpen(false);
 } else {
 alert('Failed to create product');
 }
 }
 };

 const handleDeleteProduct = async (productId: string) => {
 if (!confirm('Are you sure you want to delete this product?')) return;

 const { success } = await deleteProduct(productId);
 if (success) {
 setProducts(prev => prev.filter(p => p.id !== productId));
 } else {
 alert('Failed to delete product');
 }
 };

 const handleStockChange = async (productId: string, change: number) => {
 const product = products.find(p => p.id === productId);
 if (!product) return;

 const updatedProduct = { ...product, stock: Math.max(0, product.stock + change) };
 // Optimistic update
 setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));

 const { success } = await updateProduct(updatedProduct);
 if (!success) {
 // Revert if failed
 setProducts(prev => prev.map(p => p.id === productId ? product : p));
 alert('Failed to update stock');
 }
 };

 const handleToggleActive = async (productId: string) => {
 const product = products.find(p => p.id === productId);
 if (!product) return;

 const updatedProduct = { ...product, isActive: !product.isActive };
 // Optimistic update
 setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));

 const { success } = await updateProduct(updatedProduct);
 if (!success) {
 // Revert if failed
 setProducts(prev => prev.map(p => p.id === productId ? product : p));
 alert('Failed to update status');
 }
 };

 const lowStockCount = products.filter(p => p.stock < 20).length;
 const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold text-white ">Product Management</h2>
 <p className="text-[#666] text-sm mt-1">
 Manage inventory and product catalog
 </p>
 </div>
 <button
 onClick={async () => {
 const outOfStock = products.filter(p => p.stock === 0);
 if (outOfStock.length === 0) {
 alert('No out-of-stock products to delete.');
 return;
 }
 if (confirm(`Delete ${outOfStock.length} out-of-stock products?`)) {
 outOfStock.forEach(p => handleDeleteProduct(p.id));
 }
 }}
 className="inline-flex items-center justify-center h-10 px-4 bg-red-900/20 text-red-400 text-sm font-bold hover:bg-red-900/30 transition-colors mr-2"
 >
 <Icon name="delete_sweep" className="text-lg mr-2" />
 Clean Up
 </button>
 <button
 onClick={handleAddProduct}
 className="inline-flex items-center justify-center h-10 px-4 bg-[#0A0A0A] bg-[#0A0A0A] text-white text-sm font-bold shadow-md hover:opacity-90 transition-colors"
 >
 <Icon name="add" className="text-lg mr-2" />
 Add Product
 </button>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-[#111] ">
 <Icon name="inventory_2" className="text-xl text-red-500 " />
 </div>
 <div>
 <p className="text-2xl font-bold text-white ">{products.length}</p>
 <p className="text-sm text-[#666] ">Total Products</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-green-900/20 bg-green-900/20">
 <Icon name="check_circle" className="text-xl text-green-400 " />
 </div>
 <div>
 <p className="text-2xl font-bold text-white ">
 {products.filter(p => p.isActive).length}
 </p>
 <p className="text-sm text-[#666] ">Active</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-orange-900/20 ">
 <Icon name="warning" className="text-xl text-orange-400 " />
 </div>
 <div>
 <p className="text-2xl font-bold text-white ">{lowStockCount}</p>
 <p className="text-sm text-[#666] ">Low Stock</p>
 </div>
 </div>
 </div>
 <div className="bg-[#0A0A0A] border border-[#333] p-5">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-purple-900/20 bg-purple-900/20">
 <Icon name="payments" className="text-xl text-purple-400 " />
 </div>
 <div>
 <p className="text-2xl font-bold text-white ">
 ₹{totalValue.toLocaleString()}
 </p>
 <p className="text-sm text-[#666] ">Inventory Value</p>
 </div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="relative flex-1 max-w-md">
 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-lg" />
 <input
 type="text"
 placeholder="Search products..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
 />
 </div>
 <div className="flex gap-2 overflow-x-auto pb-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'all'
 ? 'bg-[#0A0A0A] bg-[#0A0A0A] text-white shadow-md transform scale-105'
 : 'bg-[#0A0A0A] text-[#666] border border-[#333] hover:bg-[#111] '
 }`}
 >
 All
 </button>
 {PRODUCT_CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 onClick={() => setSelectedCategory(cat.id)}
 className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategory === cat.id
 ? 'bg-[#0A0A0A] bg-[#0A0A0A] text-white shadow-md transform scale-105'
 : 'bg-[#0A0A0A] text-[#666] border border-[#333] hover:bg-[#111] '
 }`}
 >
 <Icon name={cat.icon} className="text-lg" />
 {cat.name}
 </button>
 ))}
 </div>
 </div>

 {/* Product Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {filteredProducts.map((product) => (
 <div
 key={product.id}
 className={`bg-[#0A0A0A] border border-[#333] p-5 transition-all hover:shadow-lg ${!product.isActive ? 'opacity-60' : ''
 }`}
 >
 <div className="flex items-start justify-between mb-3">
 <span className="text-3xl">{product.image}</span>
 <div className="flex gap-1">
 <button
 onClick={() => handleToggleActive(product.id)}
 className={`p-1.5 transition-colors ${product.isActive
 ? 'text-green-400 hover:bg-green-900/30 '
 : 'text-[#666] hover:bg-[#111] '
 }`}
 title={product.isActive ? 'Deactivate' : 'Activate'}
 >
 <Icon name={product.isActive ? 'visibility' : 'visibility_off'} className="text-lg" />
 </button>
 <button
 onClick={() => handleEditProduct(product)}
 className="p-1.5 text-[#666] hover:text-red-500 hover:bg-[#111] transition-colors"
 title="Edit"
 >
 <Icon name="edit" className="text-lg" />
 </button>
 <button
 onClick={() => handleDeleteProduct(product.id)}
 className="p-1.5 text-[#666] hover:text-red-500 hover:bg-red-900/20 transition-colors"
 title="Delete"
 >
 <Icon name="delete" className="text-lg" />
 </button>
 </div>
 </div>

 <h3 className="font-semibold text-white text-sm leading-tight mb-1">
 {product.name}
 </h3>
 <p className="text-xs text-[#666] mb-3 line-clamp-2">
 {product.description}
 </p>

 <div className="flex items-center justify-between mb-3">
 <span className="text-lg font-bold text-white ">₹{product.price}</span>
 <span className={`text-xs px-2 py-0.5 font-medium ${PRODUCT_CATEGORIES.find(c => c.id === product.category)?.id === 'stationery'
 ? 'bg-red-900/20 text-red-400 '
 : PRODUCT_CATEGORIES.find(c => c.id === product.category)?.id === 'writing'
 ? 'bg-green-900/20 text-green-400 '
 : PRODUCT_CATEGORIES.find(c => c.id === product.category)?.id === 'art'
 ? 'bg-purple-900/20 text-purple-400 '
 : 'bg-orange-900/20 text-orange-400 '
 }`}>
 {PRODUCT_CATEGORIES.find(c => c.id === product.category)?.name}
 </span>
 </div>

 {/* Stock Control */}
 <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#333] ">
 <div>
 <p className="text-xs text-[#666] ">Stock</p>
 <p className={`font-bold ${product.stock < 20
 ? 'text-red-500 '
 : product.stock < 50
 ? 'text-orange-400 '
 : 'text-green-400 '
 }`}>
 {product.stock}
 </p>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={() => handleStockChange(product.id, -10)}
 className="size-8 bg-[#111] text-[#666] hover:bg-[#1A1A1A] transition-colors flex items-center justify-center"
 >
 <Icon name="remove" className="text-lg" />
 </button>
 <button
 onClick={() => handleStockChange(product.id, 10)}
 className="size-8 bg-[#111] text-red-500 hover:bg-red-900/20 transition-colors flex items-center justify-center"
 >
 <Icon name="add" className="text-lg" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {filteredProducts.length === 0 && (
 <div className="text-center py-12">
 <Icon name="search_off" className="text-4xl text-[#666] mb-3" />
 <p className="text-[#666] ">No products found</p>
 </div>
 )}

 {/* Add/Edit Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
 <div className="bg-[#0A0A0A] w-full max-w-md p-6 shadow-2xl">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-bold text-white ">
 {editingProduct ? 'Edit Product' : 'Add Product'}
 </h3>
 <button
 onClick={() => setIsModalOpen(false)}
 className="p-2 text-[#666] hover:bg-[#111] transition-colors"
 >
 <Icon name="close" className="text-xl" />
 </button>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[#666] mb-1.5">
 Product Name
 </label>
 <input
 type="text"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-white focus:ring-2 focus:ring-primary"
 placeholder="Enter product name"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#666] mb-1.5">
 Description
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-white focus:ring-2 focus:ring-primary resize-none"
 rows={2}
 placeholder="Enter description"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#666] mb-1.5">
 Category
 </label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
 className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-white focus:ring-2 focus:ring-primary"
 >
 {PRODUCT_CATEGORIES.map((cat) => (
 <option key={cat.id} value={cat.id}>{cat.name}</option>
 ))}
 </select>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-[#666] mb-1.5">
 Price (₹)
 </label>
 <input
 type="number"
 value={formData.price}
 onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
 className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-white focus:ring-2 focus:ring-primary"
 min="0"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[#666] mb-1.5">
 Stock
 </label>
 <input
 type="number"
 value={formData.stock}
 onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
 className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-white focus:ring-2 focus:ring-primary"
 min="0"
 />
 </div>
 </div>
 </div>

 <div className="flex gap-3 mt-6">
 <button
 onClick={() => setIsModalOpen(false)}
 className="flex-1 py-2.5 border border-[#333] text-[#666] font-medium hover:bg-[#0A0A0A] transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveProduct}
 className="flex-1 py-2.5 bg-[#0A0A0A] bg-[#0A0A0A] text-white font-bold hover:opacity-90 transition-colors"
 >
 {editingProduct ? 'Save Changes' : 'Add Product'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
