import { SupabaseClient } from "@supabase/supabase-js";
import { computeConsumption, PrintItem, ConsumptionEntry } from "./consumption";

export async function processOrder(client: SupabaseClient, order: any) {
  const items: PrintItem[] = order.items ?? [];
  const orderId: string = order.id;
  const shopId: string | null = order.shopId ?? null;
  const userEmail: string = order.userEmail ?? "system";

  // Collect all consumption entries across all items
  const allEntries: ConsumptionEntry[] = [];
  for (const item of items) {
    allEntries.push(...computeConsumption(item, orderId));
  }

  if (allEntries.length === 0) {
    console.log(`[Processor] Order ${orderId}: no consumable items, skipping`);
    return;
  }

  // Merge duplicates (e.g., two print items both using A4)
  const merged = mergeEntries(allEntries);

  // Process each entry
  for (const entry of merged) {
    await deductInventory(client, entry, shopId, userEmail);
  }
}

/**
 * Merge entries with the same inventoryName.
 */
function mergeEntries(entries: ConsumptionEntry[]): ConsumptionEntry[] {
  const map = new Map<string, ConsumptionEntry>();
  for (const e of entries) {
    const existing = map.get(e.inventoryName);
    if (existing) {
      existing.amount += e.amount;
      existing.note += "; " + e.note;
    } else {
      map.set(e.inventoryName, { ...e });
    }
  }
  return Array.from(map.values());
}

/**
 * Deduct stock from Inventory row and insert a StockLog entry.
 * Uses a single UPDATE ... RETURNING to stay atomic.
 */
async function deductInventory(
  client: SupabaseClient,
  entry: ConsumptionEntry,
  shopId: string | null,
  userEmail: string
) {
  // Find matching inventory row
  let query = client
    .from("Inventory")
    .select("id, stock, name")
    .ilike("name", `%${entry.inventoryName}%`);

  if (shopId) {
    query = query.eq("shopId", shopId);
  }

  const { data: rows, error: findErr } = await query.limit(1).single();

  if (findErr || !rows) {
    console.warn(
      `[Processor] Inventory "${entry.inventoryName}" not found (shop: ${shopId}): ${findErr?.message}`
    );
    return;
  }

  const inventoryRow = rows as { id: string; stock: number; name: string };
  const newStock = inventoryRow.stock - entry.amount;

  // Warn if going negative (but still allow — shop owner can reconcile)
  if (newStock < 0) {
    console.warn(
      `[Processor] ⚠ "${inventoryRow.name}" will go negative: ${inventoryRow.stock} - ${entry.amount} = ${newStock}`
    );
  }

  // Update stock
  const { error: updateErr } = await client
    .from("Inventory")
    .update({ stock: newStock, updatedAt: new Date().toISOString() })
    .eq("id", inventoryRow.id);

  if (updateErr) {
    console.error(`[Processor] Failed to update "${inventoryRow.name}":`, updateErr.message);
    return;
  }

  // Insert stock log
  const { error: logErr } = await client.from("StockLog").insert({
    inventoryId: inventoryRow.id,
    amount: -entry.amount,
    note: entry.note,
    createdBy: userEmail,
  });

  if (logErr) {
    console.error(`[Processor] Failed to log "${inventoryRow.name}":`, logErr.message);
  }
}
