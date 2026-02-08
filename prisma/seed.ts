
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'shivam.bgp@outlook.com';
    const password = 'Sh@2931120'; // In a real app, hash this!

    // Clean up existing user if exists
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`User ${email} already exists. Updating role...`);
            await prisma.user.update({
                where: { email },
                data: {
                    role: Role.DEVELOPER,
                    password: password, // Update password
                },
            });

            // Ensure Shop exists
            let shop = await prisma.shop.findFirst({ where: { users: { some: { email } } } });
            if (!shop) {
                shop = await prisma.shop.create({
                    data: {
                        shopName: 'Shivam\'s Print Shop',
                        users: { connect: { email } },
                        // Demo products removed
                        // products: {
                        //     create: []
                        // }
                    }
                });
            } else {
                // Ensure products exist (simplified: count check)
                const count = await prisma.product.count({ where: { shopId: shop.id } });
                if (count === 0) {
                    console.log('Shop exists but has no products. Skipping demo data seeding as per request.');
                    // await prisma.product.createMany({ ... });
                }
            }
        } else {
            console.log(`Creating new user ${email}...`);
            await prisma.user.create({
                data: {
                    email,
                    password,
                    name: 'Shivam (Developer)',
                    role: Role.DEVELOPER,
                    shop: {
                        create: {
                            shopName: 'Shivam\'s Print Shop',
                            tagline: 'Premium Printing Services',
                            operatingHours: '9:00 AM - 9:00 PM',
                            location: 'Main Campus',
                            contact: 'shivam.bgp@outlook.com',
                            email: 'shivam.bgp@outlook.com',
                            // products: {
                            //     create: [...]
                            // }
                        }
                    }
                },
            });
        }

        console.log('Seeding completed successfully.');
    } catch (e) {
        console.error('Error during seeding:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
