
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jteydozmrscfvltwpxaw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZXlkb3ptcnNjZnZsdHdweGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MTY5ODQsImV4cCI6MjA4NjA5Mjk4NH0.CLNsZ9v58LHBlX_yH08s7PeNwESBze-frnhP82RUQy4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log('Testing Supabase Connection with Anon Key...');

    // Try fetching products
    const { data, error } = await supabase
        .from('Product')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching products:', error);
    } else {
        console.log('Successfully fetched products:', data);
    }

    // Try creating a dummy order (simulating guest checkout)
    const orderId = `TEST-${Date.now()}`;
    const { data: orderData, error: orderError } = await supabase
        .from('Order')
        .insert({
            id: orderId,
            orderToken: `TEST-${Date.now()}`,
            userEmail: 'test@example.com',
            userName: 'Test User',
            totalAmount: 10,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            shopId: 'default',
            updatedAt: new Date().toISOString()
        })
        .select()
        .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
    } else {
        console.log('Successfully created order:', orderData);
        // Clean up
        await supabase.from('Order').delete().eq('id', orderId);
    }
}

main();
