import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';
import { PrintOptions, PricingConfig, DEFAULT_PRICING, User, ShopConfig, DEFAULT_SHOP_CONFIG, Order, CartItem, Product } from '../types';
import { StudentShop } from './student/StudentShop';
import { initiatePayment } from '../services/razorpay';
import { createOrder } from '../services/data';
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
  onNavigate?: (page: PageView) => void;
  currentUser?: User | null;
  onSignInClick?: () => void;
  pricing?: PricingConfig;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onNavigate,
  currentUser,
  onSignInClick,
  pricing = DEFAULT_PRICING
}) => {
  // ===== SHARED STATE =====
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ===== PRINT STATE (Current Job) =====
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [options, setOptions] = useState<PrintOptions>({
    copies: 1,
    paperSize: 'a4',
    orientation: 'portrait',
    colorMode: 'bw',
    sides: 'double',
    binding: 'none'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== CHECKOUT STATE =====
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

  // Guest Checkout State
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [guestDetails, setGuestDetails] = useState({ name: '', email: '' });

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
  const calculatePrintPrice = () => {
    if (!file || isNaN(pageCount) || pageCount < 1 || isNaN(options.copies) || options.copies < 1) return 0;
    const baseRate = options.colorMode === 'color' ? pricing.perPageColor : pricing.perPageBW;
    const paperMultiplier = pricing.paperSizeMultiplier[options.paperSize];
    let cost = pageCount * baseRate * options.copies * paperMultiplier;
    if (options.sides === 'double') cost -= (pageCount * pricing.doubleSidedDiscount * options.copies);
    cost += pricing.bindingPrices[options.binding];
    cost += pricing.serviceFee;
    return Math.max(0, cost);
  };
  const currentPrintPrice = calculatePrintPrice();

  // ===== HANDLERS =====

  // Print Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPageCount(1);
    }
  };
  const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Cart Handlers
  const addToCartPrint = () => {
    if (!file) return;
    const newItem: CartItem = {
      id: `print-${Date.now()}`,
      type: 'print',
      name: `Print: ${file.name}`,
      price: currentPrintPrice,
      quantity: 1,
      // Print specific
      fileName: file.name,
      pageCount: pageCount,
      options: { ...options },
      file: file // Note: In-memory only
    };
    setCart(prev => [...prev, newItem]);
    setFile(null); // Reset print form
    setPageCount(1);
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
      setShowGuestDetails(true);
    }
  };

  const processCheckout = async (user: { name: string, email: string, id?: string }) => {
    setIsProcessingPayment(true);
    const tokenNumber = generateOrderToken();
    const orderId = `ORD-${tokenNumber}-${Date.now()}`;

    await initiatePayment(
      {
        amount: cartTotal,
        orderId,
        description: `Order: ${cart.length} items`,
        customerName: user.name,
        customerEmail: user.email,
      },
      (response) => {
        // Success
        const estimatedTime = new Date();
        estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);

        // Construct Unified Order
        const newOrder: Order = {
          id: orderId,
          userId: user.id, // Optional
          userEmail: user.email,
          userName: user.name,
          type: 'mixed',
          items: cart,
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
              fileName: `Order (${cart.length} items)`,
              pageCount: 0,
              options: options,
              totalAmount: cartTotal,
              status: 'pending',
              createdAt: new Date().toISOString(),
              estimatedReady: estimatedTime.toLocaleTimeString(),
              items: cart
            });

            // order saved to DB.
            // ordersStorage.add(newOrder); // Local storage disabled

            setCart([]);
            setIsCartOpen(false);
            setShowGuestDetails(false);
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

  const handleNavigation = (page: PageView) => {
    setIsMobileMenuOpen(false);
    onNavigate?.(page);
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
              <button onClick={() => handleNavigation('orders')} className="hidden sm:block px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                My Orders
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
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center w-full min-h-[240px] px-6 py-12 bg-surface-light dark:bg-surface-dark border-2 border-dashed ${file ? 'border-primary bg-primary/5' : 'border-primary/30'} dark:border-primary/20 rounded-xl hover:border-primary transition-all cursor-pointer`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="application/pdf"
                  className="hidden"
                />
                <div className="size-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Icon name={file ? "check_circle" : "cloud_upload"} className="text-4xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {file ? file.name : "Upload your PDF"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center max-w-xs">
                  {file ? "File selected. Configure options below." : "Drag & drop files here or click to browse"}
                </p>
              </div>

              {/* Options */}
              {file && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 sm:p-8 space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Page Count */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Page Count</label>
                      <input
                        type="number"
                        min="1"
                        value={isNaN(pageCount) ? '' : pageCount}
                        onChange={(e) => setPageCount(parseInt(e.target.value))}
                        onBlur={() => setPageCount(prev => (isNaN(prev) || prev < 1 ? 1 : prev))}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg font-bold"
                      />
                    </div>
                    {/* Copies */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Copies</label>
                      <input
                        type="number"
                        min="1"
                        value={isNaN(options.copies) ? '' : options.copies}
                        onChange={(e) => updateOption('copies', parseInt(e.target.value))}
                        onBlur={() => updateOption('copies', (isNaN(options.copies) || options.copies < 1 ? 1 : options.copies))}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Paper Size */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Paper Size</label>
                      <select value={options.paperSize} onChange={(e) => updateOption('paperSize', e.target.value as any)} className="w-full p-3 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary">
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                      </select>
                    </div>
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
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart Panel */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-24 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pricing Summary</h3>
                {!file ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>Upload a file to estimate cost</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Estimated Cost</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{currentPrintPrice.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={addToCartPrint}
                      disabled={isNaN(pageCount) || pageCount < 1 || isNaN(options.copies) || options.copies < 1}
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

            {/* Guest Details Modal - Inside Cart Drawer or overlaid */}
            {showGuestDetails && (
              <div className="absolute inset-0 bg-white dark:bg-surface-darker z-10 flex flex-col p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guest Checkout</h3>
                  <button onClick={() => setShowGuestDetails(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Icon name="close" />
                  </button>
                </div>

                <div className="space-y-6 flex-1">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Please provide your details for the order receipt and tracking.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={guestDetails.name}
                        onChange={(e) => setGuestDetails(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={guestDetails.email}
                        onChange={(e) => setGuestDetails(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. john@example.com"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => processCheckout(guestDetails)}
                    disabled={!guestDetails.name || !guestDetails.email || isProcessingPayment}
                    className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-8"
                  >
                    {isProcessingPayment ? "Processing..." : "Pay & Order"}
                    <Icon name="payment" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmedOrder && (
        <OrderConfirmation
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
          onViewOrders={() => handleNavigation('orders')}
        />
      )}
    </div>
  );
};