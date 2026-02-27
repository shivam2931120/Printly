import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface UploadStepProps {
 files: { id: string; file: File; pageCount: number }[];
 onFilesAdded: (newFiles: File[]) => void;
 onFileRemove: (id: string) => void;
 onNext: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
 files,
 onFilesAdded,
 onFileRemove,
 onNext
}) => {
 const onDrop = useCallback((acceptedFiles: File[]) => {
 onFilesAdded(acceptedFiles);
 }, [onFilesAdded]);

 const { getRootProps, getInputProps, isDragActive } = useDropzone({
 onDrop,
 accept: { 'application/pdf': ['.pdf'] },
 maxSize: 50 * 1024 * 1024, // 50MB
 });

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="text-center space-y-2">
 <h2 className="text-2xl font-bold text-white font-display">Upload Documents</h2>
 <p className="text-[#666]">Select the PDF files you want to print.</p>
 </div>

 {/* Dropzone */}
 <div
 {...getRootProps()}
 className={cn(
 "border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] relative overflow-hidden",
 isDragActive
 ? "border-[#333] bg-[#111] scale-[1.02]"
 : "border-border hover:border-[#333] hover:bg-[#111]"
 )}
 >
 <input {...getInputProps()} />
 <div className="size-16 bg-background-subtle flex items-center justify-center mb-4">
 <UploadCloud size={32} className="text-white" />
 </div>
 <h3 className="text-lg font-bold text-white mb-1">
 {isDragActive ? "Drop files here" : "Tap to scan or upload"}
 </h3>
 <p className="text-sm text-[#666] max-w-xs mx-auto mb-6">
 Support for PDF files up to 50MB.
 </p>

 <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs relative z-10" onClick={(e) => e.stopPropagation()}>
 <Button variant="outline" className="w-full">
 Browse Files
 </Button>
 </div>
 </div>

 {/* File List */}
 {files.length > 0 && (
 <div className="space-y-3 pb-32">
 <h3 className="text-sm font-bold text-[#666] uppercase tracking-wider">Selected Files</h3>
 {files.map((fileWrapper) => (
 <div
 key={fileWrapper.id}
 className="flex items-center gap-4 p-4 bg-background-card border border-border group"
 >
 <div className="size-10 bg-[#111] flex items-center justify-center text-white shrink-0">
 <FileText size={20} />
 </div>
 <div className="flex-1 min-w-0 text-left">
 <p className="text-sm font-medium text-white line-clamp-1">{fileWrapper.file.name}</p>
 <p className="text-xs text-[#666]">
 {(fileWrapper.file.size / 1024 / 1024).toFixed(2)} MB • {fileWrapper.pageCount > 0 ? `${fileWrapper.pageCount} pages` : 'Analyzing...'}
 </p>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); onFileRemove(fileWrapper.id); }}
 className="p-2 text-[#666] hover:text-red-500 transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 ))}
 </div>
 )}

 {/* Sticky Action for Mobile - Above Bottom Nav */}
 <div className="fixed bottom-24 left-0 right-0 p-4 bg-transparent lg:hidden z-[100] pb-0 pointer-events-none">
 <div className="pointer-events-auto">
 <Button
 onClick={onNext}
 disabled={files.length === 0}
 className="w-full h-14 text-lg font-bold bg-red-600 text-white hover:bg-[#0A0A0A]/90 transition-all active:scale-[0.98] "
 >
 Continue ({files.length})
 </Button>
 </div>
 </div>
 </div>
 );
};
