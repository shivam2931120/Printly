-- Migration: Create BiometricDevice table for multi-device biometric sync
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public."BiometricDevice" (
    id TEXT PRIMARY KEY,  -- Device fingerprint (UUID)
    "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "deviceName" TEXT NOT NULL DEFAULT 'Unknown Device',
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "lastUsed" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_biometric_device_user_id
    ON public."BiometricDevice"("userId");

-- RLS policies
ALTER TABLE public."BiometricDevice" ENABLE ROW LEVEL SECURITY;

-- Users can read their own devices
CREATE POLICY "Users can view own devices"
    ON public."BiometricDevice"
    FOR SELECT
    USING (true);

-- Users can insert their own devices
CREATE POLICY "Users can register devices"
    ON public."BiometricDevice"
    FOR INSERT
    WITH CHECK (true);

-- Users can update their own devices
CREATE POLICY "Users can update own devices"
    ON public."BiometricDevice"
    FOR UPDATE
    USING (true);

-- Users can delete their own devices
CREATE POLICY "Users can remove own devices"
    ON public."BiometricDevice"
    FOR DELETE
    USING (true);
