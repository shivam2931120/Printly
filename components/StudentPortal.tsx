import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './ui/Icon';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import { PrintOptions, PricingConfig, DEFAULT_PRICING, User, ShopConfig, DEFAULT_SHOP_CONFIG, Order, CartItem, Product } from '../types';
import { StudentShop } from './student/StudentShop';
import { initiatePayment } from '../services/razorpay';
import { createOrder, uploadFile } from '../services/data';
import { ordersStorage } from '../services/storage';
import { OrderConfirmation, generateOrderToken } from './user/OrderConfirmation';

// Order type for confirmation modal
interface ConfirmedOrder {
  id: string;
  tokenNumber: string;
  fileName: string;
  pageCount: number;
  options: PrintOptions; // For print jobs
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedReady?: string;
  items?: CartItem[]; // For unified orders
}

type PageView = 'home' | 'orders' | 'support';

interface StudentPortalProps {
  currentUser?: User | null;
  onSignInClick?: () => void;
  pricing?: PricingConfig;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  onSignInClick,
  pricing = DEFAULT_PRICING
}) => {
  const navigate = useNavigate();
  // ===== SHARED STATE =====
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ===== PRINT STATE (Current Job) =====
  // ===== PRINT STATE (Current Job) =====
  interface FileUpload {
    id: string;
    file: File;
    pageCount: number;
    isPdf: boolean;
  }
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [options, setOptions] = useState<PrintOptions>({
    copies: 1,
    paperSize: 'a4',
    orientation: 'portrait',
    colorMode: 'bw',
    sides: 'double',
    binding: 'none',
    paperType: 'normal',
    pageSelection: 'all',
    stapling: 'none',
    holePunch: false,
    coverPage: 'none'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== CHECKOUT STATE =====
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

  // Guest Checkout State


  // Load shop config
  useEffect(() => {
    const stored = localStorage.getItem('printwise_shop_config');
    if (stored) {
      try {
        setShopConfig({ ...DEFAULT_SHOP_CONFIG, ...JSON.parse(stored) });
      } catch (e) { console.error(e); }
    }
  }, []);

  // Calculate Print Price (for current configuration)
  // Calculate Print Price (for current configuration)
  const calculatePrintPrice = () => {
    if (files.length === 0 || isNaN(options.copies) || options.copies < 1) return 0;

    let totalCost = 0;
    const baseRate = options.colorMode === 'color' ? pricing.perPageColor : pricing.perPageBW;
    const paperMultiplier = pricing.paperSizeMultiplier[options.paperSize];

    files.forEach(f => {
      let fileCost = f.pageCount * baseRate * options.copies * paperMultiplier;

      // Double Sided Discount
      if (options.sides === 'double') {
        fileCost -= (f.pageCount * pricing.doubleSidedDiscount * options.copies);
      }

      // Paper Type Extra
      if (pricing.paperTypeFees && pricing.paperTypeFees[options.paperType]) {
        fileCost += (f.pageCount * pricing.paperTypeFees[options.paperType] * options.copies);
      }

      // Per File/Job Costs (multiplied by copies?) -> Usually per "finished document"
      // So if I want 2 copies of a file, I need 2 bindings.

      // Binding
      if (pricing.bindingPrices[options.binding]) {
        fileCost += (pricing.bindingPrices[options.binding] * options.copies);
      }

      // Stapling
      if (pricing.staplingPrices && pricing.staplingPrices[options.stapling]) {
        fileCost += (pricing.staplingPrices[options.stapling] * options.copies);
      }

      // Hole Punch
      if (options.holePunch && pricing.holePunchPrice) {
        fileCost += (pricing.holePunchPrice * options.copies);
      }

      // Cover Page
      if (options.coverPage !== 'none' && pricing.coverPagePrice) {
        // Front only = 1, Front & Back = 2
        const sheets = options.coverPage === 'front_back' ? 2 : 1;
        fileCost += (sheets * pricing.coverPagePrice * options.copies);
      }

      // Service Fee (Per file or per order? Usually per order, but let's say per file type handling)
      // For now keeping service fee per FILE to match logic of "multiple items in cart"
      fileCost += pricing.serviceFee;

      totalCost += Math.max(0, fileCost);
    });

    return totalCost;
  };
  const currentPrintPrice = calculatePrintPrice();

  // ===== HANDLERS =====

  // Print Handlers
  // Print Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileUpload[] = [];

      // Process all selected files
      for (let i = 0; i < e.target.files.length; i++) {
        const selectedFile = e.target.files[i];
        let pCount = 1;

        if (selectedFile.type === 'application/pdf') {
          try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pCount = pdf.numPages;
          } catch (error) {
            console.error('Error counting PDF pages:', error);
            pCount = 1;
          }
        }

        newFiles.push({
          id: `f-${Date.now()}-${i}`,
          file: selectedFile,
          pageCount: pCount,
          isPdf: selectedFile.type === 'application/pdf'
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const updateFilePageCount = (id: string, count: number) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, pageCount: count } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };
  const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Cart Handlers
  // Cart Handlers
  const addToCartPrint = () => {
    if (files.length === 0) return;

    const newItems: CartItem[] = files.map(f => {
      // Calculate per-file price for cart item
      // Reuse logic or simplify? Better to simplify for cart display
      // But we need accurate price.
      // Re-calculating for single file:
      const baseRate = options.colorMode === 'color' ? pricing.perPageColor : pricing.perPageBW;
      const paperMultiplier = pricing.paperSizeMultiplier[options.paperSize];
      let cost = f.pageCount * baseRate * options.copies * paperMultiplier;

      if (options.sides === 'double') cost -= (f.pageCount * pricing.doubleSidedDiscount * options.copies);
      if (pricing.paperTypeFees && pricing.paperTypeFees[options.paperType]) cost += (f.pageCount * pricing.paperTypeFees[options.paperType] * options.copies);
      if (pricing.bindingPrices[options.binding]) cost += (pricing.bindingPrices[options.binding] * options.copies);
      if (pricing.staplingPrices && pricing.staplingPrices[options.stapling]) cost += (pricing.staplingPrices[options.stapling] * options.copies);
      if (options.holePunch && pricing.holePunchPrice) cost += (pricing.holePunchPrice * options.copies);
      if (options.coverPage !== 'none' && pricing.coverPagePrice) {
        const sheets = options.coverPage === 'front_back' ? 2 : 1;
        cost += (sheets * pricing.coverPagePrice * options.copies);
      }
      cost += pricing.serviceFee;

      return {
        id: `print-${Date.now()}-${f.id}`,
        type: 'print',
        name: `Print: ${f.file.name}`,
        price: Math.max(0, cost),
        quantity: 1, // The "copies" are handled in options/price, so cart Qty is 1 "Job"
        // Print specific
        fileName: f.file.name,
        pageCount: f.pageCount,
        options: { ...options },
        file: f.file
      }
    });

    setCart(prev => [...prev, ...newItems]);
    setFiles([]); // Reset print form
    setIsCartOpen(true);
  };

  const addToCartProduct = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.type === 'product' && item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === existing.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock), price: product.price }
            : item
        );
      }
      return [...prev, {
        id: `prod-${product.id}-${Date.now()}`,
        type: 'product',
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Checkout Logic
  const handleCheckoutClick = () => {
    if (currentUser) {
      processCheckout({ name: currentUser.name, email: currentUser.email, id: currentUser.id });
    } else {
      // Force Sign In
      onSignInClick?.();
    }
  };

  const processCheckout = async (user: { name: string, email: string, id?: string }) => {
    setIsProcessingPayment(true);

    // 1. Upload Files First
    const updatedCart = [...cart];
    // We need to iterate and upload files for print items
    for (let i = 0; i < updatedCart.length; i++) {
      const item = updatedCart[i];
      if (item.type === 'print' && item.file) {
        try {
          const publicUrl = await uploadFile(item.file);
          if (!publicUrl) {
            alert(`Failed to upload file for item: ${item.name}`);
            setIsProcessingPayment(false);
            return;
          }
          // Update item with public URL
          updatedCart[i] = { ...item, fileUrl: publicUrl };
        } catch (e) {
          console.error("Upload error", e);
          alert("Error uploading file. Please try again.");
          setIsProcessingPayment(false);
          return;
        }
      }
    }

    const tokenNumber = generateOrderToken();
    const orderId = `ORD-${tokenNumber}-${Date.now()}`;

    await initiatePayment(
      {
        amount: cartTotal,
        orderId,
        description: `Order: ${updatedCart.length} items`,
        customerName: user.name,
        customerEmail: user.email,
      },
      (response) => {
        // Success
        const estimatedTime = new Date();
        estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);

        // Construct Unified Order with UPDATED CART (containing URLs)
        const newOrder: Order = {
          id: orderId,
          userId: user.id, // Optional
          userEmail: user.email,
          userName: user.name,
          type: 'mixed',
          items: updatedCart, // Use cart with fileUrls
          totalAmount: cartTotal,
          status: 'pending',
          paymentStatus: 'paid',
          paymentId: response.razorpay_payment_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create Order in Supabase
        createOrder(newOrder).then(result => {
          if (result.success) {
            // Show Confirmation
            setConfirmedOrder({
              id: orderId,
              tokenNumber,
              fileName: `Order (${updatedCart.length} items)`,
              pageCount: 0,
              options: options,
              totalAmount: cartTotal,
              status: 'pending',
              createdAt: new Date().toISOString(),
              estimatedReady: estimatedTime.toLocaleTimeString(),
              items: updatedCart
            });

            // order saved to DB.
            // ordersStorage.add(newOrder); // Local storage disabled

            setCart([]);
            setIsCartOpen(false);
            setIsProcessingPayment(false);
            setPaymentStatus('success');
          } else {
            console.error('Failed to save order:', result.error);
            setIsProcessingPayment(false);
            setPaymentStatus('error');
            alert('Payment successful but failed to save order. Please contact support.');
          }
        });
      },
      (error) => {
        console.error('Payment error', error);
        setIsProcessingPayment(false);
        setPaymentStatus('error');
      }
    );
  };

  const handleNavigation = (path: string) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                  <Icon name="print" className="text-2xl" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">{shopConfig.shopName}</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center gap-4">
              <button onClick={() => handleNavigation('/my-orders')} className="hidden sm:block px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                My Orders
              </button>
              <button onClick={() => handleNavigation('/support')} className="hidden sm:block px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Support
              </button>

              {/* Cart Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="View Cart"
              >
                <Icon name="shopping_cart" className="text-xl" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center size-5 bg-primary text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900">
                    {cart.length}
                  </span>
                )}
              </button>

              {!currentUser ? (
                <button
                  onClick={onSignInClick}
                  className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  title="Staff Login"
                >
                  <Icon name="lock" className="text-sm" />
                  <span className="hidden lg:inline">Staff</span>
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} className="size-7 rounded-full" alt="User" />
                  ) : (
                    <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <Icon name="person" className="text-primary text-sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-20">

        {/* Section 1: Upload & Print */}
        <section>
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Upload & Print Documents
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0">
              Upload your PDF, configure settings, and add to cart directly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Upload Area */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center w-full min-h-[160px] px-6 py-8 bg-surface-light dark:bg-surface-dark border-2 border-dashed ${files.length > 0 ? 'border-primary/50' : 'border-primary'} dark:border-primary/30 rounded-xl hover:border-primary transition-all cursor-pointer`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="application/pdf"
                  multiple
                  className="hidden"
                />
                <div className="size-12 mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Icon name="cloud_upload" className="text-3xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {files.length > 0 ? "Add more files" : "Upload your documents"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                  Drag & drop PDFs or click to browse
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Icon name="description" className="text-primary" />
                    Selected Files ({files.length})
                  </h3>
                  <div className="grid gap-4">
                    {files.map((f, index) => (
                      <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark animate-fade-in">
                        <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                          <Icon name="picture_as_pdf" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate" title={f.file.name}>{f.file.name}</h4>
                          <p className="text-xs text-slate-500">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Pages</label>
                            <input
                              type="number"
                              min="1"
                              value={f.pageCount}
                              onChange={(e) => updateFilePageCount(f.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-bold text-center"
                            />
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Icon name="delete" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global Options (Apply to All) */}
              {files.length > 0 && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 sm:p-8 space-y-8 animate-fade-in">
                  <h3 className="font-bold text-slate-900 dark:text-white border-b border-border-light dark:border-border-dark pb-4">
                    Print Settings (Applied to all files)
                  </h3>

                  {/* Basic Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Copies (per file)</label>
                      <input
                        type="number"
                        min="1"
                        value={isNaN(options.copies) ? '' : options.copies}
                        onChange={(e) => updateOption('copies', parseInt(e.target.value))}
                        onBlur={() => updateOption('copies', (isNaN(options.copies) || options.copies < 1 ? 1 : options.copies))}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg font-bold"
                      />
                    </div>
                    {/* Paper Size */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Paper Size</label>
                      <select value={options.paperSize} onChange={(e) => updateOption('paperSize', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="letter">Letter</option>
                        <option value="legal">Legal</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Color */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Color</label>
                      <select value={options.colorMode} onChange={(e) => updateOption('colorMode', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                        <option value="bw">B&W</option>
                        <option value="color">Color</option>
                      </select>
                    </div>
                    {/* Sides */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sides</label>
                      <select value={options.sides} onChange={(e) => updateOption('sides', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                      </select>
                    </div>
                    {/* Paper Type */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Paper Type</label>
                      <select value={options.paperType} onChange={(e) => updateOption('paperType', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                        <option value="normal">Normal</option>
                        <option value="bond">Bond (Thicker)</option>
                        <option value="glossy">Glossy</option>
                      </select>
                    </div>
                  </div>

                  {/* Finishing Options */}
                  <div className="pt-4 border-t border-border-light dark:border-border-dark">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Finishing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Binding */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Binding</label>
                        <select value={options.binding} onChange={(e) => updateOption('binding', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                          <option value="none">None</option>
                          <option value="spiral">Spiral Binding</option>
                          <option value="soft">Soft Cover</option>
                          <option value="hard">Hard Cover</option>
                        </select>
                      </div>
                      {/* Stapling */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Stapling</label>
                        <select value={options.stapling} onChange={(e) => updateOption('stapling', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                          <option value="none">None</option>
                          <option value="corner">Corner Staple</option>
                          <option value="side">Side Staple</option>
                        </select>
                      </div>
                      {/* Cover Page */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cover Page</label>
                        <select value={options.coverPage} onChange={(e) => updateOption('coverPage', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                          <option value="none">None</option>
                          <option value="front">Front Only</option>
                          <option value="front_back">Front & Back</option>
                        </select>
                      </div>
                    </div>
                    {/* Hole Punch Checkbox */}
                    <div className="mt-6 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="holePunch"
                        checked={options.holePunch}
                        onChange={(e) => updateOption('holePunch', e.target.checked)}
                        className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="holePunch" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Add Hole Punch generally
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart Panel */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-24 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pricing Summary</h3>
                {files.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>Upload files to estimate cost</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Estimated Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{currentPrintPrice.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                      {files.length} document{files.length !== 1 ? 's' : ''} with {files.reduce((acc, f) => acc + f.pageCount, 0)} total pages
                    </div>
                    <button
                      onClick={addToCartPrint}
                      disabled={files.length === 0 || isNaN(options.copies) || options.copies < 1}
                      className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon name="add_shopping_cart" />
                      Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border-light dark:border-border-dark" />

        {/* Section 2: Shop */}
        <section>
          <StudentShop onAddToCart={addToCartProduct} />
        </section>

      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-darker h-full shadow-2xl flex flex-col animate-slide-left">
            <div className="p-5 border-b border-slate-100 dark:border-border-dark flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="shopping_bag" />
                Your Cart ({cart.length})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Icon name="close" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-border-dark">
                    <div className="size-16 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                      {item.type === 'product' ? (item.image || <Icon name="inventory_2" />) : <Icon name="description" className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.type === 'print' ? `${item.pageCount} pgs • ${item.options.colorMode}` : `Qty: ${item.quantity}`}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-primary">₹{item.price * item.quantity}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-xs hover:underline">Remove</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-surface-dark">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Amount</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">₹{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckoutClick}
                disabled={cart.length === 0 || isProcessingPayment}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? "Processing..." : "Checkout"}
                <Icon name="arrow_forward" />
              </button>
            </div>



          </div>
        </div>
      )}

      {/* Confirmation Modal - Moved outside cart drawer so it stays visible after cart closes */}
      {confirmedOrder && (
        <OrderConfirmation
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
        />
      )}
    </div>
  );
};