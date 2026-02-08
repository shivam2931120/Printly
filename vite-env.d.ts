/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_RAZORPAY_KEY_ID: string;
    readonly VITE_FORMSPREE_ENDPOINT: string;
    readonly VITE_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
