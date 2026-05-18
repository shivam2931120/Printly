
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load explicit env first, then local fallbacks. Earlier files win.
[
    process.env.DOTENV_CONFIG_PATH,
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
].filter(Boolean).forEach((envPath) => dotenv.config({ path: envPath as string, quiet: true }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

if (process.env.CONFIRM_RESET_DB !== 'YES') {
    console.error("Refusing to wipe data. Set CONFIRM_RESET_DB=YES to run this script.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
});

async function resetDb() {
    console.log("Starting DB Wipe...");

    // 1. Delete Orders (items are now embedded JSONB, no separate table)
    const { error: ordersError } = await supabase.from('Order').delete().neq('id', 'dummy');
    if (ordersError) console.error("Error deleting Order:", ordersError);
    else console.log("Deleted Orders.");

    // 2. Delete Users (Local Cache)
    // Be careful not to delete ALL properly if using anon key (only self).
    // If service role, deletes all.
    const { error: usersError } = await supabase.from('User').delete().neq('id', 'dummy');
    if (usersError) console.error("Error deleting User:", usersError);
    else console.log("Deleted Users.");

    console.log("DB Wipe Complete.");
}

resetDb();
