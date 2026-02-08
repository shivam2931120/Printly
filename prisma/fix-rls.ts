
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Reloading PostgREST Schema Cache...');

    try {
        // Reload PostgREST schema cache
        await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema';`);
        console.log('Schema reload triggered.');

        // Re-apply schema usage just in case
        await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO anon;`);

        console.log('Done.');
    } catch (e) {
        console.error('Error reloading schema:', e);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
