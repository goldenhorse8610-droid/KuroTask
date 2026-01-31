const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Task';
        `;
        console.log('Columns in Task table:');
        console.table(result);
    } catch (e) {
        console.error('Failed to query columns:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
