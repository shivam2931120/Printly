import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { processOrder } from "./processor";
import { runAlertCheck } from "./alerts";
import { config, validateConfig } from "./config";

let supabase: SupabaseClient;
let isPolling = false;
let isCheckingAlerts = false;

async function main() {
  console.log("[Agent] Starting Printly Local Inventory Agent...");
  validateConfig();

  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

  // Poll for unprocessed orders
  console.log(`[Agent] Polling every ${config.POLL_INTERVAL_MS / 1000}s`);
  if (config.SHOP_ID) {
    console.log(`[Agent] Shop scope: ${config.SHOP_ID}`);
  }

  const runPollOnce = async () => {
    if (isPolling) {
      console.warn("[Agent] Previous poll still running; skipping this interval");
      return;
    }
    isPolling = true;
    try {
      await pollOrders(supabase);
    } catch (err) {
      console.error("[Agent] Poll error:", err);
    } finally {
      isPolling = false;
    }
  };

  // Run low-stock alert check every 60s
  const runAlertCheckOnce = async () => {
    if (isCheckingAlerts) return;
    isCheckingAlerts = true;
    try {
      await runAlertCheck(supabase, config.SHOP_ID || undefined);
    } catch (err) {
      console.error("[Agent] Alert check error:", err);
    } finally {
      isCheckingAlerts = false;
    }
  };

  setInterval(runPollOnce, config.POLL_INTERVAL_MS);
  setInterval(runAlertCheckOnce, 60_000);

  // Also run immediately on start
  await runPollOnce();
  await runAlertCheckOnce();
}

async function pollOrders(client: SupabaseClient) {
  // Fetch orders that are confirmed/printing but not yet inventory-processed
  // We use a metadata flag "inventoryProcessed" to track
  let query = client
    .from("Order")
    .select("*")
    .in("status", config.TRIGGER_STATUSES)
    .or("inventoryProcessed.is.null,inventoryProcessed.eq.false,printJobStatus.eq.failed")
    .lt("printJobAttempts", config.MAX_JOB_ATTEMPTS)
    .order("createdAt", { ascending: true })
    .limit(config.BATCH_SIZE);

  if (config.SHOP_ID) {
    query = query.eq("shopId", config.SHOP_ID);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error("[Agent] Fetch error:", error.message);
    return;
  }

  if (!orders || orders.length === 0) return;

  console.log(`[Agent] Found ${orders.length} order(s) to process`);

  for (const order of orders) {
    const attempts = Number(order.printJobAttempts || 0) + 1;
    try {
      await client
        .from("Order")
        .update({
          printJobStatus: "running",
          printJobAttempts: attempts,
          printJobError: null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", order.id);

      await processOrder(client, order);

      // Mark order as inventory-processed (idempotency flag)
      await client
        .from("Order")
        .update({
          inventoryProcessed: true,
          printJobStatus: "completed",
          printJobError: null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log(`[Agent] ✓ Order ${order.id} processed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await client
        .from("Order")
        .update({
          printJobStatus: "failed",
          printJobError: message.slice(0, 500),
          printJobAttempts: attempts,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", order.id);
      console.error(`[Agent] ✗ Order ${order.id} failed:`, message);
    }
  }
}

main().catch(console.error);
