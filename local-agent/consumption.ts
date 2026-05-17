import { config } from "./config";

export interface PrintItem {
  type: string;
  pageCount?: number;
  printConfig?: {
    paperSize?: string;   // "a4" | "a3"
    colorMode?: string;   // "bw" | "color"
    copies?: number;
    binding?: string | boolean;
    sides?: string;       // "single" | "double"
    pageRangeText?: string;
  };
}

export interface ConsumptionEntry {
  inventoryName: string;
  amount: number;          // always positive (will be negated on deduction)
  note: string;
}

/**
 * Given one print item from an order, compute all inventory consumption entries.
 */
export function computeConsumption(item: PrintItem, orderId: string): ConsumptionEntry[] {
  if (item.type !== "print") return [];

  const entries: ConsumptionEntry[] = [];
  const pages = getSelectedPageCount(item.printConfig?.pageRangeText, item.pageCount ?? 0);
  const copies = item.printConfig?.copies ?? 1;
  const totalSheets = computeSheets(pages, copies, item.printConfig?.sides);
  const isColor = item.printConfig?.colorMode === "color";
  const paperSize = (item.printConfig?.paperSize ?? "a4").toLowerCase();
  const rules = config.CONSUMPTION;

  // ---- Paper ----
  if (paperSize === "a3") {
    entries.push({
      inventoryName: "A3 Paper",
      amount: totalSheets,
      note: `Order ${orderId}: ${totalSheets} A3 sheets (${pages}pg × ${copies}cp)`,
    });
  } else {
    entries.push({
      inventoryName: "A4 Paper (White)",
      amount: totalSheets,
      note: `Order ${orderId}: ${totalSheets} A4 sheets (${pages}pg × ${copies}cp)`,
    });
  }

  // ---- Ink ----
  const totalImpressions = pages * copies; // impressions drive ink usage
  if (isColor) {
    const cartridges = Math.ceil(totalImpressions / rules.INK_COLOR_PAGES_PER_UNIT);
    // Each color channel consumed equally (simplified)
    for (const color of ["Cyan", "Magenta", "Yellow"]) {
      entries.push({
        inventoryName: `Color Ink (${color})`,
        amount: cartridges,
        note: `Order ${orderId}: ~${cartridges} color cartridge(s) [${color}]`,
      });
    }
  } else {
    const cartridges = Math.ceil(totalImpressions / rules.INK_BLACK_PAGES_PER_UNIT);
    entries.push({
      inventoryName: "Black Ink",
      amount: cartridges,
      note: `Order ${orderId}: ~${cartridges} black cartridge(s)`,
    });
  }

  // ---- Binding ----
  const binding = item.printConfig?.binding;
  if (binding && binding !== "none") {
    entries.push({
      inventoryName: "Spiral Binding Coils",
      amount: rules.BINDING_COIL_PER_BIND * copies,
      note: `Order ${orderId}: ${copies} binding coil(s)`,
    });
  }

  return entries;
}

/**
 * Compute physical sheets needed (accounts for duplex).
 */
function computeSheets(pages: number, copies: number, sides?: string): number {
  const totalPages = pages * copies;
  if (sides === "double") {
    return Math.ceil(totalPages / 2);
  }
  return totalPages;
}

function getSelectedPageCount(pageRangeText: string | undefined, totalPages: number): number {
  if (!pageRangeText || totalPages <= 0) return totalPages;

  const pages = new Set<number>();
  for (const rawPart of pageRangeText.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = part.match(/^(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start || end > totalPages) return totalPages;
      for (let page = start; page <= end; page++) pages.add(page);
      continue;
    }

    if (single) {
      const page = Number(single[1]);
      if (page < 1 || page > totalPages) return totalPages;
      pages.add(page);
      continue;
    }

    return totalPages;
  }

  return pages.size > 0 ? pages.size : totalPages;
}
