import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Settings, FileText, Plus } from 'lucide-react';
import { PricingConfig, PrintOptions, User } from '../../types';
import { calculatePrintPrice } from '../../lib/pricing';
import { useCartStore } from '../../store/useCartStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

// Desktop: new premium components
import { UploadCard } from './UploadCard';
import { SettingsCard } from './SettingsCard';
import { SummaryCard } from './SummaryCard';

// Mobile: original stepper components (unchanged)
import { UploadStep } from '../upload/UploadStep';
import { SettingsStep } from '../upload/SettingsStep';
import { PreviewStep } from '../upload/PreviewStep';

interface PrintPageProps {
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
 pageRangeText: '',
 holePunch: false,
 coverPage: 'none',
};

export const PrintPage: React.FC<PrintPageProps> = ({ currentUser, onSignInClick, pricing }) => {
 const navigate = useNavigate();
 const addToCartPrint = useCartStore((state) => state.addToCartPrint);

 const [files, setFiles] = useState<{ id: string; file: File; pageCount: number }[]>([]);
 const [options, setOptions] = useState<PrintOptions>(DEFAULT_OPTIONS);
 const [totalPrice, setTotalPrice] = useState(0);
 const [step, setStep] = useState(0); // Mobile stepper: 0=Upload, 1=Settings, 2=Preview

 // Recalculate price
 useEffect(() => {
 let total = 0;
 files.forEach((f) => {
 total += calculatePrintPrice(options, f.pageCount, pricing);
 });
 setTotalPrice(total);
 }, [files, options, pricing]);

 // File handlers
 const handleFilesAdded = (newFiles: File[]) => {
 if (!currentUser) {
 onSignInClick();
 return;
 }
 const processed = newFiles.map((file) => ({
 id: Math.random().toString(36).substr(2, 9),
 file,
 pageCount: 0,
 }));
 setFiles((prev) => [...prev, ...processed]);
 };

 const handleFileRemove = (id: string) => {
 setFiles((prev) => prev.filter((f) => f.id !== id));
 };

 const handleUpdatePageCount = (count: number) => {
 if (files.length > 0) {
 const lastIdx = files.length - 1;
 if (files[lastIdx].pageCount !== count) {
 setFiles((prev) => {
 const copy = [...prev];
 copy[lastIdx] = { ...copy[lastIdx], pageCount: count };
 return copy;
 });
 }
 }
 };

 const handleAddToCart = () => {
 if (files.length === 0 || files.some((f) => f.pageCount === 0)) return;
 addToCartPrint(files, options, pricing);
 setFiles([]);
 setStep(0);
 setOptions(DEFAULT_OPTIONS);
 };

 const totalPages = files.reduce((s, f) => s + f.pageCount, 0) || 1;
 const isDisabled = files.length === 0 || files.some((f) => f.pageCount === 0);

 return (
 <div className="h-full flex flex-col lg:flex-row gap-6 animate-in px-4 lg:px-0 overflow-hidden">

 {/* ======= DESKTOP: 3-Column Premium Grid ======= */}
 <div className="hidden lg:grid grid-cols-12 gap-6 w-full h-full max-h-[calc(100vh-140px)]">
 {/* Hidden PDF counter */}
 <div className="hidden">
 {files.length > 0 && (
 <PreviewStep
 file={files[files.length - 1].file}
 totalPrice={totalPrice}
 onAddToCart={() => {}}
 onPageCountChange={handleUpdatePageCount}
 />
 )}
 </div>

 {/* LEFT — Upload */}
 <div className="col-span-4 bg-[#111117]/60 border border-[#333]/[0.06] p-6 overflow-y-auto no-scrollbar">
 <UploadCard
 files={files}
 onFilesAdded={handleFilesAdded}
 onFileRemove={handleFileRemove}
 />
 </div>

 {/* CENTER — Settings */}
 <div className="col-span-4 bg-[#111117]/60 border border-[#333]/[0.06] p-5 overflow-y-auto overflow-x-hidden no-scrollbar">
 <SettingsCard
 options={options}
 onChange={setOptions}
 pageCount={totalPages}
 pricing={pricing}
 />
 </div>

 {/* RIGHT — Summary */}
 <div className="col-span-4 bg-[#111117]/60 border border-[#333]/[0.06] p-6 overflow-y-auto no-scrollbar">
 <SummaryCard
 options={options}
 pageCount={totalPages}
 totalPrice={totalPrice}
 fileCount={files.length}
 hasFiles={files.length > 0 && !isDisabled}
 onAddToCart={handleAddToCart}
 disabled={isDisabled}
 pricing={pricing}
 />
 </div>
 </div>

 {/* ======= MOBILE: Original Stepper Layout (unchanged) ======= */}

 {/* Mobile Stepper Header */}
 <div className="lg:hidden flex items-center justify-between mb-8 px-2 bg-[#0A0A0A] p-4 border border-[#333]">
 {[0, 1, 2].map((s) => (
 <div key={s} className="flex flex-1 items-center last:flex-none">
 <div className={cn(
 "size-10 flex items-center justify-center text-sm font-black transition-all duration-500",
 step === s
 ? "bg-red-600 text-white scale-110"
 : step > s
 ? "bg-green-900/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
 : "bg-[#0A0A0A] border border-[#333] text-[#666]"
 )}>
 {step > s ? <Check size={18} strokeWidth={3} /> : s + 1}
 </div>
 {s < 2 && (
 <div className="flex-1 h-[2px] mx-3 bg-[#0A0A0A] overflow-hidden ">
 <div className={cn(
 "h-full transition-all duration-700 ease-out",
 step > s ? "w-full bg-green-900/20" : "w-0"
 )} />
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Hidden PDF counter for mobile */}
 <div className="hidden lg:hidden">
 {files.length > 0 && (
 <PreviewStep
 file={files[files.length - 1].file}
 totalPrice={totalPrice}
 onAddToCart={() => {}}
 onPageCountChange={handleUpdatePageCount}
 />
 )}
 </div>

 {/* Mobile: Stepper Views */}
 <div className="lg:hidden flex-1 pb-32">
 <div className="animate-in">
 {step === 0 && (
 <UploadStep
 files={files}
 onFilesAdded={handleFilesAdded}
 onFileRemove={handleFileRemove}
 onNext={() => setStep(1)}
 />
 )}

 {step === 1 && (
 <SettingsStep
 options={options}
 onChange={setOptions}
 totalPrice={totalPrice}
 pageCount={totalPages}
 onNext={() => setStep(2)}
 pricing={pricing}
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
