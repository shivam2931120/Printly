
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Order Table Columns...');

  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Order' AND table_schema = 'public';
  `;

  console.log('Order Columns:', JSON.stringify(columns, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
