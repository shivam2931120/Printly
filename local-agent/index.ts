import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { processOrder } from "./processor";
import { runAlertCheck } from "./alerts";
import { config } from "./config";

let supabase: SupabaseClient;

async function main() {
  console.log("[Agent] Starting Printly Local Inventory Agent...");

  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

  // Poll for unprocessed orders
  console.log(`[Agent] Polling every ${config.POLL_INTERVAL_MS / 1000}s`);

  setInterval(async () => {
    try {
      await pollOrders(supabase);
    } catch (err) {
      console.error("[Agent] Poll error:", err);
    }
  }, config.POLL_INTERVAL_MS);

  // Run low-stock alert check every 60s
  setInterval(async () => {
    try {
      await runAlertCheck(supabase);
    } catch (err) {
      console.error("[Agent] Alert check error:", err);
    }
  }, 60_000);

  // Also run immediately on start
  await pollOrders(supabase);
  await runAlertCheck(supabase);
}

async function pollOrders(client: SupabaseClient) {
  // Fetch orders that are confirmed/printing but not yet inventory-processed
  // We use a metadata flag "inventoryProcessed" to track
  const { data: orders, error } = await client
    .from("Order")
    .select("*")
    .in("status", config.TRIGGER_STATUSES)
    .is("inventoryProcessed", null)
    .order("createdAt", { ascending: true })
    .limit(config.BATCH_SIZE);

  if (error) {
    console.error("[Agent] Fetch error:", error.message);
    return;
  }

  if (!orders || orders.length === 0) return;

  console.log(`[Agent] Found ${orders.length} order(s) to process`);

  for (const order of orders) {
    try {
      await processOrder(client, order);

      // Mark order as inventory-processed (idempotency flag)
      await client
        .from("Order")
        .update({ inventoryProcessed: true })
        .eq("id", order.id);

      console.log(`[Agent] ✓ Order ${order.id} processed`);
    } catch (err) {
      console.error(`[Agent] ✗ Order ${order.id} failed:`, err);
    }
  }
}

main().catch(console.error);
