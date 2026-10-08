import dotenv from 'dotenv';
import path from 'path';

// Load .env.test environment variables BEFORE importing Prisma
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

const dbUrl = process.env.DATABASE_URL || '';
const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'unknown';

console.log(`\n==================================================`);
console.log(`[Jest Setup] Target Database: ${dbName}`);
console.log(`==================================================\n`);

// CRITICAL SAFETY CHECK: Refuse to run tests unless DATABASE_URL contains '_test'
if (!dbUrl.includes('_test')) {
  throw new Error(`FATAL SAFETY ERROR: Refusing to run tests! DATABASE_URL "${dbUrl}" does not contain "_test".`);
}

import { prisma } from '../src/lib/prisma';

beforeAll(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDatabase() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.commitmentProfile.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.verificationRecord.deleteMany();
  await prisma.user.deleteMany();
}
