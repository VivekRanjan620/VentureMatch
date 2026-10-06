import dotenv from 'dotenv';
import path from 'path';

// Load .env.test environment variables BEFORE importing Prisma
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

import { prisma } from '../src/lib/prisma';

// CRITICAL SAFETY CHECK: Refuse to run tests unless DATABASE_URL contains '_test'
const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl.includes('_test')) {
  console.error('FATAL ERROR: Refusing to run tests! DATABASE_URL does not contain "_test".');
  console.error(`Current DATABASE_URL: ${dbUrl}`);
  process.exit(1);
}

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
