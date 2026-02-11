import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding mark_order_collected RPC function...');

    // This function allows a user to mark THEIR OWN order as completed (collected)
    // It verifies that the auth.uid() matches the order's userId
    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION mark_order_collected(order_id text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            target_user_id text;
        BEGIN
            -- Get the user_id of the order
            SELECT "userId" INTO target_user_id FROM "Order" WHERE id = order_id;

            -- Check if the order exists
            IF target_user_id IS NULL THEN
                RAISE EXCEPTION 'Order not found';
            END IF;

            -- Verify the current user owns the order (or is a service_role/admin if we expanded scope, but here strict for user)
            -- Note: For generic use, checking auth.uid() is standard.
            IF auth.uid()::text != target_user_id THEN
                RAISE EXCEPTION 'Not authorized';
            END IF;

            -- Update status
            UPDATE "Order"
            SET status = 'COMPLETED',
                "updatedAt" = now()
            WHERE id = order_id;
        END;
        $$;
    `);

    // Grant access to authenticated users
    await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION mark_order_collected(text) TO authenticated;`);
    await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION mark_order_collected(text) TO service_role;`);

    // Notify PostgREST to reload schema
    await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema';`);

    console.log('Function mark_order_collected created successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
