import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const dbUrl = new URL(process.env.DATABASE_URL || '');

const pool = new Pool({
    user: dbUrl.username,
    password: String(dbUrl.password),
    host: dbUrl.hostname,
    port: Number(dbUrl.port),
    database: dbUrl.pathname.slice(1)
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
