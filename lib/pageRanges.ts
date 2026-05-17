export interface PageRangeResult {
    pages: number[];
    invalidParts: string[];
}

export const parsePageRange = (input: string, totalPages: number): PageRangeResult => {
    const trimmed = input.trim();
    if (!trimmed) {
        return {
            pages: Array.from({ length: totalPages }, (_, index) => index + 1),
            invalidParts: [],
        };
    }

    const pages = new Set<number>();
    const invalidParts: string[] = [];

    trimmed.split(',').forEach((rawPart) => {
        const part = rawPart.trim();
        if (!part) return;

        const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
        const singleMatch = part.match(/^(\d+)$/);

        if (rangeMatch) {
            const start = Number(rangeMatch[1]);
            const end = Number(rangeMatch[2]);
            if (start < 1 || end < start || end > totalPages) {
                invalidParts.push(part);
                return;
            }
            for (let page = start; page <= end; page++) pages.add(page);
            return;
        }

        if (singleMatch) {
            const page = Number(singleMatch[1]);
            if (page < 1 || page > totalPages) {
                invalidParts.push(part);
                return;
            }
            pages.add(page);
            return;
        }

        invalidParts.push(part);
    });

    return {
        pages: Array.from(pages).sort((a, b) => a - b),
        invalidParts,
    };
};

export const getSelectedPageCount = (input: string | undefined, totalPages: number): number => {
    if (totalPages <= 0) return 0;
    const result = parsePageRange(input || '', totalPages);
    if (result.invalidParts.length > 0 || result.pages.length === 0) return totalPages;
    return result.pages.length;
};
