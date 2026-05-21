import { PDFDocument } from 'pdf-lib';

export const PDF_MIME_TYPE = 'application/pdf';
export const MAX_PRINT_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export interface PrintFile {
    id: string;
    file: File;
    pageCount: number;
    error?: string;
}

export const createPrintFileId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
};

export const isPdfFile = (file: File) =>
    file.type === PDF_MIME_TYPE || /\.pdf$/i.test(file.name);

export const validatePrintFile = (file: File): string | null => {
    if (!isPdfFile(file)) {
        return 'Only PDF files can be printed right now.';
    }

    if (file.size <= 0) {
        return 'The selected file is empty.';
    }

    if (file.size > MAX_PRINT_FILE_SIZE_BYTES) {
        return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 50 MB.`;
    }

    return null;
};

export const ensurePdfFileName = (name: string) => {
    const normalized = name.trim() || 'document.pdf';
    return /\.pdf$/i.test(normalized) ? normalized : `${normalized}.pdf`;
};

const legacyPdfJsModule = 'pdfjs-dist/legacy/build/pdf.mjs';

const loadPdfJs = async () => {
    const pdfjs = typeof window === 'undefined'
        ? await import(/* @vite-ignore */ legacyPdfJsModule)
        : await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    return pdfjs;
};

export const getPdfPageCount = async (file: File): Promise<number> => {
    const buffer = await file.arrayBuffer();
    const pdfJsData = new Uint8Array(buffer.slice(0));
    const pdfLibData = new Uint8Array(buffer);
    let loadingTask: { promise: Promise<{ numPages: number; destroy: () => Promise<void> }>; destroy?: () => Promise<void> } | null = null;

    try {
        const pdfjs = await loadPdfJs();
        loadingTask = pdfjs.getDocument({ data: pdfJsData });
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        await pdf.destroy();
        if (pageCount > 0) return pageCount;
    } catch (error) {
        await loadingTask?.destroy().catch(() => undefined);
        console.warn('PDF.js page count failed, falling back to pdf-lib:', error);
    }

    const pdf = await PDFDocument.load(pdfLibData, { ignoreEncryption: true });
    const pageCount = pdf.getPageCount();
    if (pageCount <= 0) {
        throw new Error('PDF has no pages.');
    }
    return pageCount;
};
