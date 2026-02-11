
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Inspection ---');

    // 1. Check Users
    const users = await prisma.user.findMany();
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => console.log(` - ${u.name} (${u.email}) [${u.role}] ID: ${u.id}`));

    // 2. Check Shops
    const shops = await prisma.shop.findMany();
    console.log(`Total Shops: ${shops.length}`);

    // 3. Check Orders
    const orders = await prisma.order.findMany({
        include: { user: true }
    });
    console.log(`Total Orders: ${orders.length}`);
    orders.forEach(o => {
        console.log(` - Order ${o.id}: Status=${o.status}, UserId=${o.userId}, UserEmail=${o.userEmail}`);
    });

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
