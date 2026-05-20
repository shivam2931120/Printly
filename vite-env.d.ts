/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_RAZORPAY_KEY_ID: string;
    readonly VITE_FORMSPREE_ENDPOINT: string;
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly VITE_GOOGLE_PICKER_API_KEY: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_GOOGLE_APP_ID?: string;
    readonly VITE_ONEDRIVE_CLIENT_ID: string;
    readonly VITE_ONEDRIVE_REDIRECT_URI?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
