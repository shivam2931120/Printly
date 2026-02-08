import React, { useEffect } from 'react';

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
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
            console.error("AdSense error", error);
        }
    }, []);

    return (
        <div className="my-4 overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-2 text-center">
            <p className="mb-2 text-xs text-slate-400">Advertisement</p>
            <ins
                className="adsbygoogle block"
                style={{ display: "block" }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with actual Client ID
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive ? "true" : "false"}
            />
        </div>
    );
};
