import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
});

async function main() {
    console.log('Testing Admin Order Fetch...');
    const configuredAdminId = process.env.TEST_ADMIN_AUTH_ID;
    const { data: adminUsers, error: userError } = await supabase
        .from('User')
        .select('authId,email,role')
        .in('role', ['ADMIN', 'DEVELOPER'])
        .limit(10);

    if (userError) {
        console.error('Failed to find admin/developer user:', userError);
        process.exit(1);
    }

    const adminId = configuredAdminId || adminUsers?.find((user: any) => user.authId)?.authId;
    if (!adminId) {
        console.error('No admin/developer authId found. Set TEST_ADMIN_AUTH_ID to run this check.');
        process.exit(1);
    }

    const { data, error } = await supabase
        .rpc('get_admin_orders', { requesting_user_id: adminId })
        .select('*');

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log(`Fetched ${data.length} orders via RPC.`);
        data.forEach((o: any) => console.log(` - ${o.id} [${o.status}]`));
    }
}

main();
