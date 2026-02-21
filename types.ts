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
  directionsUrl?: string;
  mapEmbed?: string;
  // Developer-controlled settings (not editable by shop admin)
  shopId: string;
  isActive: boolean;
  createdAt: string;
}

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'Printly',
  tagline: 'College Print Shop',
  operatingHours: '9:00 AM - 6:00 PM (Mon-Sat)',
  location: 'Akshaya RVITM Hostel, Bangalore',
  contact: '+91 8618719375',
  email: 'shivam.bgp@outlook.com',
  directionsUrl: 'https://maps.app.goo.gl/94RRjuc1whqWUmWQ7',
  mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.7011850547046!2d77.57056058243771!3d12.86256658490096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae6bcd0e5f7aa9%3A0x6505152e96e305c7!2sAkshaya%20RVITM%20Hostel!5e0!3m2!1sen!2sin!4v1771305566041!5m2!1sen!2sin',
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
  userId?: string;    // DB User table primary key
  clerkId?: string;   // Clerk user ID (auth.id from Clerk) — for tracing
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

export const DEFAULT_SERVICES: Service[] = [
  { id: 'svc-binding-spiral', name: 'Spiral Binding', description: 'Coil binding for easy page turning', category: 'binding', basePrice: 25, variants: [{ name: 'Up to 50 pages', price: 25 }, { name: '51–100 pages', price: 35 }, { name: '101–200 pages', price: 50 }], isActive: true },
  { id: 'svc-binding-soft', name: 'Soft Cover Binding', description: 'Thermal glue binding with soft cover', category: 'binding', basePrice: 60, variants: [{ name: 'Up to 100 pages', price: 60 }, { name: '101–200 pages', price: 80 }], isActive: true },
  { id: 'svc-binding-hard', name: 'Hard Cover Binding', description: 'Premium hard cover binding', category: 'binding', basePrice: 150, variants: [{ name: 'Standard', price: 150 }, { name: 'Embossed', price: 200 }], isActive: true },
  { id: 'svc-lam-a4', name: 'A4 Lamination', description: 'Hot lamination for A4 sheets', category: 'lamination', basePrice: 10, variants: [{ name: 'Single side', price: 10 }, { name: 'Double side', price: 18 }], isActive: true },
  { id: 'svc-lam-a3', name: 'A3 Lamination', description: 'Hot lamination for A3 sheets', category: 'lamination', basePrice: 18, variants: [{ name: 'Single side', price: 18 }, { name: 'Double side', price: 30 }], isActive: true },
  { id: 'svc-id-basic', name: 'ID Card Printing', description: 'CR80 ID card with custom design', category: 'idcard', basePrice: 50, variants: [{ name: 'Single sided', price: 50 }, { name: 'Double sided', price: 70 }], isActive: true },
  { id: 'svc-poster-a3', name: 'A3 Poster Print', description: 'Full colour A3 poster on glossy paper', category: 'poster', basePrice: 80, variants: [{ name: 'Matte finish', price: 80 }, { name: 'Glossy finish', price: 100 }], isActive: true },
  { id: 'svc-poster-a2', name: 'A2 Poster Print', description: 'Full colour A2 poster on glossy paper', category: 'poster', basePrice: 150, variants: [{ name: 'Matte finish', price: 150 }, { name: 'Glossy finish', price: 180 }], isActive: false },
];