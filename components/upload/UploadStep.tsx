import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { AlertTriangle, Eye, FileText, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { PrintFile } from '../../lib/printFiles';

interface UploadStepProps {
    files: PrintFile[];
    onFilesAdded: (newFiles: File[]) => void;
    onFileRemove: (id: string) => void;
    onFilePreview: (id: string) => void;
    onNext: () => void;
    canContinue: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({
    files,
    onFilesAdded,
    onFileRemove,
    onFilePreview,
    onNext,
    canContinue
}) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        onFilesAdded(acceptedFiles);
    }, [onFilesAdded]);

    const onDropRejected = useCallback((rejections: FileRejection[]) => {
        rejections.forEach(({ file, errors }) => {
            const message = errors.map((error) => error.message).join(', ') || 'This file cannot be uploaded.';
            toast.error(`${file.name}: ${message}`);
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'application/pdf': ['.pdf'] },
        maxSize: 50 * 1024 * 1024, // 50MB
        multiple: true,
        onDragEnter: () => undefined,
        onDragOver: () => undefined,
        onDragLeave: () => undefined,
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground font-display">Upload Documents</h2>
                <p className="text-foreground-muted">Select the PDF files you want to print.</p>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] relative overflow-hidden",
                    isDragActive
                        ? "border-primary/40 bg-background-subtle scale-[1.02]"
                        : "border-border hover:border-primary/30 hover:bg-background-subtle"
                )}
            >
                <input {...getInputProps()} />
                <div className="size-16 bg-background-subtle rounded-2xl flex items-center justify-center mb-4">
                    <UploadCloud size={32} className="text-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                    {isDragActive ? "Drop files here" : "Tap to scan or upload"}
                </h3>
                <p className="text-sm text-foreground-muted max-w-xs mx-auto mb-6">
                    Support for PDF files up to 50MB.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs relative z-10" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" className="w-full" onClick={() => open()}>
                        Browse Files
                    </Button>
                </div>
            </div>

            {/* Sticky Action for Mobile - Integrated below Dropzone for better flow */}
            <div className="lg:hidden w-full pt-4">
                <Button
                    onClick={onNext}
                    disabled={!canContinue}
                    className="w-full h-14 text-lg font-bold rounded-2xl bg-primary text-foreground hover:bg-primary-hover shadow-glow-red hover:shadow-glow-red-lg transition-all active:scale-[0.98]"
                >
                    Continue ({files.length})
                </Button>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3 pb-32">
                    <h3 className="text-sm font-bold text-foreground-muted uppercase tracking-wider">Selected Files</h3>
                    {files.map((fileWrapper) => (
                        <div
                            key={fileWrapper.id}
                            className="flex items-center gap-4 p-4 bg-background-card border rounded-2xl shadow-xl border-border group"
                        >
                            <div className="size-10 bg-background-subtle rounded-xl flex items-center justify-center text-foreground shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-foreground line-clamp-1">{fileWrapper.file.name}</p>
                                <p className="text-xs text-foreground-muted">
                                    {(fileWrapper.file.size / 1024 / 1024).toFixed(2)} MB • {fileWrapper.error ? fileWrapper.error : fileWrapper.pageCount > 0 ? `${fileWrapper.pageCount} pages` : 'Analyzing...'}
                                </p>
                            </div>
                            {fileWrapper.error ? (
                                <AlertTriangle size={18} className="text-amber-300 shrink-0" />
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFilePreview(fileWrapper.id); }}
                                    className="p-2 text-foreground-muted hover:text-foreground transition-colors"
                                    aria-label="Preview file"
                                >
                                    <Eye size={20} />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onFileRemove(fileWrapper.id); }}
                                className="p-2 text-foreground-muted hover:text-primary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};
