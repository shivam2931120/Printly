// ===== VIEW MODE =====
export type ViewMode = 'student' | 'admin' | 'developer';

// ===== USER SESSION =====
export interface User {
  id: string;
  authId?: string; // Supabase Auth ID
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  isDeveloper?: boolean;
}

// ===== SHOP CONFIGURATION (Multi-tenant branding) =====
export interface ShopConfig {
  shopName: string;
  tagline: string;
  operatingHours: string;
  location: string;
  contact: string;
  email: string;
  logo?: string;
  primaryColor?: string;
  // Developer-controlled settings (not editable by shop admin)
  shopId: string;
  isActive: boolean;
  createdAt: string;
}

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'Printly',
  tagline: 'College Print Shop',
  operatingHours: '9:00 AM - 6:00 PM (Mon-Sat)',
  location: 'Main Campus, Building A, Room 102',
  contact: '+91 98765 43210',
  email: 'contact@printly.in',
  shopId: 'default',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// ===== PRINT OPTIONS =====
export interface PrintOptions {
  copies: number;
  paperSize: 'a4' | 'a3' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  colorMode: 'bw' | 'color';
  sides: 'single' | 'double';
  binding: 'none' | 'spiral' | 'soft' | 'hard';
  paperType: 'normal' | 'bond' | 'glossy';
  pageRangeText: string;
  holePunch: boolean;
  coverPage: 'none' | 'front' | 'front_back';
}

// ===== PRICING CONFIGURATION =====
export interface PricingConfig {
  perPageBW: number;
  perPageColor: number;
  doubleSidedDiscount: number; // per page discount
  bindingPrices: {
    none: number;
    spiral: number;
    soft: number;
    hard: number;
  };
  serviceFee: number;
  paperSizeMultiplier: {
    a4: number;
    a3: number;
    letter: number;
    legal: number;
  };
  paperTypeFees: {
    normal: number;
    bond: number;
    glossy: number;
  };
  holePunchPrice: number; // per file/job
  coverPagePrice: number; // per page (usually thicker paper)
}

export const DEFAULT_PRICING: PricingConfig = {
  perPageBW: 2,
  perPageColor: 10,
  doubleSidedDiscount: 0.5,
  bindingPrices: {
    none: 0,
    spiral: 25,
    soft: 60,
    hard: 150,
  },
  serviceFee: 5,
  paperSizeMultiplier: {
    a4: 1,
    a3: 2,
    letter: 1,
    legal: 1.5,
  },
  paperTypeFees: {
    normal: 0,
    bond: 2,
    glossy: 5,
  },
  holePunchPrice: 10,
  coverPagePrice: 15,
};

// ===== ORDER =====
export type OrderStatus = 'pending' | 'confirmed' | 'printing' | 'ready' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

// ===== CART & ORDER =====
export type CartItemType = 'product' | 'print';

export interface BaseCartItem {
  id: string; // Unique ID for valid React keys and removal
  type: CartItemType;
  price: number;
  quantity: number;
  name: string;
}

export interface ProductCartItem extends BaseCartItem {
  type: 'product';
  productId: string;
  image?: string;
}

export interface PrintCartItem extends BaseCartItem {
  type: 'print';
  file?: File; // In-memory only (not persisted reliably)
  fileUrl?: string; // For persistence/cloud
  fileName: string;
  fileSize?: string;
  options: PrintOptions;
  pageCount: number;
}

export type CartItem = ProductCartItem | PrintCartItem;

export interface Order {
  id: string;
  userId?: string; // Optional for guest orders
  userEmail: string;
  userName: string;

  // Unified items list
  items: CartItem[];
  type: 'mixed' | 'print' | 'product'; // 'mixed' is preferred for new orders

  // Retroactive support (optional)
  fileName?: string;
  pageCount?: number;
  options?: PrintOptions;

  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  orderToken?: string;
  otp?: string; // Random 6-digit OTP for pickup
  shopId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== PRODUCT CATALOG =====
export type ProductCategory = 'stationery' | 'writing' | 'art' | 'exam';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image?: string;
  isActive: boolean;
}

export const PRODUCT_CATEGORIES: { id: ProductCategory; name: string; icon: string }[] = [
  { id: 'stationery', name: 'Stationery', icon: 'menu_book' },
  { id: 'writing', name: 'Writing Instruments', icon: 'edit' },
  { id: 'art', name: 'Art & Drafting', icon: 'brush' },
  { id: 'exam', name: 'Exam Essentials', icon: 'quiz' },
];

// ===== SERVICES =====
export type ServiceCategory = 'binding' | 'lamination' | 'idcard' | 'merchandise' | 'poster';

export interface ServiceVariant {
  name: string;
  price: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  basePrice: number;
  variants: ServiceVariant[];
  isActive: boolean;
}

export const SERVICE_CATEGORIES: { id: ServiceCategory; name: string; icon: string }[] = [
  { id: 'binding', name: 'Binding', icon: 'book' },
  { id: 'lamination', name: 'Lamination', icon: 'layers' },
  { id: 'idcard', name: 'ID Cards', icon: 'badge' },
  { id: 'merchandise', name: 'Merchandise', icon: 'storefront' },
  { id: 'poster', name: 'Posters & Banners', icon: 'image' },
];