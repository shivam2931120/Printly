import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, FileText, MapPin, ReceiptText, Store } from 'lucide-react';
import { toast } from 'sonner';
import { PricingConfig, PrintOptions, ShopConfig, User } from '../../types';
import { calculatePrintPrice } from '../../lib/pricing';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useShopStore } from '../../store/useShopStore';
import { cn } from '../../lib/utils';
import { getShopOpenState } from '../../lib/shopHours';
import { getPdfPageCount, createPrintFileId, validatePrintFile } from '../../lib/printFiles';
import type { PrintFile } from '../../lib/printFiles';
import { openGoogleDrivePdfPicker, openOneDrivePdfPicker, preloadCloudDocumentPickers } from '../../lib/cloudDocuments';

// Desktop: new premium components
import { UploadCard } from './UploadCard';
import { SettingsCard } from './SettingsCard';
import { SummaryCard } from './SummaryCard';

// Mobile: original stepper components (unchanged)
import { UploadStep } from '../upload/UploadStep';
import { SettingsStep } from '../upload/SettingsStep';
import { PreviewStep } from '../upload/PreviewStep';
import { DocumentPreviewModal } from '../upload/DocumentPreviewModal';

interface PrintPageProps {
    currentUser: User | null;
    onSignInClick: () => void;
    pricing: PricingConfig;
    shopConfig: ShopConfig;
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

export const PrintPage: React.FC<PrintPageProps> = ({ currentUser, onSignInClick, pricing, shopConfig }) => {
    const navigate = useNavigate();
    const addToCartPrint = useCartStore((state) => state.addToCartPrint);
    const orders = useOrderStore((state) => state.orders);
    const shops = useShopStore((state) => state.shops);
    const selectedShopId = useShopStore((state) => state.selectedShopId);
    const setSelectedShopId = useShopStore((state) => state.setSelectedShopId);

    const [files, setFiles] = useState<PrintFile[]>([]);
    const [options, setOptions] = useState<PrintOptions>(DEFAULT_OPTIONS);
    const [totalPrice, setTotalPrice] = useState(0);
    const [step, setStep] = useState(0); // Mobile stepper: 0=Upload, 1=Settings, 2=Preview
    const [previewFileId, setPreviewFileId] = useState<string | null>(null);
    const [cloudProvider, setCloudProvider] = useState<'google-drive' | 'onedrive' | null>(null);

    // Recalculate price
    useEffect(() => {
        let total = 0;
        files.filter((f) => !f.error).forEach((f) => {
            total += calculatePrintPrice(options, f.pageCount, pricing);
        });
        setTotalPrice(total);
    }, [files, options, pricing]);

    useEffect(() => {
        preloadCloudDocumentPickers().catch((error) => {
            console.warn('Cloud picker preload failed:', error);
        });
    }, []);

    // File handlers
    const handleFilesAdded = (newFiles: File[], source: PrintFile['source'] = 'local') => {
        if (!currentUser) {
            onSignInClick();
            return;
        }
        const accepted: PrintFile[] = [];
        newFiles.forEach((file) => {
            const validationError = validatePrintFile(file);
            if (validationError) {
                toast.error(`${file.name}: ${validationError}`);
                return;
            }
            accepted.push({
                id: createPrintFileId(),
                file,
                pageCount: 0,
                source,
            });
        });

        if (accepted.length === 0) return;

        setFiles((prev) => [...prev, ...accepted]);

        accepted.forEach(async (fileWrapper) => {
            try {
                const pageCount = await getPdfPageCount(fileWrapper.file);
                if (pageCount <= 0) throw new Error('PDF has no pages');
                setFiles((prev) => prev.map((item) => (
                    item.id === fileWrapper.id ? { ...item, pageCount } : item
                )));
            } catch (error) {
                console.error('Failed to read PDF page count:', fileWrapper.file.name, error);
                const message = error instanceof Error ? error.message : 'Could not read this PDF.';
                setFiles((prev) => prev.map((item) => (
                    item.id === fileWrapper.id ? { ...item, error: message } : item
                )));
                toast.error(`Could not read ${fileWrapper.file.name}. Remove it and upload a valid PDF.`);
            }
        });
    };

    const handleFileRemove = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setPreviewFileId((prev) => prev === id ? null : prev);
    };

    const handleUpdatePageCount = (fileId: string, count: number) => {
        setFiles((prev) => prev.map((item) => (
            item.id === fileId && item.pageCount !== count ? { ...item, pageCount: count, error: undefined } : item
        )));
    };

    const handleAddToCart = () => {
        if (files.length === 0 || files.some((f) => f.pageCount <= 0 || Boolean(f.error))) return;
        const readyFiles = files.filter((f) => !f.error);
        addToCartPrint(readyFiles, options, pricing);
        setFiles([]);
        setStep(0);
        setOptions(DEFAULT_OPTIONS);
        setPreviewFileId(null);
    };

    const handleCloudPick = async (provider: 'google-drive' | 'onedrive') => {
        if (!currentUser) {
            onSignInClick();
            return;
        }

        setCloudProvider(provider);
        try {
            const cloudFiles = provider === 'google-drive'
                ? await openGoogleDrivePdfPicker()
                : await openOneDrivePdfPicker();
            if (cloudFiles.length > 0) {
                handleFilesAdded(cloudFiles, provider);
                toast.success(`Added ${cloudFiles.length} file${cloudFiles.length === 1 ? '' : 's'} from ${provider === 'google-drive' ? 'Drive' : 'OneDrive'}.`);
            }
        } catch (error) {
            console.error('Cloud picker failed:', error);
            toast.error(error instanceof Error ? error.message : 'Cloud picker failed.');
        } finally {
            setCloudProvider(null);
        }
    };

    const readyFiles = files.filter((f) => !f.error);
    const totalPages = readyFiles.reduce((s, f) => s + f.pageCount, 0) || 1;
    const isDisabled = files.length === 0 || files.some((f) => f.pageCount <= 0 || Boolean(f.error));
    const previewItem = files.find((file) => file.id === previewFileId) || null;
    const lastFile = files[files.length - 1] || null;
    const openState = getShopOpenState(shopConfig.operatingHours);
    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
    const recentFiles = recentOrders
        .flatMap((order) => order.items.filter((item) => item.type === 'print').map((item) => ({
            id: `${order.id}-${item.id}`,
            name: item.name,
            date: order.createdAt,
            status: order.status,
        })))
        .slice(0, 3);

    return (
        <div className="h-full flex flex-col gap-4 animate-in px-4 lg:px-0 overflow-hidden">
            <section className="shrink-0 grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
                <div className="border border-border bg-background-card p-4 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <Store size={18} className="text-primary shrink-0" />
                                <h1 className="text-lg font-bold text-foreground truncate">{shopConfig.shopName}</h1>
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
                                <MapPin size={13} />
                                <span className="truncate">{shopConfig.location}</span>
                            </p>
                        </div>
                        <span className={cn(
                            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                            openState.isOpen
                                ? "border-green-500/30 bg-green-500/10 text-green-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        )}>
                            {openState.label}
                        </span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Clock size={13} />
                        {openState.detail}
                    </p>
                    {shops.length > 1 && (
                        <select
                            value={selectedShopId || shopConfig.shopId}
                            onChange={(event) => setSelectedShopId(event.target.value)}
                            className="mt-3 w-full bg-background-subtle border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                        >
                            {shops.map((shop) => (
                                <option key={shop.shopId} value={shop.shopId}>
                                    {shop.shopName} - {shop.location}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="border border-border bg-background-card p-4 rounded-2xl">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-foreground">Recent orders</h2>
                        <button
                            type="button"
                            onClick={() => navigate('/my-orders')}
                            className="text-xs font-bold text-primary hover:text-primary-hover"
                        >
                            View all
                        </button>
                    </div>
                    <div className="mt-3 space-y-2">
                        {recentOrders.length > 0 ? recentOrders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => navigate('/my-orders')}
                                className="flex w-full items-center justify-between gap-3 text-left text-xs"
                            >
                                <span className="min-w-0 truncate text-foreground-muted">
                                    #{order.orderToken || order.id.slice(-6)} - {order.status}
                                </span>
                                <span className="shrink-0 font-bold text-foreground">₹{order.totalAmount.toFixed(0)}</span>
                            </button>
                        )) : (
                            <p className="text-xs text-foreground-muted">No recent orders yet.</p>
                        )}
                    </div>
                </div>

                <div className="border border-border bg-background-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                        <ReceiptText size={16} className="text-primary" />
                        <h2 className="text-sm font-bold text-foreground">Recent files</h2>
                    </div>
                    <div className="mt-3 space-y-2">
                        {recentFiles.length > 0 ? recentFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 text-xs">
                                <FileText size={14} className="text-foreground-muted shrink-0" />
                                <span className="min-w-0 flex-1 truncate text-foreground-muted">{file.name}</span>
                                <span className="shrink-0 text-[10px] uppercase text-foreground-muted">{file.status}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-foreground-muted">Uploaded print files will appear here after checkout.</p>
                        )}
                    </div>
                </div>
            </section>

            <div className="min-h-0 flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">

            {/* ======= DESKTOP: 3-Column Premium Grid ======= */}
            <div className="hidden lg:grid grid-cols-12 gap-6 w-full h-full max-h-[calc(100vh-140px)]">
                {/* LEFT — Upload */}
                <div className="col-span-4 bg-background-card border border-border rounded-2xl p-6 overflow-y-auto no-scrollbar">
                    <UploadCard
                        files={files}
                        onFilesAdded={handleFilesAdded}
                        onFileRemove={handleFileRemove}
                        onFilePreview={setPreviewFileId}
                        onCloudPick={handleCloudPick}
                        cloudProvider={cloudProvider}
                    />
                </div>

                {/* CENTER — Settings */}
                <div className="col-span-4 bg-background-card border border-border rounded-2xl p-5 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <SettingsCard
                        options={options}
                        onChange={setOptions}
                        pageCount={totalPages}
                        pricing={pricing}
                    />
                </div>

                {/* RIGHT — Summary */}
                <div className="col-span-4 bg-background-card border border-border rounded-2xl p-6 overflow-y-auto no-scrollbar">
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
            <div className="lg:hidden flex items-center justify-between mb-8 px-2 bg-background-card p-4 rounded-2xl border border-border">
                {[0, 1, 2].map((s) => (
                    <div key={s} className="flex flex-1 items-center last:flex-none">
                        <div className={cn(
                            "size-10 flex items-center justify-center rounded-xl text-sm font-black transition-all duration-500",
                            step === s
                                ? "bg-primary text-foreground scale-110 shadow-glow-red"
                                : step > s
                                    ? "bg-green-900/20 text-foreground rounded-xl"
                                    : "bg-background-card border border-border rounded-xl text-foreground-muted"
                        )}>
                            {step > s ? <Check size={18} strokeWidth={3} /> : s + 1}
                        </div>
                        {s < 2 && (
                            <div className="flex-1 h-[2px] mx-3 bg-background-card overflow-hidden rounded-full">
                                <div className={cn(
                                    "h-full transition-all duration-700 ease-out",
                                    step > s ? "w-full bg-green-900/20" : "w-0"
                                )} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile: Stepper Views */}
            <div className="lg:hidden flex-1 pb-32">
                <div className="animate-in">
                    {step === 0 && (
                        <UploadStep
                            files={files}
                            onFilesAdded={handleFilesAdded}
                            onFileRemove={handleFileRemove}
                            onFilePreview={setPreviewFileId}
                            onCloudPick={handleCloudPick}
                            onNext={() => setStep(1)}
                            canContinue={!isDisabled}
                            cloudProvider={cloudProvider}
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
                            file={lastFile ? lastFile.file : null}
                            totalPrice={totalPrice}
                            onAddToCart={handleAddToCart}
                            disabled={isDisabled}
                            onPageCountChange={(count) => lastFile && handleUpdatePageCount(lastFile.id, count)}
                            pageRangeText={options.pageRangeText}
                            onPageRangeChange={(value) => setOptions((prev) => ({ ...prev, pageRangeText: value }))}
                        />
                    )}
                </div>
            </div>
            </div>
            <DocumentPreviewModal
                item={previewItem}
                pageRangeText={options.pageRangeText}
                onClose={() => setPreviewFileId(null)}
                onPageRangeChange={(value) => setOptions((prev) => ({ ...prev, pageRangeText: value }))}
                onPageCountChange={handleUpdatePageCount}
            />
        </div>
    );
};
