import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertTriangle, ChevronLeft, ChevronRight, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { parsePageRange } from '../../lib/pageRanges';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PreviewStepProps {
 file: File | null;
 onAddToCart: () => void;
 totalPrice: number;
 onPageCountChange?: (count: number) => void;
 pageRangeText?: string;
 onPageRangeChange?: (value: string) => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
 file,
 onAddToCart,
 totalPrice,
 onPageCountChange,
 pageRangeText = '',
 onPageRangeChange
}) => {
 const [numPages, setNumPages] = useState<number>(0);
 const [pageNumber, setPageNumber] = useState<number>(1);
 const [isLoading, setIsLoading] = useState(true);
 const rangeInfo = React.useMemo(() => parsePageRange(pageRangeText, numPages), [pageRangeText, numPages]);
 const thumbnailPages = React.useMemo(
 () => Array.from({ length: Math.min(numPages, 8) }, (_, index) => index + 1),
 [numPages]
 );
 const previewHeight = typeof window !== 'undefined' ? window.innerHeight * 0.52 : 420;

 useEffect(() => {
 setPageNumber(1);
 setIsLoading(Boolean(file));
 }, [file]);

 const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
 console.log('PDF loaded with', numPages, 'pages');
 setNumPages(numPages);
 setIsLoading(false);
 if (onPageCountChange) {
 onPageCountChange(numPages);
 }
 };

 return (
 <div className="space-y-6 animate-fade-in pb-32 h-full flex flex-col">
 <div className="text-center space-y-2 shrink-0">
 <h2 className="text-2xl font-bold text-foreground font-display">Preview</h2>
 <p className="text-foreground-muted">Review your document before printing.</p>
 </div>

 <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] relative bg-background-subtle border border-border overflow-hidden">
 {file ? (
 <div className="h-full w-full flex flex-col items-center justify-center p-4 overflow-hidden">
 <Document
 file={file}
 onLoadSuccess={onDocumentLoadSuccess}
 loading={
 <div className="absolute inset-0 flex items-center justify-center">
 <Loader2 className="animate-spin text-foreground" size={32} />
 </div>
 }
 className="flex flex-col items-center justify-center h-full w-full gap-3"
 >
 <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
 <Page
 pageNumber={pageNumber}
 className=" max-h-full max-w-full flex items-center justify-center [&_canvas]:!h-auto [&_canvas]:!w-auto [&_canvas]:max-h-[60vh] [&_canvas]:max-w-full [&_canvas]:object-contain"
 renderTextLayer={false}
 renderAnnotationLayer={false}
 height={previewHeight}
 />
 </div>
 {thumbnailPages.length > 1 && (
 <div className="w-full overflow-x-auto pb-1">
 <div className="flex gap-2 min-w-max px-1">
 {thumbnailPages.map((page) => (
 <button
 key={page}
 type="button"
 onClick={() => setPageNumber(page)}
 className={cn(
 "relative w-[64px] shrink-0 overflow-hidden border bg-background-card p-1 transition-all",
 pageNumber === page ? "border-primary" : "border-border hover:border-foreground-muted"
 )}
 aria-label={`Preview page ${page}`}
 >
 <Page
 pageNumber={page}
 width={54}
 renderTextLayer={false}
 renderAnnotationLayer={false}
 />
 <span className="absolute bottom-1 right-1 bg-black/75 px-1 text-[9px] font-bold text-foreground">
 {page}
 </span>
 </button>
 ))}
 </div>
 </div>
 )}
 </Document>
 </div>
 ) : (
 <div className="text-foreground-muted">No file selected</div>
 )}

 {/* Pagination Controls */}
 {numPages > 1 && (
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 px-4 py-2 border border-border z-10">
 <button
 disabled={pageNumber <= 1}
 onClick={() => setPageNumber(prev => prev - 1)}
 className="p-1 text-foreground disabled:opacity-30 hover:bg-background-subtle "
 >
 <ChevronLeft size={20} />
 </button>
 <span className="text-sm font-medium text-foreground min-w-[3rem] text-center">
 {pageNumber} / {numPages}
 </span>
 <button
 disabled={pageNumber >= numPages}
 onClick={() => setPageNumber(prev => prev + 1)}
 className="p-1 text-foreground disabled:opacity-30 hover:bg-background-subtle "
 >
 <ChevronRight size={20} />
 </button>
 </div>
 )}
 </div>

 <div className="shrink-0 bg-background-card border border-border p-4 space-y-2">
 <div className="flex items-center justify-between gap-3">
 <label htmlFor="page-range" className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
 Selected pages
 </label>
 {numPages > 0 && (
 <span className="text-xs text-foreground-muted">
 {rangeInfo.invalidParts.length === 0 ? `${rangeInfo.pages.length} of ${numPages}` : `${numPages} total`}
 </span>
 )}
 </div>
 <input
 id="page-range"
 value={pageRangeText}
 onChange={(event) => onPageRangeChange?.(event.target.value)}
 placeholder={numPages > 0 ? `All pages or 1-${numPages}` : 'All pages'}
 className="w-full bg-background-subtle border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
 />
 {rangeInfo.invalidParts.length > 0 && (
 <p className="flex items-start gap-2 text-xs text-amber-300">
 <AlertTriangle size={14} className="mt-0.5 shrink-0" />
 Invalid range: {rangeInfo.invalidParts.join(', ')}. Pricing will use all pages until this is fixed.
 </p>
 )}
 </div>

 {/* Sticky Action for Mobile - Above Bottom Nav */}
 <div className="fixed bottom-24 left-0 right-0 p-4 bg-transparent lg:hidden z-[100] pb-0 pointer-events-none">
 <div className="pointer-events-auto flex items-center gap-3">
 <div className="flex-1 bg-black/80 p-3 border border-border flex justify-between items-center ">
 <p className="text-xs text-foreground-muted uppercase font-bold">Total</p>
 <p className="text-xl font-bold text-foreground">₹{totalPrice.toFixed(0)}</p>
 </div>
 <Button
 onClick={onAddToCart}
 className="flex-[2] h-14 text-lg font-bold bg-primary text-foreground hover:bg-background-card/90 flex items-center justify-center gap-2 "
 >
 <ShoppingCart size={20} />
 Add to Cart
 </Button>
 </div>
 </div>
 </div>
 );
};
