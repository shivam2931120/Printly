import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Settings,
  ShoppingCart,
  ChevronRight,
  Check
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { PricingConfig, PrintOptions, User } from '../types';
import { useCartStore } from '../store/useCartStore';
import { calculatePrintPrice, calculateCartTotal } from '../lib/pricing';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

// Steps
import { UploadStep } from './upload/UploadStep';
import { SettingsStep } from './upload/SettingsStep';
import { PreviewStep } from './upload/PreviewStep';

interface StudentPortalProps {
  currentUser: User | null;
  onSignInClick: () => void;
  pricing: PricingConfig;
}

const DEFAULT_OPTIONS: PrintOptions = {
  copies: 1,
  paperSize: 'a4',
  orientation: 'portrait',
  colorMode: 'bw',
  sides: 'single',
  binding: 'none',
  paperType: 'normal',
  pageSelection: 'all',
  stapling: 'none',
  holePunch: false,
  coverPage: 'none'
};

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  onSignInClick,
  pricing
}) => {
  // State
  const [step, setStep] = useState(0); // 0: Upload, 1: Settings, 2: Preview
  const [files, setFiles] = useState<{ id: string; file: File; pageCount: number }[]>([]);
  const [printOptions, setPrintOptions] = useState<PrintOptions>(DEFAULT_OPTIONS);
  const addToCartPrint = useCartStore((state) => state.addToCartPrint);

  // Calculated Price
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    let total = 0;
    files.forEach(f => {
      total += calculatePrintPrice(printOptions, f.pageCount, pricing);
    });
    setTotalPrice(total);
  }, [files, printOptions, pricing]);

  // Handlers
  const handleFilesAdded = async (newFiles: File[]) => {
    // Initialize files with 0 page count. PreviewStep will parse and update this.
    const processed = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      pageCount: 0
    }));

    setFiles(prev => [...prev, ...processed]);
  };

  const handleUpdatePageCount = (count: number) => {
    if (files.length > 0) {
      const lastIdx = files.length - 1;
      // Only update if changed to avoid loops
      if (files[lastIdx].pageCount !== count) {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[lastIdx].pageCount = count;
          return newFiles;
        });
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAddToCart = () => {
    if (files.length === 0) {
      return;
    }

    // Basic validation for page count
    if (files.some(f => f.pageCount === 0)) {
      // In a real app we might show a toast, but here we can just warn or proceed
      // If proceeding with 0, price might be 0.
      console.warn("Some files have 0 pages detected.");
    }

    addToCartPrint(files, printOptions, pricing);
    // Reset Flow
    setFiles([]);
    setStep(0);
    setPrintOptions(DEFAULT_OPTIONS);
  };

  // Responsive Logic
  const isDesktop = window.innerWidth >= 1024; // Simple check

  // Desktop: Compact Layout
  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in px-4 lg:px-0 overflow-hidden">

      {/* Mobile Stepper Header */}
      <div className="lg:hidden flex items-center justify-between mb-2">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
              step === s
                ? "bg-white text-black scale-110 shadow-glow-white"
                : step > s
                  ? "bg-green-500 text-black"
                  : "bg-background-card border border-border text-text-muted"
            )}>
              {step > s ? <Check size={14} /> : s + 1}
            </div>
            {s < 2 && (
              <div className={cn(
                "h-0.5 w-12 mx-2 transition-colors duration-300",
                step > s ? "bg-green-500" : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Streamlined 2-Panel Layout */}
      <div className="hidden lg:grid grid-cols-12 gap-8 w-full h-full max-h-[calc(100vh-160px)]">

        {/* Panel 1: Upload & File List (Col 5) */}
        <div className="col-span-5 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
            <UploadStep
              files={files}
              onFilesAdded={handleFilesAdded}
              onFileRemove={handleRemoveFile}
              onNext={() => { }}
            />
          </div>
          {/* Hidden Preview for analysis only if desktop */}
          <div className="hidden">
            {files.length > 0 && (
              <PreviewStep
                file={files[files.length - 1].file}
                totalPrice={totalPrice}
                onAddToCart={() => { }}
                onPageCountChange={handleUpdatePageCount}
              />
            )}
          </div>
        </div>

        {/* Panel 2: Settings & Total (Col 7) */}
        <div className="col-span-7 flex flex-col gap-6 bg-background-card border border-border rounded-3xl p-8 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <SettingsStep
              options={printOptions}
              onChange={setPrintOptions}
              totalPrice={totalPrice}
              onNext={() => { }}
            />
          </div>

          <div className="mt-auto pt-6 border-t border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-text-muted uppercase font-bold tracking-widest">Total Estimated Cost</p>
                <p className="text-3xl font-black text-white">₹{totalPrice.toFixed(0)}</p>
              </div>
              <div className="flex flex-col items-end text-right">
                <p className="text-xs text-text-muted font-medium">{files.length} document{files.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-text-muted font-medium">
                  {files.reduce((acc, f) => acc + f.pageCount, 0)} total pages
                </p>
              </div>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={files.length === 0 || files.some(f => f.pageCount === 0)}
              className="w-full h-14 text-xl font-black bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98]"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Stepper Views */}
      <div className="lg:hidden flex-1 pb-32">
        {step === 0 && (
          <UploadStep
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleRemoveFile}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <SettingsStep
            options={printOptions}
            onChange={setPrintOptions}
            totalPrice={totalPrice}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <PreviewStep
            file={files.length > 0 ? files[files.length - 1].file : null}
            totalPrice={totalPrice}
            onAddToCart={handleAddToCart}
            onPageCountChange={handleUpdatePageCount}
          />
        )}
      </div>

    </div>
  );
};