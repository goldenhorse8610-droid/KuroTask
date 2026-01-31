import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    // For Serverless/Free-tier environments, keep connections minimal
    // Note: connection_limit is also present in the DATABASE_URL query string
});

export default prisma;
