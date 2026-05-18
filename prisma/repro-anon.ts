import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const adminClient = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

const generatePickupToken = () => Math.floor(1000 + Math.random() * 9000).toString();

async function main() {
    console.log('Testing anon client read access and blocked order writes...');

    const { data: product, error: productError } = await supabase
        .from('Product')
        .select('id,name')
        .limit(1);
    if (productError) console.error('Product read failed:', productError);
    else console.log('Product read succeeded:', product);

    const { data: shop, error: shopError } = await supabase
        .from('Shop')
        .select('id')
        .eq('isActive', true)
        .limit(1)
        .maybeSingle();
    if (shopError) console.error('Shop read failed:', shopError);
    console.log('Using Shop ID:', shop?.id || 'none');

    const orderId = 'order_test_' + Date.now();
    const { data: orderData, error: orderError } = await supabase
        .from('Order')
        .insert({
            id: orderId,
            orderToken: generatePickupToken(),
            userEmail: 'anon-test@example.com',
            userName: 'Anon Test User',
            totalAmount: 100,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            shopId: shop?.id || null,
            items: [],
            updatedAt: new Date().toISOString()
        })
        .select('id')
        .maybeSingle();

    if (!orderError) {
        console.error('Anon order creation unexpectedly succeeded:', orderData);
        if (adminClient) {
            await adminClient.from('Order').delete().eq('id', orderId);
            console.log('Cleaned up unexpected anon test order.');
        }
        process.exitCode = 1;
        return;
    }

    console.log('Anon order creation blocked as expected:', orderError.message);
}

main();
