-- Postgres DDL for current Prisma models
-- Run against your target database to create enums and tables

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'DEVELOPER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PRINTING', 'READY', 'COMPLETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "Shop" (
  "id" TEXT PRIMARY KEY,
  "shopName" TEXT NOT NULL,
  "tagline" TEXT NOT NULL DEFAULT 'Print Shop',
  "operatingHours" TEXT NOT NULL DEFAULT '9:00 AM - 6:00 PM',
  "location" TEXT NOT NULL DEFAULT '',
  "contact" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "logo" TEXT,
  "primaryColor" TEXT,
  "pricingConfig" JSONB,
  "shopConfig" JSONB,
  "servicesConfig" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "authId" TEXT UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "avatar" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "password" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shopId" TEXT,
  CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "stock" INTEGER NOT NULL,
  "image" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shopId" TEXT,
  CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT PRIMARY KEY,
  "orderToken" TEXT NOT NULL UNIQUE,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "paymentId" TEXT,
  "razorpayOrderId" TEXT,
  "clerkId" TEXT,
  "userEmail" TEXT,
  "userName" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "inventoryProcessed" BOOLEAN,
  "cancelRequested" BOOLEAN NOT NULL DEFAULT FALSE,
  "cancelReason" TEXT,
  "cancelRequestedAt" TIMESTAMPTZ,
  "printJobStatus" TEXT,
  "printJobError" TEXT,
  "printJobAttempts" INTEGER NOT NULL DEFAULT 0,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "shopId" TEXT,
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Inventory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'pieces',
  "threshold" INTEGER NOT NULL DEFAULT 10,
  "shopId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StockLog" (
  "id" TEXT PRIMARY KEY,
  "amount" INTEGER NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inventoryId" TEXT NOT NULL,
  CONSTRAINT "StockLog_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "tableName" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "oldData" JSONB,
  "newData" JSONB,
  "changedBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
