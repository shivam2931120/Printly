
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load local environment. .env.local wins when both files define a key.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
}

createBucket();
