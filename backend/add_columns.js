const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Attempting to add columns to Task table...');

        // Check if columns exist first
        const columns = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Task' AND column_name IN ('plannedStartAt', 'plannedEndAt');
        `;

        console.log('Existing columns:', columns);

        if (columns.length < 2) {
            console.log('Adding missing columns...');
            await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "plannedStartAt" TIMESTAMP(3);`;
            await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "plannedEndAt" TIMESTAMP(3);`;
            console.log('Columns added successfully.');
        } else {
            console.log('Columns already exist.');
        }
    } catch (e) {
        console.error('Operation failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
