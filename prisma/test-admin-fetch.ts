
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Testing Admin Order Fetch...');
    const adminId = 'user_39RM3ozIzESDPqBJZG99xpuuMbq'; // ID from inspect-db output

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
