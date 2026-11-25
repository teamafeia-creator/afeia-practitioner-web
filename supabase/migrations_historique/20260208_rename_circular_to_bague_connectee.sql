-- Migration: Rename "circular" columns to "bague_connectee"
-- Date: 2026-02-08
-- Description: Rebranding from "Circular" (vendor name) to "Bague connectée" (generic French term)

-- Rename columns in the consultants table (or consultants_identity view source)
ALTER TABLE IF EXISTS consultants RENAME COLUMN circular_enabled TO bague_connectee_enabled;
ALTER TABLE IF EXISTS consultants RENAME COLUMN last_circular_sync_at TO last_bague_connectee_sync_at;
ALTER TABLE IF EXISTS consultants RENAME COLUMN last_circular_sync_status TO last_bague_connectee_sync_status;

-- Rename the has_circular_ring column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultants' AND column_name = 'has_circular_ring'
  ) THEN
    ALTER TABLE consultants RENAME COLUMN has_circular_ring TO has_bague_connectee;
  END IF;
END $$;

-- Rename the RPC function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'admin_trigger_circular_sync'
  ) THEN
    ALTER FUNCTION admin_trigger_circular_sync(uuid) RENAME TO admin_trigger_bague_connectee_sync;
  END IF;
END $$;

-- Rename the circular_integration column in subscription_plans if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'circular_integration'
  ) THEN
    ALTER TABLE subscription_plans RENAME COLUMN circular_integration TO bague_connectee_integration;
  END IF;
END $$;

-- Update notification type values from 'circular' to 'bague_connectee'
UPDATE notifications SET type = 'bague_connectee' WHERE type = 'circular';
