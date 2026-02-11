
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load .env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Testing Anon Client Order Creation...');

    const testUserId = 'user_TEST_' + Date.now();
    const testOrder = {
        id: 'order_test_' + Date.now(),
        orderToken: 'TOKEN_123',
        userId: testUserId,
        userEmail: 'test@example.com',
        userName: 'Test User',
        totalAmount: 100,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        shopId: 'default', // Might fail if logic relies on auto-resolving
        items: []
    };

    // 1. Try Upsert User
    console.log('Upserting User...');
    const { error: userError } = await supabase.from('User').upsert({
        id: testUserId,
        email: testOrder.userEmail,
        name: testOrder.userName,
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }, { onConflict: 'id' });

    if (userError) {
        console.error('User Upsert Failed:', userError);
    } else {
        console.log('User Upsert Success');
    }

    // 2. Try Create Order (Simplified)
    console.log('Creating Order...');

    // Attempt to get shop first (like in data.ts)
    const { data: shop } = await supabase.from('Shop').select('id').limit(1).single();
    const shopId = shop?.id;
    console.log('Using Shop ID:', shopId);

    const { data: orderData, error: orderError } = await supabase
        .from('Order')
        .insert({
            id: testOrder.id,
            orderToken: testOrder.orderToken,
            userId: testUserId,
            totalAmount: testOrder.totalAmount,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            shopId: shopId,
            updatedAt: new Date().toISOString()
        })
        .select()
        .single();

    if (orderError) {
        console.error('Order Creation Failed:', orderError);
    } else {
        console.log('Order Creation Success:', orderData);
    }
}

main();
