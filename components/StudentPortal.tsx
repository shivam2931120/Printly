import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';
import { PrintOptions, PricingConfig, DEFAULT_PRICING, User, ShopConfig, DEFAULT_SHOP_CONFIG } from '../types';
import { initiatePayment } from '../services/razorpay';
import { OrderConfirmation, generateOrderToken } from './user/OrderConfirmation';

// Order type for confirmed orders
interface ConfirmedOrder {
  id: string;
  tokenNumber: string;
  fileName: string;
  pageCount: number;
  options: PrintOptions;
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedReady?: string;
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
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load shop config
  useEffect(() => {
    const stored = localStorage.getItem('printwise_shop_config');
    if (stored) {
      try {
        setShopConfig({ ...DEFAULT_SHOP_CONFIG, ...JSON.parse(stored) });
      } catch (e) {
        console.error('Failed to parse shop config:', e);
      }
    }
  }, []);

  const [options, setOptions] = useState<PrintOptions>({
    copies: 1,
    paperSize: 'a4',
    orientation: 'portrait',
    colorMode: 'bw',
    sides: 'double',
    binding: 'none'
  });

  const [totalPrice, setTotalPrice] = useState(0);

  // Calculate price based on pricing config
  useEffect(() => {
    if (!file || pageCount < 1) {
      setTotalPrice(0);
      return;
    }

    const baseRate = options.colorMode === 'color' ? pricing.perPageColor : pricing.perPageBW;
    const paperMultiplier = pricing.paperSizeMultiplier[options.paperSize];
    let cost = pageCount * baseRate * options.copies * paperMultiplier;

    // Double-sided discount
    if (options.sides === 'double') {
      cost -= (pageCount * pricing.doubleSidedDiscount * options.copies);
    }

    // Binding
    cost += pricing.bindingPrices[options.binding];

    // Service fees
    cost += pricing.serviceFee;

    setTotalPrice(Math.max(0, cost));
  }, [options, file, pageCount, pricing]);

  const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setPageCount(1); // Reset to 1, user will input actual count
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPageCount(1);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleNavigation = (page: PageView) => {
    setIsMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handlePayment = async () => {
    if (!file || !currentUser) {
      if (!currentUser && onSignInClick) {
        onSignInClick();
      }
      return;
    }

    setIsProcessingPayment(true);
    setPaymentStatus('idle');

    const tokenNumber = generateOrderToken();
    const orderId = `ORD-${tokenNumber}-${Date.now()}`;

    await initiatePayment(
      {
        amount: totalPrice,
        orderId,
        description: `Print Order: ${file.name} (${pageCount} pages)`,
        customerName: currentUser.name,
        customerEmail: currentUser.email,
      },
      (response) => {
        console.log('Payment successful:', response);
        setPaymentStatus('success');
        setIsProcessingPayment(false);

        // Calculate estimated ready time (30 mins from now)
        const estimatedTime = new Date();
        estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);
        const estimatedReady = estimatedTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Create order with token number
        const order: ConfirmedOrder = {
          id: orderId,
          tokenNumber,
          fileName: file.name,
          pageCount,
          options: { ...options },
          totalAmount: totalPrice,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          estimatedReady,
        };

        // Save order to localStorage with user info
        const orderForStorage = {
          ...order,
          paymentId: response.razorpay_payment_id,
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
        };
        const existingOrders = JSON.parse(localStorage.getItem('printwise_orders') || '[]');
        localStorage.setItem('printwise_orders', JSON.stringify([orderForStorage, ...existingOrders]));

        // Show confirmation modal
        setConfirmedOrder(order);
      },
      (error) => {
        console.error('Payment error:', error);
        setPaymentStatus('error');
        setIsProcessingPayment(false);
      }
    );
  };

  const handleConfirmationClose = () => {
    setConfirmedOrder(null);
    setFile(null);
    setPageCount(1);
    setPaymentStatus('idle');
  };

  const handleViewOrders = () => {
    setConfirmedOrder(null);
    setFile(null);
    setPageCount(1);
    setPaymentStatus('idle');
    if (onNavigate) {
      onNavigate('orders');
    }
  };

  const fileSizeFormatted = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '';

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <Icon name="print" className="text-2xl" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{shopConfig.shopName}</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-4">
              <button
                onClick={() => handleNavigation('orders')}
                className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                My Orders
              </button>
              <button
                onClick={() => handleNavigation('support')}
                className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Support
              </button>

              {!currentUser ? (
                <button
                  onClick={onSignInClick}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
                >
                  <Icon name="login" />
                  Sign In
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Hi, {currentUser.name.split(' ')[0]}
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 p-2"
            >
              <Icon name={isMobileMenuOpen ? "close" : "menu"} className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 space-y-3">
            {!currentUser ? (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onSignInClick?.(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                <Icon name="login" />
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="person" className="text-primary" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {currentUser.name}
                </span>
              </div>
            )}
            <div className="space-y-1 pt-2">
              <button
                onClick={() => handleNavigation('orders')}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon name="receipt_long" className="text-slate-500" />
                My Orders
              </button>
              <button
                onClick={() => handleNavigation('support')}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon name="support_agent" className="text-slate-500" />
                Support
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Success Message */}
      {paymentStatus === 'success' && (
        <div className="bg-green-500 text-white px-4 py-3 text-center">
          <Icon name="check_circle" className="mr-2" />
          Payment successful! Your order has been placed.
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-10 text-center lg:text-left">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
            Upload & Print Documents
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0">
            Fast, affordable printing for students. Upload your PDF, set the page count, and pay securely.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Upload & Options */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileUpload}
              className="group relative flex flex-col items-center justify-center w-full min-h-[240px] px-6 py-12 bg-surface-light dark:bg-surface-dark border-2 border-dashed border-primary/30 dark:border-primary/20 rounded-xl hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/5 transition-all cursor-pointer"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />
              <div className="size-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Icon name="cloud_upload" className="text-4xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Upload your PDF</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center max-w-xs">
                Drag & drop files here or click to browse (Max 50MB)
              </p>
              <span className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-hover transition-colors">
                Select PDF
              </span>
            </div>

            {/* Page Count Input - Shown after file upload */}
            {file && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <Icon name="picture_as_pdf" className="text-2xl text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{fileSizeFormatted}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <Icon name="description" className="text-primary mr-1 align-middle" />
                    How many pages do you want to print?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={pageCount}
                    onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-2xl font-bold text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Enter page count"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Enter the exact number of pages you want to print
                  </p>
                </div>
              </div>
            )}

            {/* Printing Options */}
            <div className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 sm:p-8 space-y-8 transition-all duration-300 ${!file ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="tune" className="text-primary" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Printing Options</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Copies */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Number of Copies</label>
                  <div className="flex items-center justify-between p-1 bg-background-light dark:bg-background-dark rounded-lg border border-transparent focus-within:border-primary">
                    <button
                      onClick={() => updateOption('copies', Math.max(1, options.copies - 1))}
                      className="flex items-center justify-center w-10 h-10 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
                    >
                      <Icon name="remove" className="text-xl" />
                    </button>
                    <input
                      className="w-16 text-center bg-transparent border-none text-slate-900 dark:text-white font-bold focus:ring-0 p-0"
                      type="number"
                      min="1"
                      max="100"
                      value={options.copies}
                      onChange={(e) => updateOption('copies', parseInt(e.target.value) || 1)}
                    />
                    <button
                      onClick={() => updateOption('copies', options.copies + 1)}
                      className="flex items-center justify-center w-10 h-10 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
                    >
                      <Icon name="add" className="text-xl" />
                    </button>
                  </div>
                </div>

                {/* Paper Size */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Paper Size</label>
                  <div className="relative">
                    <select
                      value={options.paperSize}
                      onChange={(e) => updateOption('paperSize', e.target.value as any)}
                      className="w-full p-3 pl-4 pr-10 bg-background-light dark:bg-background-dark border-none rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="a4">A4 (Standard)</option>
                      <option value="a3">A3 (Large)</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                      <Icon name="expand_more" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Color Mode</label>
                <div className="flex p-1 bg-background-light dark:bg-background-dark rounded-lg">
                  <label className="flex-1 relative cursor-pointer group">
                    <input
                      type="radio"
                      name="color_mode"
                      value="bw"
                      checked={options.colorMode === 'bw'}
                      onChange={() => updateOption('colorMode', 'bw')}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm">
                      <Icon name="ink_highlighter" className="text-[18px]" />
                      B&W (₹{pricing.perPageBW}/pg)
                    </div>
                  </label>
                  <label className="flex-1 relative cursor-pointer group">
                    <input
                      type="radio"
                      name="color_mode"
                      value="color"
                      checked={options.colorMode === 'color'}
                      onChange={() => updateOption('colorMode', 'color')}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm">
                      <Icon name="palette" className="text-[18px] text-pink-500" />
                      Color (₹{pricing.perPageColor}/pg)
                    </div>
                  </label>
                </div>
              </div>

              {/* Print Sides */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Print Sides</label>
                <div className="flex p-1 bg-background-light dark:bg-background-dark rounded-lg">
                  <label className="flex-1 relative cursor-pointer group">
                    <input
                      type="radio"
                      name="sides"
                      value="single"
                      checked={options.sides === 'single'}
                      onChange={() => updateOption('sides', 'single')}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm">
                      <Icon name="note" className="text-[18px]" />
                      Single-sided
                    </div>
                  </label>
                  <label className="flex-1 relative cursor-pointer group">
                    <input
                      type="radio"
                      name="sides"
                      value="double"
                      checked={options.sides === 'double'}
                      onChange={() => updateOption('sides', 'double')}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-slate-900 dark:peer-checked:text-white peer-checked:shadow-sm">
                      <Icon name="description" className="text-[18px]" />
                      Double-sided
                    </div>
                  </label>
                </div>
              </div>

              {/* Binding Type */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Binding Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { val: 'none', label: 'No Binding', icon: 'do_not_disturb_on', price: pricing.bindingPrices.none },
                    { val: 'spiral', label: 'Spiral', icon: 'format_list_bulleted', price: pricing.bindingPrices.spiral },
                    { val: 'soft', label: 'Soft Cover', icon: 'menu_book', price: pricing.bindingPrices.soft },
                    { val: 'hard', label: 'Hard Cover', icon: 'book', price: pricing.bindingPrices.hard }
                  ].map((item) => (
                    <label key={item.val} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="binding"
                        value={item.val}
                        checked={options.binding === item.val}
                        onChange={() => updateOption('binding', item.val as any)}
                        className="peer sr-only"
                      />
                      <div className="h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-transparent bg-background-light dark:bg-background-dark hover:bg-slate-100 dark:hover:bg-slate-800 peer-checked:border-primary peer-checked:bg-primary/5 dark:peer-checked:bg-primary/10 transition-all">
                        <Icon name={item.icon} className="text-2xl mb-2 text-slate-400 peer-checked:text-primary" />
                        <span className="font-medium text-xs text-slate-700 dark:text-slate-200 text-center">
                          {item.label}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          {item.price === 0 ? 'Free' : `₹${item.price}`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review your order details</p>
                </div>
                <div className="p-6 space-y-4">
                  {!file ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Icon name="upload_file" className="text-4xl mb-2" />
                      <p className="text-sm">Upload a file to see pricing</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                        <div className="text-red-500 shrink-0">
                          <Icon name="picture_as_pdf" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{pageCount} Pages • {fileSizeFormatted}</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <SummaryRow label="Pages" value={pageCount.toString()} />
                        <SummaryRow label="Copies" value={options.copies.toString()} />
                        <SummaryRow label="Paper Size" value={options.paperSize.toUpperCase()} />
                        <SummaryRow
                          label={`${options.colorMode === 'bw' ? 'B&W' : 'Color'} Print`}
                          value={`₹${(pageCount * (options.colorMode === 'bw' ? pricing.perPageBW : pricing.perPageColor) * options.copies * pricing.paperSizeMultiplier[options.paperSize]).toFixed(2)}`}
                        />
                        {options.sides === 'double' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Double-sided discount</span>
                            <span className="font-medium text-green-600 dark:text-green-400">-₹{(pageCount * pricing.doubleSidedDiscount * options.copies).toFixed(2)}</span>
                          </div>
                        )}
                        <SummaryRow label="Binding" value={`₹${pricing.bindingPrices[options.binding].toFixed(2)}`} />
                        <SummaryRow label="Service Fee" value={`₹${pricing.serviceFee.toFixed(2)}`} />
                      </div>

                      <div className="border-t border-dashed border-border-light dark:border-border-dark my-2"></div>

                      <div className="flex justify-between items-end">
                        <span className="text-base font-bold text-slate-700 dark:text-slate-200">Total</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          ₹{totalPrice.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={handlePayment}
                        disabled={isProcessingPayment || pageCount < 1}
                        className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-3.5 rounded-lg bg-primary text-white font-bold text-base shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <span>Pay with Razorpay</span>
                            <Icon name="arrow_forward" className="text-[20px]" />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2 flex items-center justify-center gap-1">
                        <Icon name="lock" className="text-xs" />
                        Secure payment via Razorpay
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Support Card */}
              <div
                onClick={() => handleNavigation('support')}
                className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  <Icon name="support_agent" className="text-primary" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need help?</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Contact support for any issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Order Confirmation Modal */}
      {confirmedOrder && (
        <OrderConfirmation
          order={confirmedOrder}
          onClose={handleConfirmationClose}
          onViewOrders={handleViewOrders}
        />
      )}
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-600 dark:text-slate-400">{label}</span>
    <span className="font-medium text-slate-900 dark:text-white">{value}</span>
  </div>
);