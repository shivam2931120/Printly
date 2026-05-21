import assert from 'node:assert/strict';
import { DEFAULT_PRICING, type CartItem, type PrintOptions } from '../types';
import { getSelectedPageCount, parsePageRange } from '../lib/pageRanges';
import { calculateCartTotal, calculatePrintJobsBreakdown, calculatePrintPrice } from '../lib/pricing';

const baseOptions: PrintOptions = {
    copies: 1,
    paperSize: 'a4',
    orientation: 'portrait',
    colorMode: 'bw',
    sides: 'single',
    binding: 'none',
    paperType: 'normal',
    pageRangeText: '',
    holePunch: false,
    coverPage: 'none',
};

const assertClose = (actual: number, expected: number, message: string) => {
    assert.equal(Number(actual.toFixed(2)), Number(expected.toFixed(2)), message);
};

const parsed = parsePageRange('1-3, 2, 5', 6);
assert.deepEqual(parsed.pages, [1, 2, 3, 5], 'page ranges are de-duplicated and sorted');
assert.deepEqual(parsed.invalidParts, [], 'valid page range has no invalid parts');

assert.equal(getSelectedPageCount('1-3, 8', 6), 6, 'invalid page ranges fall back to all pages');
assert.equal(getSelectedPageCount('', 12), 12, 'empty page range selects all pages');

const multiFileOptions: PrintOptions = {
    ...baseOptions,
    copies: 2,
    paperSize: 'a3',
    colorMode: 'color',
    sides: 'double',
    binding: 'spiral',
    paperType: 'bond',
    pageRangeText: '1-4',
    holePunch: true,
    coverPage: 'front_back',
};

const pageCounts = [10, 3];
const multiFileBreakdown = calculatePrintJobsBreakdown(multiFileOptions, pageCounts, DEFAULT_PRICING);
const summedSingleFilePrices = pageCounts.reduce(
    (sum, pageCount) => sum + calculatePrintPrice(multiFileOptions, pageCount, DEFAULT_PRICING),
    0
);

assert.equal(multiFileBreakdown.billablePageCount, 7, 'multi-file breakdown counts page ranges per file');
assert.equal(multiFileBreakdown.jobCount, 2, 'multi-file breakdown counts uploaded jobs');
assertClose(multiFileBreakdown.total, summedSingleFilePrices, 'multi-file breakdown matches summed per-file prices');

const cart: CartItem[] = [
    {
        id: 'product-1',
        type: 'product',
        productId: 'product-1',
        name: 'Notebook',
        price: 50,
        quantity: 2,
    },
];
const cartTotal = calculateCartTotal(cart, DEFAULT_PRICING);
assert.equal(cartTotal.subtotal, 100, 'cart subtotal uses item price times quantity');
assert.equal(cartTotal.serviceFee, DEFAULT_PRICING.serviceFee, 'cart total applies configured service fee once');
assert.equal(cartTotal.total, 100 + DEFAULT_PRICING.serviceFee, 'cart total does not add a hardcoded percentage fee');

console.log('Pricing tests passed.');
