
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Warning: Using anon key might not have delete permissions due to RLS.
// Ideally should use service_role key if available for full wipe,
// but let's try with what we have first, assuming the user's RLS policy allows deletion of own data.
// If this fails, we ask user to do it manually or provide service key.
// UPDATE: The request is to delete ALL "data", implying admin wipe.
// Checking if we have a service role key in env... usually not in client env.
// Let's look for service key.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !serviceKey)) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey!);

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
