import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Eye } from 'lucide-react';
import { FilePreview } from './FilePreview';
import { cn } from '../../lib/utils';

interface UploadCardProps {
    files: { id: string; file: File; pageCount: number }[];
    onFilesAdded: (files: File[]) => void;
    onFileRemove: (id: string) => void;
    onPreview?: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
    files,
    onFilesAdded,
    onFileRemove,
    onPreview,
}) => {
    const dropRef = useRef<HTMLDivElement>(null);
    const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
    const [showGlow, setShowGlow] = useState(false);

    const onDrop = useCallback((accepted: File[]) => {
        onFilesAdded(accepted);
    }, [onFilesAdded]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxSize: 50 * 1024 * 1024,
    });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dropRef.current) return;
        const rect = dropRef.current.getBoundingClientRect();
        setGlowPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col h-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Upload Documents</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Select the PDF files you want to print</p>
                </div>
                {files.length > 0 && onPreview && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onPreview}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-gray-400 hover:text-white hover:border-white/10 transition-all"
                    >
                        <Eye size={16} />
                        Preview
                    </motion.button>
                )}
            </div>

            {/* Drop Zone */}
            <div
                ref={dropRef}
                {...getRootProps()}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setShowGlow(true)}
                onMouseLeave={() => setShowGlow(false)}
                className={cn(
                    'relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden',
                    files.length > 0 ? 'py-8 px-6' : 'py-14 px-6',
                    isDragActive
                        ? 'border-white/30 bg-white/[0.04] scale-[1.01]'
                        : 'border-white/[0.08] hover:border-white/15 hover:bg-white/[0.02]',
                )}
            >
                <input {...getInputProps()} />

                {/* Hover glow */}
                {showGlow && (
                    <div
                        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                        style={{
                            background: `radial-gradient(400px circle at ${glowPos.x}px ${glowPos.y}px, rgba(255,255,255,0.03), transparent 60%)`,
                        }}
                    />
                )}

                <motion.div
                    animate={isDragActive ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="size-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4"
                >
                    <UploadCloud size={28} className={cn('transition-colors', isDragActive ? 'text-white' : 'text-gray-500')} />
                </motion.div>

                <h3 className="text-base font-semibold text-white mb-1">
                    {isDragActive ? 'Drop files here' : 'Tap to upload or drag files'}
                </h3>
                <p className="text-xs text-gray-500 mb-5">PDF up to 50MB</p>

                <div onClick={(e) => e.stopPropagation()}>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                            input?.click();
                        }}
                        className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-semibold text-white hover:bg-white/[0.1] transition-all"
                    >
                        Browse Files
                    </motion.button>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="mt-5 space-y-2.5 flex-1 overflow-y-auto no-scrollbar">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Uploaded Files ({files.length})
                    </p>
                    <AnimatePresence>
                        {files.map((f, i) => (
                            <FilePreview
                                key={f.id}
                                file={f.file}
                                pageCount={f.pageCount}
                                onRemove={() => onFileRemove(f.id)}
                                index={i}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};
