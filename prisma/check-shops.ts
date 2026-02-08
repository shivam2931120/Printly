
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Shop Table...');

    const shops = await prisma.shop.findMany();
    console.log('Shops found:', shops);

    if (shops.length === 0) {
        console.log('No shops found. Creating default shop...');
        const defaultShop = await prisma.shop.create({
            data: {
                id: 'default',
                shopName: 'Printly',
                email: 'admin@printly.in'
            }
        });
        console.log('Created Default Shop:', defaultShop);
    } else {
        console.log('Existing Shops:', shops.map(s => ({ id: s.id, name: s.shopName })));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
