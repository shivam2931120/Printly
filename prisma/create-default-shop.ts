
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating Default Shop...');

    try {
        const defaultShop = await prisma.shop.upsert({
            where: { id: 'default' },
            update: {},
            create: {
                id: 'default',
                shopName: 'Printly',
                tagline: 'College Print Shop',
                operatingHours: '9:00 AM - 6:00 PM',
                location: 'Main Campus',
                contact: 'contact@printly.in',
                email: 'admin@printly.in',
                isActive: true
            }
        });
        console.log('Default Shop ensured:', defaultShop);
    } catch (e) {
        console.error('Error creating default shop:', e);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
