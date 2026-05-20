import { ensurePdfFileName, MAX_PRINT_FILE_SIZE_BYTES, PDF_MIME_TYPE } from './printFiles';

export type CloudProvider = 'google-drive' | 'onedrive';

export interface CloudProviderStatus {
    provider: CloudProvider;
    label: string;
    configured: boolean;
    missingEnv: string[];
    message?: string;
}

interface GooglePickerDocument {
    id?: string;
    name?: string;
    mimeType?: string;
    [key: string]: any;
}

interface OneDriveItem {
    name?: string;
    size?: number;
    '@microsoft.graph.downloadUrl'?: string;
}

interface OneDriveResponse {
    value?: OneDriveItem[];
}

declare global {
    interface Window {
        gapi?: any;
        google?: any;
        OneDrive?: any;
    }
}

const scriptPromises = new Map<string, Promise<void>>();
let googlePickerPromise: Promise<void> | null = null;

const loadScript = (src: string) => {
    if (scriptPromises.has(src)) return scriptPromises.get(src)!;

    const promise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing?.dataset.loaded === 'true') {
            resolve();
            return;
        }
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(script);
    });

    scriptPromises.set(src, promise);
    return promise;
};

const isSet = (value: string | undefined) => Boolean(value?.trim());

export const getCloudProviderStatus = (provider: CloudProvider): CloudProviderStatus => {
    const requiredEnv = provider === 'google-drive'
        ? [
            ['VITE_GOOGLE_CLIENT_ID', import.meta.env.VITE_GOOGLE_CLIENT_ID],
            ['VITE_GOOGLE_PICKER_API_KEY', import.meta.env.VITE_GOOGLE_PICKER_API_KEY],
        ]
        : [['VITE_ONEDRIVE_CLIENT_ID', import.meta.env.VITE_ONEDRIVE_CLIENT_ID]];
    const missingEnv = requiredEnv
        .filter(([, value]) => !isSet(value))
        .map(([name]) => name);
    const label = provider === 'google-drive' ? 'Google Drive' : 'OneDrive';

    return {
        provider,
        label,
        configured: missingEnv.length === 0,
        missingEnv,
        message: missingEnv.length === 0
            ? undefined
            : `${label} upload is not configured. Missing ${missingEnv.join(', ')}.`,
    };
};

export const getCloudProviderStatuses = () => ({
    googleDrive: getCloudProviderStatus('google-drive'),
    oneDrive: getCloudProviderStatus('onedrive'),
});

const requireConfiguredProvider = (provider: CloudProvider) => {
    const status = getCloudProviderStatus(provider);
    if (!status.configured) {
        throw new Error(status.message);
    }
    return status;
};

const fileFromResponse = async (response: Response, name: string) => {
    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}.`);
    }
    const blob = await response.blob();
    if (blob.size > MAX_PRINT_FILE_SIZE_BYTES) {
        throw new Error(`${name} is larger than 50 MB.`);
    }
    return new File([blob], ensurePdfFileName(name), {
        type: PDF_MIME_TYPE,
        lastModified: Date.now(),
    });
};

const getGoogleDocValue = (doc: GooglePickerDocument, key: string, fallbackKey: string) => {
    const pickerKey = window.google?.picker?.Document?.[key];
    return (pickerKey ? doc[pickerKey] : undefined) || doc[fallbackKey];
};

const loadGooglePickerApi = async () => {
    await loadScript('https://apis.google.com/js/api.js');
    if (!window.gapi) {
        throw new Error('Google Drive picker could not initialize.');
    }

    if (!googlePickerPromise) {
        googlePickerPromise = new Promise<void>((resolve) => {
            window.gapi.load('picker', { callback: resolve });
        });
    }

    await googlePickerPromise;
};

const downloadGoogleDocument = async (doc: GooglePickerDocument, token: string) => {
    const id = getGoogleDocValue(doc, 'ID', 'id');
    const name = getGoogleDocValue(doc, 'NAME', 'name') || 'Drive document.pdf';
    const mimeType = getGoogleDocValue(doc, 'MIME_TYPE', 'mimeType');

    if (!id) {
        throw new Error('Google Drive did not return a file id.');
    }

    const headers = { Authorization: `Bearer ${token}` };
    const encodedId = encodeURIComponent(id);
    const url = mimeType?.startsWith('application/vnd.google-apps.')
        ? `https://www.googleapis.com/drive/v3/files/${encodedId}/export?mimeType=application/pdf`
        : `https://www.googleapis.com/drive/v3/files/${encodedId}?alt=media&supportsAllDrives=true`;

    return fileFromResponse(await fetch(url, { headers }), name);
};

export const openGoogleDrivePdfPicker = async (): Promise<File[]> => {
    requireConfiguredProvider('google-drive');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const developerKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;

    await Promise.all([loadGooglePickerApi(), loadScript('https://accounts.google.com/gsi/client')]);

    if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Drive picker could not initialize.');
    }

    const token = await new Promise<string>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response: any) => {
                if (response?.error) {
                    reject(new Error(response.error_description || response.error));
                    return;
                }
                if (!response?.access_token) {
                    reject(new Error('Google Drive did not return an access token.'));
                    return;
                }
                resolve(response.access_token);
            },
        });
        client.requestAccessToken({ prompt: 'consent' });
    });

    return new Promise<File[]>((resolve, reject) => {
        const picker = window.google.picker;
        const view = new picker.DocsView(picker.ViewId.PDFS)
            .setMimeTypes(PDF_MIME_TYPE)
            .setIncludeFolders(false);

        let builder = new picker.PickerBuilder()
            .setOAuthToken(token)
            .setDeveloperKey(developerKey)
            .setOrigin(window.location.origin)
            .addView(view)
            .enableFeature(picker.Feature.MULTISELECT_ENABLED)
            .enableFeature(picker.Feature.SUPPORT_DRIVES)
            .setCallback(async (data: any) => {
                if (data.action === picker.Action.CANCEL) {
                    resolve([]);
                    return;
                }
                if (data.action !== picker.Action.PICKED) return;

                try {
                    const docs: GooglePickerDocument[] = data.docs || [];
                    const files = await Promise.all(docs.map((doc) => downloadGoogleDocument(doc, token)));
                    resolve(files);
                } catch (error) {
                    reject(error);
                }
            });

        if (import.meta.env.VITE_GOOGLE_APP_ID) {
            builder = builder.setAppId(import.meta.env.VITE_GOOGLE_APP_ID);
        }

        builder.build().setVisible(true);
    });
};

export const openOneDrivePdfPicker = async (): Promise<File[]> => {
    requireConfiguredProvider('onedrive');
    const clientId = import.meta.env.VITE_ONEDRIVE_CLIENT_ID;
    await loadScript('https://js.live.net/v7.2/OneDrive.js');

    if (!window.OneDrive?.open) {
        throw new Error('OneDrive picker could not initialize.');
    }

    return new Promise<File[]>((resolve, reject) => {
        window.OneDrive.open({
            clientId,
            action: 'download',
            multiSelect: true,
            viewType: 'files',
            openInNewWindow: true,
            advanced: {
                filter: '.pdf',
                redirectUri: import.meta.env.VITE_ONEDRIVE_REDIRECT_URI || `${window.location.origin}/onedrive-picker-redirect.html`,
            },
            success: async (response: OneDriveResponse) => {
                try {
                    const items = response.value || [];
                    const files = await Promise.all(items.map(async (item) => {
                        const downloadUrl = item['@microsoft.graph.downloadUrl'];
                        if (!downloadUrl) throw new Error(`${item.name || 'OneDrive file'} did not include a download URL.`);
                        if (item.size && item.size > MAX_PRINT_FILE_SIZE_BYTES) {
                            throw new Error(`${item.name || 'OneDrive file'} is larger than 50 MB.`);
                        }
                        return fileFromResponse(await fetch(downloadUrl), item.name || 'OneDrive document.pdf');
                    }));
                    resolve(files);
                } catch (error) {
                    reject(error);
                }
            },
            cancel: () => resolve([]),
            error: (error: any) => reject(new Error(error?.message || error?.code || 'OneDrive picker failed.')),
        });
    });
};

export const preloadCloudDocumentPickers = async () => {
    if (typeof window === 'undefined') return;
    const { googleDrive, oneDrive } = getCloudProviderStatuses();
    const preloadTasks: Promise<void>[] = [];

    if (googleDrive.configured) {
        preloadTasks.push(loadGooglePickerApi(), loadScript('https://accounts.google.com/gsi/client'));
    }
    if (oneDrive.configured) {
        preloadTasks.push(loadScript('https://js.live.net/v7.2/OneDrive.js'));
    }

    await Promise.allSettled(preloadTasks);
};
