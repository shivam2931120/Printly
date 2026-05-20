import React, { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parsePageRange } from '../../lib/pageRanges';
import type { PrintFile } from '../../lib/printFiles';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface DocumentPreviewModalProps {
    item: PrintFile | null;
    pageRangeText: string;
    onClose: () => void;
    onPageRangeChange: (value: string) => void;
    onPageCountChange: (fileId: string, count: number) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    item,
    pageRangeText,
    onClose,
    onPageRangeChange,
    onPageCountChange,
}) => {
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [viewportHeight, setViewportHeight] = useState(720);
    const rangeInfo = useMemo(() => parsePageRange(pageRangeText, numPages), [pageRangeText, numPages]);
    const thumbnailPages = useMemo(
        () => Array.from({ length: Math.min(numPages, 8) }, (_, index) => index + 1),
        [numPages]
    );

    useEffect(() => {
        setPageNumber(1);
        setLoadError(null);
        setNumPages(item?.pageCount && item.pageCount > 0 ? item.pageCount : 0);
    }, [item?.id, item?.pageCount]);

    useEffect(() => {
        const updateViewportHeight = () => setViewportHeight(window.innerHeight);
        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);
        return () => window.removeEventListener('resize', updateViewportHeight);
    }, []);

    if (!item) return null;

    const onLoadSuccess = ({ numPages: loadedPages }: { numPages: number }) => {
        setNumPages(loadedPages);
        setLoadError(null);
        onPageCountChange(item.id, loadedPages);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex h-[min(88vh,760px)] w-full max-w-5xl flex-col border border-border bg-background-card shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-foreground">{item.file.name}</h2>
                        <p className="text-xs text-foreground-muted">
                            {numPages > 0 ? `${numPages} pages` : 'Loading preview'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 p-2 text-foreground-muted hover:bg-background-subtle hover:text-foreground"
                        aria-label="Close preview"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-3 p-4 lg:grid-cols-[1fr_260px] lg:grid-rows-1">
                    <div className="relative flex min-h-0 items-center justify-center overflow-hidden border border-border bg-background-subtle">
                        {loadError ? (
                            <div className="max-w-sm p-6 text-center">
                                <AlertTriangle className="mx-auto mb-3 text-amber-300" size={32} />
                                <p className="text-sm font-semibold text-foreground">Preview unavailable</p>
                                <p className="mt-1 text-xs text-foreground-muted">{loadError}</p>
                            </div>
                        ) : (
                            <Document
                                file={item.file}
                                onLoadSuccess={onLoadSuccess}
                                onLoadError={(error) => setLoadError(error.message || 'Could not render this PDF.')}
                                loading={<Loader2 className="animate-spin text-foreground" size={32} />}
                                error={null}
                                className="flex h-full w-full items-center justify-center"
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    height={Math.min(620, Math.max(360, viewportHeight * 0.68))}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="[&_canvas]:!h-auto [&_canvas]:!w-auto [&_canvas]:max-h-full [&_canvas]:max-w-full"
                                />
                            </Document>
                        )}

                        {numPages > 1 && !loadError && (
                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 border border-border bg-black/80 px-3 py-2">
                                <button
                                    type="button"
                                    disabled={pageNumber <= 1}
                                    onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                                    className="p-1 text-foreground disabled:opacity-30 hover:bg-background-subtle"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="min-w-[3rem] text-center text-sm font-semibold text-foreground">
                                    {pageNumber} / {numPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={pageNumber >= numPages}
                                    onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
                                    className="p-1 text-foreground disabled:opacity-30 hover:bg-background-subtle"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="min-h-0 space-y-4 overflow-y-auto border border-border bg-background p-3">
                        {thumbnailPages.length > 1 && !loadError && (
                            <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Pages</p>
                                <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                                    {thumbnailPages.map((page) => (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => setPageNumber(page)}
                                            className={cn(
                                                'relative overflow-hidden border bg-background-card p-1',
                                                pageNumber === page ? 'border-primary' : 'border-border hover:border-foreground-muted'
                                            )}
                                        >
                                            <Document file={item.file} loading={null} error={null}>
                                                <Page
                                                    pageNumber={page}
                                                    width={96}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                />
                                            </Document>
                                            <span className="absolute bottom-1 right-1 bg-black/75 px-1 text-[9px] font-bold text-foreground">
                                                {page}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <label htmlFor="modal-page-range" className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                                    Selected pages
                                </label>
                                {numPages > 0 && (
                                    <span className="text-xs text-foreground-muted">
                                        {rangeInfo.invalidParts.length === 0 ? `${rangeInfo.pages.length} of ${numPages}` : `${numPages} total`}
                                    </span>
                                )}
                            </div>
                            <input
                                id="modal-page-range"
                                value={pageRangeText}
                                onChange={(event) => onPageRangeChange(event.target.value)}
                                placeholder={numPages > 0 ? `All pages or 1-${numPages}` : 'All pages'}
                                className="w-full border border-border bg-background-subtle px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                            />
                            {rangeInfo.invalidParts.length > 0 && (
                                <p className="mt-2 flex items-start gap-2 text-xs text-amber-300">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    Invalid range: {rangeInfo.invalidParts.join(', ')}
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};
