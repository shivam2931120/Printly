import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilePreviewProps {
    file: File;
    pageCount: number;
    onRemove: () => void;
    index: number;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, pageCount, onRemove, index }) => {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const isAnalyzing = pageCount === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="group flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-all duration-200"
        >
            {/* Icon */}
            <div className="size-11 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <FileText size={20} className="text-gray-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{sizeMB} MB</span>
                    <span className="text-xs text-gray-600">•</span>
                    {isAnalyzing ? (
                        <span className="text-xs text-gray-500 animate-pulse">Analyzing...</span>
                    ) : (
                        <span className="text-xs text-gray-400 font-medium">{pageCount} pages</span>
                    )}
                </div>
            </div>

            {/* Status */}
            {!isAnalyzing && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                    <CheckCircle2 size={18} className="text-emerald-500" />
                </motion.div>
            )}

            {/* Remove */}
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                aria-label="Remove file"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};
