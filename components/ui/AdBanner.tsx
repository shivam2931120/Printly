import React, { useEffect } from 'react';

declare global {
 interface Window {
 adsbygoogle?: unknown[];
 }
}

interface AdBannerProps {
 dataAdSlot: string;
 dataAdFormat?: string;
 dataFullWidthResponsive?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
 dataAdSlot,
 dataAdFormat = "auto",
 dataFullWidthResponsive = true,
}) => {
 const adClient = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID;

 useEffect(() => {
 if (!adClient || !dataAdSlot) return;
 try {
 window.adsbygoogle = window.adsbygoogle || [];
 window.adsbygoogle.push({});
 } catch (error) {
 console.error("AdSense error", error);
 }
 }, [adClient, dataAdSlot]);

 if (!adClient || !dataAdSlot) return null;

 return (
 <div className="my-4 overflow-hidden border border-border bg-background-card p-2 text-center">
 <p className="mb-2 text-xs text-foreground-muted">Advertisement</p>
 <ins
 className="adsbygoogle block"
 style={{ display: "block" }}
 data-ad-client={adClient}
 data-ad-slot={dataAdSlot}
 data-ad-format={dataAdFormat}
 data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
 />
 </div>
 );
};
