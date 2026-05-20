import React from 'react';
import { motion } from 'framer-motion';
import { Eye, FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '../../lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface FilePreviewProps {
 file: File;
 pageCount: number;
 error?: string;
 onRemove: () => void;
 onPreview?: () => void;
 index: number;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, pageCount, error, onRemove, onPreview, index }) => {
 const sizeMB = (file.size / 1024 / 1024).toFixed(2);
 const isAnalyzing = !error && pageCount === 0;

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.25, delay: index * 0.05 }}
 className="group flex items-center gap-4 p-4 bg-background-card border border-border rounded-2xl shadow-2xl hover:bg-background-subtle transition-all duration-200"
 >
 {/* Thumbnail */}
 <div className="size-14 bg-background-subtle flex items-center justify-center shrink-0 overflow-hidden border border-border">
	 {isAnalyzing || error ? (
	 <FileText size={20} className="text-gray-400" />
 ) : (
 <Document
 file={file}
 loading={<FileText size={20} className="text-gray-400" />}
 error={<FileText size={20} className="text-gray-400" />}
 className="flex items-center justify-center"
 >
 <Page
 pageNumber={1}
 width={50}
 renderTextLayer={false}
 renderAnnotationLayer={false}
 />
 </Document>
 )}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-xs text-foreground-muted">{sizeMB} MB</span>
 <span className="text-xs text-foreground-muted">•</span>
	 {error ? (
	 <span className="text-xs text-error">{error}</span>
	 ) : isAnalyzing ? (
	 <span className="text-xs text-foreground-muted animate-pulse">Analyzing...</span>
	 ) : (
 <span className="text-xs text-gray-400 font-medium">{pageCount} pages</span>
 )}
 </div>
 </div>

 {/* Status */}
	 {!isAnalyzing && !error && (
	 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', stiffness: 500, damping: 25 }}
 >
 <CheckCircle2 size={18} className="text-emerald-500" />
 </motion.div>
	 )}
	 {onPreview && !error && (
	 <button
	 onClick={(e) => { e.stopPropagation(); onPreview(); }}
	 className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
	 aria-label="Preview file"
	 >
	 <Eye size={16} />
	 </button>
	 )}
	 {error && (
	 <AlertTriangle size={18} className="text-amber-300 shrink-0" />
	 )}

 {/* Remove */}
 <button
 onClick={(e) => { e.stopPropagation(); onRemove(); }}
 className="p-1.5 text-foreground-muted hover:text-error hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
 aria-label="Remove file"
 >
 <X size={16} />
 </button>
 </motion.div>
 );
};
