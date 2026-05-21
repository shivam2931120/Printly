import { PricingConfig, PrintOptions, CartItem } from '../types';
import { getSelectedPageCount } from './pageRanges';

/**
 * Returns a line-by-line cost breakdown for a single print job.
 */
export interface PriceBreakdownLine {
    label: string;
    amount: number;
    detail?: string;
}

export interface PriceBreakdown {
    lines: PriceBreakdownLine[];
    total: number;
    billablePageCount: number;
    jobCount: number;
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Returns a line-by-line cost breakdown for one or more print jobs using the
 * same options. Flat finishing charges are applied once per uploaded file.
 */
export const calculatePrintJobsBreakdown = (
    options: PrintOptions,
    pageCounts: number[],
    config: PricingConfig
): PriceBreakdown => {
    const validPageCounts = pageCounts.filter((pageCount) => pageCount > 0);
    const jobCount = validPageCounts.length;
    const billablePageCount = validPageCounts.reduce(
        (sum, pageCount) => sum + getSelectedPageCount(options.pageRangeText, pageCount),
        0
    );
    const lines: PriceBreakdownLine[] = [];

    if (jobCount === 0 || billablePageCount === 0) {
        return { lines, total: 0, billablePageCount: 0, jobCount: 0 };
    }

    const fileDetail = jobCount > 1 ? `${jobCount} files` : undefined;

    // 1. Base print cost
    const baseRate = options.colorMode === 'color' ? config.perPageColor : config.perPageBW;
    const baseCost = baseRate * billablePageCount;
    lines.push({
        label: options.colorMode === 'color' ? 'Color printing' : 'B&W printing',
        amount: baseCost,
        detail: `${billablePageCount} pg x Rs ${baseRate}`,
    });

    // 2. Double-sided discount, capped so page cost never goes below zero
    const rawDiscount = options.sides === 'double'
        ? config.doubleSidedDiscount * billablePageCount
        : 0;
    const discount = Math.min(rawDiscount, baseCost);
    if (discount > 0) {
        lines.push({
            label: 'Double-sided discount',
            amount: -discount,
            detail: `-Rs ${config.doubleSidedDiscount}/pg`,
        });
    }

    const discountedPageCost = Math.max(0, baseCost - discount);

    // 3. Paper size surcharge
    const sizeMultiplier = config.paperSizeMultiplier[options.paperSize] || 1;
    if (sizeMultiplier !== 1) {
        lines.push({
            label: `${options.paperSize.toUpperCase()} paper`,
            amount: discountedPageCost * (sizeMultiplier - 1),
            detail: `x${sizeMultiplier}`,
        });
    }

    // 4. Paper type fee
    const paperFee = config.paperTypeFees[options.paperType] || 0;
    if (paperFee > 0) {
        lines.push({
            label: `${titleCase(options.paperType)} paper`,
            amount: paperFee * billablePageCount,
            detail: `${billablePageCount} pg x Rs ${paperFee}`,
        });
    }

    // 5. Binding
    const bindingFee = config.bindingPrices[options.binding] || 0;
    if (bindingFee > 0) {
        lines.push({
            label: `${titleCase(options.binding)} binding`,
            amount: bindingFee * jobCount,
            detail: jobCount > 1 ? `${jobCount} files x Rs ${bindingFee}` : undefined,
        });
    }

    // 6. Hole punch
    if (options.holePunch && config.holePunchPrice > 0) {
        lines.push({
            label: 'Hole punch',
            amount: config.holePunchPrice * jobCount,
            detail: fileDetail,
        });
    }

    // 7. Cover page
    if (options.coverPage !== 'none' && config.coverPagePrice > 0) {
        const covers = options.coverPage === 'front_back' ? 2 : 1;
        const coverCount = covers * jobCount;
        lines.push({
            label: `Cover page (${options.coverPage.replace('_', '+')})`,
            amount: config.coverPagePrice * coverCount,
            detail: coverCount > 1 ? `${coverCount} covers x Rs ${config.coverPagePrice}` : undefined,
        });
    }

    // Subtotal before copies
    const subtotalPerCopy = lines.reduce((sum, line) => sum + line.amount, 0);

    // 8. Copies
    if (options.copies > 1) {
        lines.push({
            label: `x ${options.copies} copies`,
            amount: subtotalPerCopy * (options.copies - 1),
        });
    }

    return {
        lines,
        total: Math.max(0, subtotalPerCopy * options.copies),
        billablePageCount,
        jobCount,
    };
};

export const calculatePriceBreakdown = (
    options: PrintOptions,
    pageCount: number,
    config: PricingConfig
): PriceBreakdown => calculatePrintJobsBreakdown(options, [pageCount], config);

/**
 * Calculates the price for a single print job based on options and configuration.
 */
export const calculatePrintPrice = (
    options: PrintOptions,
    pageCount: number,
    config: PricingConfig
): number => calculatePriceBreakdown(options, pageCount, config).total;

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
