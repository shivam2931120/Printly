
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'Order';
    `;
        console.log('RLS Policies for Order table:', JSON.stringify(policies, null, 2));

        const totalOrders = await prisma.order.count();
        console.log('Total Orders in DB (via Prisma):', totalOrders);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
