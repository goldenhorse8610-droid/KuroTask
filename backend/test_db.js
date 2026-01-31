const { PrismaClient } = require('@prisma/client');

async function testPort(port, query) {
    const url = `postgresql://postgres.frrzczlplslsrjftssgg:KuroTask_Strong_2026@aws-1-ap-southeast-1.pooler.supabase.com:${port}/postgres${query}`;
    console.log(`Testing URL: ${url}`);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        await prisma.$connect();
        const count = await prisma.user.count();
        console.log(`Success! Port ${port}, Query: ${query}, User count: ${count}`);
    } catch (e) {
        console.error(`Failed! Port ${port}, Query: ${query}, Error: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await testPort('5432', '?connection_limit=1');
    await testPort('6543', '?pgbouncer=true&connection_limit=1');

    // Testing Direct Host (Non-pooler)
    const directUrl = `postgresql://postgres:KuroTask_Strong_2026@db.frrzczlplslsrjftssgg.supabase.co:5432/postgres?connection_limit=1`;
    console.log(`Testing Direct URL: ${directUrl}`);
    const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
    try {
        await prisma.$connect();
        console.log(`Success! Direct Host Port 5432`);
    } catch (e) {
        console.error(`Failed! Direct Host Port 5432, Error: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
