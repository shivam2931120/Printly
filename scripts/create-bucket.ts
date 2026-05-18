
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load explicit env first, then local fallbacks. Earlier files win.
[
    process.env.DOTENV_CONFIG_PATH,
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
].filter(Boolean).forEach((envPath) => dotenv.config({ path: envPath as string, quiet: true }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
];

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log('Attempting to create "prints" bucket...');

    const { data, error } = await supabase.storage.createBucket('prints', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024,
        allowedMimeTypes
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "prints" already exists.');
            const { error: updateError } = await supabase.storage.updateBucket('prints', {
                public: true,
                fileSizeLimit: 50 * 1024 * 1024,
                allowedMimeTypes
            });
            if (updateError) {
                console.error('Error updating bucket:', updateError);
                process.exit(1);
            }
            console.log('Bucket "prints" configuration updated.');
        } else {
            console.error('Error creating bucket:', error);
            process.exit(1);
        }
    } else {
        console.log('Bucket "prints" created successfully:', data);
    }

    // Set Policy (Optional via API, usually done via SQL/Dashboard, but verifying access)
    console.log('Bucket setup validation complete.');
}

createBucket();
