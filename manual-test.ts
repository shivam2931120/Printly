import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or anon key. Set SUPABASE_URL/VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const generatePickupToken = () => Math.floor(1000 + Math.random() * 9000).toString();

async function main() {
    console.log('Testing Supabase connection with anon key...');

    const { data, error } = await supabase
        .from('Product')
        .select('id,name,isActive')
        .limit(1);

    if (error) {
        console.error('Error fetching products:', error);
    } else {
        console.log('Successfully fetched products:', data);
    }

    const { data: shop, error: shopError } = await supabase
        .from('Shop')
        .select('id,name')
        .eq('isActive', true)
        .limit(1)
        .maybeSingle();

    if (shopError) {
        console.error('Error fetching active shop:', shopError);
    } else {
        console.log('Active shop:', shop || 'none');
    }

    if (!supabaseServiceKey) {
        console.log('Skipping order write test because SUPABASE_SERVICE_ROLE_KEY is not set.');
        return;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });

    const orderId = `TEST-${Date.now()}`;
    const { data: orderData, error: orderError } = await adminClient
        .from('Order')
        .delete()
        .eq('id', orderId)
        .select();

    if (orderError) {
        console.error('Pre-test cleanup failed:', orderError);
        return;
    }

    if (orderData?.length) {
        console.log('Removed stale test order:', orderData.length);
    }

    const { data: insertedOrder, error: insertError } = await adminClient
        .from('Order')
        .insert({
            id: orderId,
            orderToken: generatePickupToken(),
            userEmail: 'test@example.com',
            userName: 'Test User',
            items: [],
            totalAmount: 10,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            shopId: shop?.id || null,
            updatedAt: new Date().toISOString()
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error creating order:', insertError);
    } else {
        console.log('Successfully created order:', insertedOrder);
        const { error: cleanupError } = await adminClient.from('Order').delete().eq('id', orderId);
        if (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        } else {
            console.log('Cleaned up test order.');
        }
    }
}

main();
