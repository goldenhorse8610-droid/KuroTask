import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['error', 'warn'],
    // Use short timeout to avoid hanging
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

export default prisma;
