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

    // 6. Hole Punch Fee (Flat fee per document)
    if (options.holePunch) {
        total += config.holePunchPrice;
    }

    // 7. Cover Page Fee
    if (options.coverPage !== 'none') {
        const covers = options.coverPage === 'front_back' ? 2 : 1;
        total += (config.coverPagePrice * covers);
    }

    // 8. Multiply by Copies
    total *= options.copies;

    return total;
};

/**
 * Returns a line-by-line cost breakdown for a single print job.
 */
export interface PriceBreakdownLine {
    label: string;
    amount: number;
    detail?: string;
}

export const calculatePriceBreakdown = (
    options: PrintOptions,
    pageCount: number,
    config: PricingConfig
): { lines: PriceBreakdownLine[]; total: number } => {
    const lines: PriceBreakdownLine[] = [];

    // 1. Base print cost
    const baseRate = options.colorMode === 'color' ? config.perPageColor : config.perPageBW;
    const baseCost = baseRate * pageCount;
    lines.push({
        label: options.colorMode === 'color' ? 'Color printing' : 'B&W printing',
        amount: baseCost,
        detail: `${pageCount} pg × ₹${baseRate}`,
    });

    // 2. Double-sided discount
    if (options.sides === 'double' && config.doubleSidedDiscount > 0) {
        const discount = -(config.doubleSidedDiscount * pageCount);
        lines.push({ label: 'Double-sided discount', amount: discount, detail: `-₹${config.doubleSidedDiscount}/pg` });
    }

    // 3. Paper size surcharge
    const sizeMulti = config.paperSizeMultiplier[options.paperSize] || 1;
    if (sizeMulti !== 1) {
        const pageCostSoFar = lines.reduce((s, l) => s + l.amount, 0);
        const surcharge = pageCostSoFar * (sizeMulti - 1);
        lines.push({ label: `${options.paperSize.toUpperCase()} paper`, amount: surcharge, detail: `×${sizeMulti}` });
    }

    // 4. Paper type fee
    const paperFee = config.paperTypeFees[options.paperType] || 0;
    if (paperFee > 0) {
        lines.push({ label: `${options.paperType.charAt(0).toUpperCase() + options.paperType.slice(1)} paper`, amount: paperFee * pageCount, detail: `${pageCount} pg × ₹${paperFee}` });
    }

    // 5. Binding
    const bindFee = config.bindingPrices[options.binding] || 0;
    if (bindFee > 0) {
        lines.push({ label: `${options.binding.charAt(0).toUpperCase() + options.binding.slice(1)} binding`, amount: bindFee });
    }

    // 6. Hole punch
    if (options.holePunch && config.holePunchPrice > 0) {
        lines.push({ label: 'Hole punch', amount: config.holePunchPrice });
    }

    // 8. Cover page
    if (options.coverPage !== 'none') {
        const covers = options.coverPage === 'front_back' ? 2 : 1;
        lines.push({ label: `Cover page (${options.coverPage.replace('_', '+')})`, amount: config.coverPagePrice * covers });
    }

    // Subtotal before copies
    const subtotalPerCopy = lines.reduce((s, l) => s + l.amount, 0);

    // 9. Copies
    if (options.copies > 1) {
        lines.push({ label: `× ${options.copies} copies`, amount: subtotalPerCopy * (options.copies - 1) });
    }

    const total = Math.max(0, subtotalPerCopy * options.copies);
    return { lines, total };
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
