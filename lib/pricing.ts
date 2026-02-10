import { PricingConfig, PrintOptions, CartItem } from '../types';

/**
 * Calculates the price for a single print job based on options and configuration.
 */
export const calculatePrintPrice = (
    options: PrintOptions,
    pageCount: number,
    config: PricingConfig
): number => {
    let total = 0;

    // 1. Base Copy Price (Black & White vs Color)
    const baseRate = options.colorMode === 'color' ? config.perPageColor : config.perPageBW;
    let pageCost = baseRate * pageCount;

    // 2. Double-Sided Discount
    // If double-sided, we might apply a discount per sheet (2 pages) or per page.
    // The config has `doubleSidedDiscount` which implies a per-page reduction.
    if (options.sides === 'double') {
        pageCost -= (config.doubleSidedDiscount * pageCount);
    }

    // Ensure we don't go below zero
    pageCost = Math.max(0, pageCost);

    // 3. Paper Size Multiplier
    const sizeMultiplier = config.paperSizeMultiplier[options.paperSize] || 1;
    pageCost *= sizeMultiplier;

    // 4. Paper Type Fees (Per Page)
    const paperTypeFee = config.paperTypeFees[options.paperType] || 0;
    pageCost += (paperTypeFee * pageCount);

    total += pageCost;

    // 5. Binding Fees (Flat fee per document)
    const bindingFee = config.bindingPrices[options.binding] || 0;
    total += bindingFee;

    // 6. Stapling Fees (Flat fee per document)
    const staplingFee = config.staplingPrices[options.stapling] || 0;
    total += staplingFee;

    // 7. Hole Punch Fee (Flat fee per document)
    if (options.holePunch) {
        total += config.holePunchPrice;
    }

    // 8. Cover Page Fee (Flat fee? Or per page if front+back?)
    // Usually cover page is a specific stock. Let's assume it's a flat fee for the "Cover Page Service" added to the doc.
    if (options.coverPage !== 'none') {
        const covers = options.coverPage === 'front_back' ? 2 : 1;
        total += (config.coverPagePrice * covers);
    }

    // 9. Multiply by Copies
    total *= options.copies;

    return total;
};

/**
 * Calculates the total functionality for the entire cart, including service fees.
 */
export const calculateCartTotal = (
    cart: CartItem[],
    config: PricingConfig
): { subtotal: number; serviceFee: number; total: number } => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Service fee is applied once per order usually, or we can make it logic dependent.
    // For now, let's assume a flat service fee if the cart is not empty.
    const serviceFee = cart.length > 0 ? config.serviceFee : 0;

    return {
        subtotal,
        serviceFee,
        total: subtotal + serviceFee
    };
};
