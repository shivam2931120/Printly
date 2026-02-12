import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Settings,
  ShoppingCart,
  ChevronRight,
  Check,
  Plus
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
    if (!currentUser) {
      onSignInClick();
      return;
    }

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
    if (files.length === 0) return;
    addToCartPrint(files, printOptions, pricing);
    setFiles([]);
    setStep(0);
    setPrintOptions(DEFAULT_OPTIONS);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-in px-4 lg:px-0 overflow-hidden">
      {/* Mobile Stepper Header */}
      <div className="lg:hidden flex items-center justify-between mb-8 px-2 bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05]">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className={cn(
              "size-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-500",
              step === s
                ? "bg-white text-black scale-110 shadow-glow-primary"
                : step > s
                  ? "bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  : "bg-white/[0.03] border border-white/10 text-text-muted"
            )}>
              {step > s ? <Check size={18} strokeWidth={3} /> : s + 1}
            </div>
            {s < 2 && (
              <div className="flex-1 h-[2px] mx-3 bg-white/[0.03] overflow-hidden rounded-full">
                <div className={cn(
                  "h-full transition-all duration-700 ease-out",
                  step > s ? "w-full bg-green-500" : "w-0"
                )} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Streamlined 2-Panel Layout */}
      <div className="hidden lg:grid grid-cols-12 gap-10 w-full h-full max-h-[calc(100vh-140px)]">
        {/* Panel 1: Upload & File List */}
        <div className="col-span-5 flex flex-col gap-8 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-6 no-scrollbar">
            <UploadStep
              files={files}
              onFilesAdded={handleFilesAdded}
              onFileRemove={handleRemoveFile}
              onNext={() => { }}
            />
          </div>
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

        {/* Panel 2: Settings & Total */}
        <div className="col-span-7 flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Settings size={120} />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
            <SettingsStep
              options={printOptions}
              onChange={setPrintOptions}
              totalPrice={totalPrice}
              onNext={() => { }}
            />
          </div>

          <div className="mt-10 pt-10 border-t border-white/[0.05] flex flex-col gap-6 relative z-10">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em]">Total Estimated Cost</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white font-display">₹{totalPrice.toFixed(0)}</span>
                  <span className="text-xs text-text-muted font-bold">INR</span>
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <div className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/5 mb-2">
                  <FileText size={12} className="text-primary" />
                  <span className="text-[11px] text-white font-bold">{files.reduce((acc, f) => acc + f.pageCount, 0)} pages</span>
                </div>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">{files.length} document{files.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={files.length === 0 || files.some(f => f.pageCount === 0)}
              className="w-full h-16 text-xl bg-white text-black hover:bg-white/90 shadow-glow-primary transition-all active:scale-[0.98] rounded-3xl"
            >
              Add to Cart
              <Plus size={24} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Stepper Views */}
      <div className="lg:hidden flex-1 pb-32">
        <div className="animate-in">
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
    </div>
  );
};