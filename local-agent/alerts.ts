import { SupabaseClient } from "@supabase/supabase-js";

export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  unit: string;
}

/**
 * Check all inventory items and return those below threshold.
 */
export async function checkLowStock(client: SupabaseClient, shopId?: string): Promise<LowStockItem[]> {
  let query = client.from("Inventory").select("id, name, stock, threshold, unit");

  if (shopId) {
    query = query.eq("shopId", shopId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[Alerts] Failed to fetch inventory:", error?.message);
    return [];
  }

  const lowItems = data.filter((item: any) => item.stock <= item.threshold);

  if (lowItems.length > 0) {
    console.warn(`[Alerts] ⚠ ${lowItems.length} item(s) below threshold:`);
    for (const item of lowItems) {
      console.warn(`  - ${item.name}: ${item.stock} ${item.unit} (threshold: ${item.threshold})`);
    }
  }

  return lowItems as LowStockItem[];
}

/**
 * Periodic alert checker — call from main loop.
 */
export async function runAlertCheck(client: SupabaseClient, shopId?: string) {
  const lowItems = await checkLowStock(client, shopId);

  // Future: send email / push notification / webhook
  // For now, just console output
  if (lowItems.length > 0) {
    console.warn(`[Alerts] 🔔 Restock needed for ${lowItems.length} item(s)`);
  }
}
