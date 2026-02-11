
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding get_admin_orders RPC function...');

    try {
        // Drop existing function if any
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS get_admin_orders;`);

        // Create the function
        // It returns SETOF "Order" so Supabase can map it to the Order model style
        await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION get_admin_orders(requesting_user_id text)
      RETURNS SETOF "Order"
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Check if the requesting user is an admin or developer
        IF EXISTS (
          SELECT 1 FROM "User"
          WHERE id = requesting_user_id
          AND (role = 'ADMIN' OR role = 'DEVELOPER')
        ) THEN
          -- Return all orders
          RETURN QUERY SELECT * FROM "Order" ORDER BY "createdAt" DESC;
        ELSE
          -- Return empty set if not authorized
          RETURN;
        END IF;
      END;
      $$;
    `);

        console.log('Function get_admin_orders created successfully.');

        // Grant execute permission to anon/authenticated roles so Supabase client can call it
        // The security definer part ensures it runs with privileges of the creator (postgres/admin)
        // but we still need to allow the API to call it.
        await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION get_admin_orders(text) TO anon, authenticated, service_role;`);

        console.log('Permissions granted.');

        // Notify PostgREST to reload schema
        await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema';`);

    } catch (e) {
        console.error('Error creating RPC function:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
