import { PrismaClient, Role, Availability, CompensationPref, Visibility, RequirementStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const isResetMode = process.argv.includes('--reset') || process.env.RESET_DB === 'true';

  if (isResetMode) {
    const allowReset = process.env.ALLOW_DB_RESET === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (!allowReset || isProduction) {
      console.error('ERROR: Refusing to reset database! ALLOW_DB_RESET=true must be set and NODE_ENV must not be "production".');
      process.exit(1);
    }

    console.log('ALLOW_DB_RESET=true verified. Clearing existing database records...');
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

  console.log('Seeding VentureMatch database (NON-destructive upsert mode)...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // User 1: Tech Founder
  const founder1 = await prisma.user.upsert({
    where: { email: 'alex.founder@example.com' },
    update: {
      passwordHash,
      role: Role.FOUNDER,
    },
    create: {
      email: 'alex.founder@example.com',
      passwordHash,
      role: Role.FOUNDER,
    },
  });

  await prisma.profile.upsert({
    where: { userId: founder1.id },
    update: {
      name: 'Alex Rivera',
      city: 'San Francisco, CA',
      ageRange: '28-34',
      industry: 'Artificial Intelligence',
      bio: 'Serial entrepreneur, previously built B2B dev tools. Looking for a technical co-founder to build NextGen AI workflows.',
      skills: ['PRODUCT', 'TECH', 'SALES'],
      experienceYears: 8,
      previousStartup: true,
      currentWork: 'Building VentureMatch',
      shareablePhone: '+1-555-0192',
      shareableEmail: 'alex.rivera@example.com',
    },
    create: {
      userId: founder1.id,
      name: 'Alex Rivera',
      city: 'San Francisco, CA',
      ageRange: '28-34',
      industry: 'Artificial Intelligence',
      bio: 'Serial entrepreneur, previously built B2B dev tools. Looking for a technical co-founder to build NextGen AI workflows.',
      skills: ['PRODUCT', 'TECH', 'SALES'],
      experienceYears: 8,
      previousStartup: true,
      currentWork: 'Building VentureMatch',
      shareablePhone: '+1-555-0192',
      shareableEmail: 'alex.rivera@example.com',
    },
  });

  await prisma.commitmentProfile.upsert({
    where: { userId: founder1.id },
    update: {
      hoursPerWeek: 50,
      availability: Availability.FULL,
      minMonths: 12,
      canInvestAmount: 25000,
      contributes: ['PRODUCT', 'FINANCE', 'OPERATIONS'],
      equityExpectation: 50,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
    create: {
      userId: founder1.id,
      hoursPerWeek: 50,
      availability: Availability.FULL,
      minMonths: 12,
      canInvestAmount: 25000,
      contributes: ['PRODUCT', 'FINANCE', 'OPERATIONS'],
      equityExpectation: 50,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
  });

  const vRecord1 = await prisma.verificationRecord.findFirst({
    where: { userId: founder1.id, type: 'EMAIL' },
  });
  if (!vRecord1) {
    await prisma.verificationRecord.create({
      data: { userId: founder1.id, type: 'EMAIL', method: 'self-declared' },
    });
  }

  // User 2: Senior Technical Seeker
  const seeker1 = await prisma.user.upsert({
    where: { email: 'elena.seeker@example.com' },
    update: {
      passwordHash,
      role: Role.SEEKER,
    },
    create: {
      email: 'elena.seeker@example.com',
      passwordHash,
      role: Role.SEEKER,
    },
  });

  await prisma.profile.upsert({
    where: { userId: seeker1.id },
    update: {
      name: 'Elena Rostova',
      city: 'New York, NY',
      ageRange: '25-30',
      industry: 'Software Engineering',
      bio: 'Ex-Google Staff Engineer. Specialized in distributed systems and LLM infrastructure. Looking for an ambitious co-founder.',
      skills: ['TECH'],
      experienceYears: 7,
      previousStartup: false,
      currentWork: 'Staff Engineer at BigTech',
      shareablePhone: '+1-555-0144',
      shareableEmail: 'elena.rostova@example.com',
    },
    create: {
      userId: seeker1.id,
      name: 'Elena Rostova',
      city: 'New York, NY',
      ageRange: '25-30',
      industry: 'Software Engineering',
      bio: 'Ex-Google Staff Engineer. Specialized in distributed systems and LLM infrastructure. Looking for an ambitious co-founder.',
      skills: ['TECH'],
      experienceYears: 7,
      previousStartup: false,
      currentWork: 'Staff Engineer at BigTech',
      shareablePhone: '+1-555-0144',
      shareableEmail: 'elena.rostova@example.com',
    },
  });

  await prisma.commitmentProfile.upsert({
    where: { userId: seeker1.id },
    update: {
      hoursPerWeek: 45,
      availability: Availability.FULL,
      minMonths: 18,
      canInvestAmount: 15000,
      contributes: ['TECH'],
      equityExpectation: 45,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
    create: {
      userId: seeker1.id,
      hoursPerWeek: 45,
      availability: Availability.FULL,
      minMonths: 18,
      canInvestAmount: 15000,
      contributes: ['TECH'],
      equityExpectation: 45,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
  });

  const vRecord2 = await prisma.verificationRecord.findFirst({
    where: { userId: seeker1.id, type: 'EMAIL' },
  });
  if (!vRecord2) {
    await prisma.verificationRecord.create({
      data: { userId: seeker1.id, type: 'EMAIL', method: 'self-declared' },
    });
  }

  // User 3: Serial Founder (BOTH)
  const founder2 = await prisma.user.upsert({
    where: { email: 'marcus.both@example.com' },
    update: {
      passwordHash,
      role: Role.BOTH,
    },
    create: {
      email: 'marcus.both@example.com',
      passwordHash,
      role: Role.BOTH,
    },
  });

  await prisma.profile.upsert({
    where: { userId: founder2.id },
    update: {
      name: 'Marcus Vance',
      city: 'Austin, TX',
      ageRange: '35-42',
      industry: 'Fintech',
      bio: '1x exit in payments. Currently scaling a novel cross-border settlement engine. Seeking a growth/marketing lead.',
      skills: ['FINANCE', 'SALES'],
      experienceYears: 12,
      previousStartup: true,
      currentWork: 'Founder & CEO',
      shareablePhone: '+1-555-0831',
      shareableEmail: 'marcus.vance@example.com',
    },
    create: {
      userId: founder2.id,
      name: 'Marcus Vance',
      city: 'Austin, TX',
      ageRange: '35-42',
      industry: 'Fintech',
      bio: '1x exit in payments. Currently scaling a novel cross-border settlement engine. Seeking a growth/marketing lead.',
      skills: ['FINANCE', 'SALES'],
      experienceYears: 12,
      previousStartup: true,
      currentWork: 'Founder & CEO',
      shareablePhone: '+1-555-0831',
      shareableEmail: 'marcus.vance@example.com',
    },
  });

  await prisma.commitmentProfile.upsert({
    where: { userId: founder2.id },
    update: {
      hoursPerWeek: 60,
      availability: Availability.FULL,
      minMonths: 24,
      canInvestAmount: 50000,
      contributes: ['FINANCE', 'OPERATIONS'],
      equityExpectation: 50,
      compensationPref: CompensationPref.REV_SHARE,
      remote: false,
    },
    create: {
      userId: founder2.id,
      hoursPerWeek: 60,
      availability: Availability.FULL,
      minMonths: 24,
      canInvestAmount: 50000,
      contributes: ['FINANCE', 'OPERATIONS'],
      equityExpectation: 50,
      compensationPref: CompensationPref.REV_SHARE,
      remote: false,
    },
  });

  const vRecord3 = await prisma.verificationRecord.findFirst({
    where: { userId: founder2.id, type: 'EMAIL' },
  });
  if (!vRecord3) {
    await prisma.verificationRecord.create({
      data: { userId: founder2.id, type: 'EMAIL', method: 'self-declared' },
    });
  }

  // User 4: Growth / Marketing Seeker
  const seeker2 = await prisma.user.upsert({
    where: { email: 'sarah.growth@example.com' },
    update: {
      passwordHash,
      role: Role.SEEKER,
    },
    create: {
      email: 'sarah.growth@example.com',
      passwordHash,
      role: Role.SEEKER,
    },
  });

  await prisma.profile.upsert({
    where: { userId: seeker2.id },
    update: {
      name: 'Sarah Chen',
      city: 'Seattle, WA',
      ageRange: '28-34',
      industry: 'Growth & Marketing',
      bio: 'VP Growth with track record scaling SaaS from $0 to $10M ARR. Passionate about AI consumer products.',
      skills: ['MARKETING', 'SALES'],
      experienceYears: 9,
      previousStartup: true,
      currentWork: 'Head of Growth',
      shareablePhone: '+1-555-0482',
      shareableEmail: 'sarah.chen@example.com',
    },
    create: {
      userId: seeker2.id,
      name: 'Sarah Chen',
      city: 'Seattle, WA',
      ageRange: '28-34',
      industry: 'Growth & Marketing',
      bio: 'VP Growth with track record scaling SaaS from $0 to $10M ARR. Passionate about AI consumer products.',
      skills: ['MARKETING', 'SALES'],
      experienceYears: 9,
      previousStartup: true,
      currentWork: 'Head of Growth',
      shareablePhone: '+1-555-0482',
      shareableEmail: 'sarah.chen@example.com',
    },
  });

  await prisma.commitmentProfile.upsert({
    where: { userId: seeker2.id },
    update: {
      hoursPerWeek: 30,
      availability: Availability.PART,
      minMonths: 6,
      canInvestAmount: 10000,
      contributes: ['MARKETING'],
      equityExpectation: 25,
      compensationPref: CompensationPref.SALARY,
      remote: true,
    },
    create: {
      userId: seeker2.id,
      hoursPerWeek: 30,
      availability: Availability.PART,
      minMonths: 6,
      canInvestAmount: 10000,
      contributes: ['MARKETING'],
      equityExpectation: 25,
      compensationPref: CompensationPref.SALARY,
      remote: true,
    },
  });

  const vRecord4 = await prisma.verificationRecord.findFirst({
    where: { userId: seeker2.id, type: 'EMAIL' },
  });
  if (!vRecord4) {
    await prisma.verificationRecord.create({
      data: { userId: seeker2.id, type: 'EMAIL', method: 'self-declared' },
    });
  }

  // User 5: Product & Design Co-founder (BOTH)
  const seeker3 = await prisma.user.upsert({
    where: { email: 'david.design@example.com' },
    update: {
      passwordHash,
      role: Role.BOTH,
    },
    create: {
      email: 'david.design@example.com',
      passwordHash,
      role: Role.BOTH,
    },
  });

  await prisma.profile.upsert({
    where: { userId: seeker3.id },
    update: {
      name: 'David Kim',
      city: 'Toronto, Canada',
      ageRange: '30-36',
      industry: 'Design & UX',
      bio: 'Design Director turned founder. Crafted interfaces used by 50M+ users. Seeking engineering partner.',
      skills: ['DESIGN', 'PRODUCT'],
      experienceYears: 10,
      previousStartup: false,
      currentWork: 'Design Director',
      shareablePhone: '+1-555-0923',
      shareableEmail: 'david.kim@example.com',
    },
    create: {
      userId: seeker3.id,
      name: 'David Kim',
      city: 'Toronto, Canada',
      ageRange: '30-36',
      industry: 'Design & UX',
      bio: 'Design Director turned founder. Crafted interfaces used by 50M+ users. Seeking engineering partner.',
      skills: ['DESIGN', 'PRODUCT'],
      experienceYears: 10,
      previousStartup: false,
      currentWork: 'Design Director',
      shareablePhone: '+1-555-0923',
      shareableEmail: 'david.kim@example.com',
    },
  });

  await prisma.commitmentProfile.upsert({
    where: { userId: seeker3.id },
    update: {
      hoursPerWeek: 40,
      availability: Availability.FULL,
      minMonths: 12,
      canInvestAmount: 20000,
      contributes: ['DESIGN', 'PRODUCT'],
      equityExpectation: 40,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
    create: {
      userId: seeker3.id,
      hoursPerWeek: 40,
      availability: Availability.FULL,
      minMonths: 12,
      canInvestAmount: 20000,
      contributes: ['DESIGN', 'PRODUCT'],
      equityExpectation: 40,
      compensationPref: CompensationPref.EQUITY,
      remote: true,
    },
  });

  const vRecord5 = await prisma.verificationRecord.findFirst({
    where: { userId: seeker3.id, type: 'EMAIL' },
  });
  if (!vRecord5) {
    await prisma.verificationRecord.create({
      data: { userId: seeker3.id, type: 'EMAIL', method: 'self-declared' },
    });
  }

  // Stable Requirements (Deterministic UUIDs)
  const req1Id = '11111111-1111-1111-1111-111111111111';
  await prisma.requirement.upsert({
    where: { id: req1Id },
    update: {
      ownerId: founder1.id,
      title: 'CTO & Co-Founder for AI Workflow Automation',
      needSkill: 'TECH',
      startupName: 'AgenticFlow',
      startupNamePublic: true,
      industry: 'Artificial Intelligence',
      stage: 'MVP',
      currentUsers: 150,
      ownerContributes: 'Product Strategy, 100k angel funding raised, sales pipeline',
      offer: '40-50% Equity',
      equityOfferMax: 50,
      commitment: 'FULL',
      location: 'San Francisco, CA',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
    create: {
      id: req1Id,
      ownerId: founder1.id,
      title: 'CTO & Co-Founder for AI Workflow Automation',
      needSkill: 'TECH',
      startupName: 'AgenticFlow',
      startupNamePublic: true,
      industry: 'Artificial Intelligence',
      stage: 'MVP',
      currentUsers: 150,
      ownerContributes: 'Product Strategy, 100k angel funding raised, sales pipeline',
      offer: '40-50% Equity',
      equityOfferMax: 50,
      commitment: 'FULL',
      location: 'San Francisco, CA',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  const req2Id = '22222222-2222-2222-2222-222222222222';
  await prisma.requirement.upsert({
    where: { id: req2Id },
    update: {
      ownerId: founder2.id,
      title: 'Growth & Marketing Co-Founder for Cross-Border Fintech',
      needSkill: 'MARKETING',
      startupName: 'PayGlobal',
      startupNamePublic: false,
      industry: 'Fintech',
      stage: 'GROWTH',
      currentUsers: 12000,
      ownerContributes: '$500k ARR, 1x Exit Founder, Core tech platform',
      offer: '20-30% Equity + Revenue Share',
      equityOfferMax: 30,
      commitment: 'FULL',
      location: 'Austin, TX',
      remote: false,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
    create: {
      id: req2Id,
      ownerId: founder2.id,
      title: 'Growth & Marketing Co-Founder for Cross-Border Fintech',
      needSkill: 'MARKETING',
      startupName: 'PayGlobal',
      startupNamePublic: false,
      industry: 'Fintech',
      stage: 'GROWTH',
      currentUsers: 12000,
      ownerContributes: '$500k ARR, 1x Exit Founder, Core tech platform',
      offer: '20-30% Equity + Revenue Share',
      equityOfferMax: 30,
      commitment: 'FULL',
      location: 'Austin, TX',
      remote: false,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  const req3Id = '33333333-3333-3333-3333-333333333333';
  await prisma.requirement.upsert({
    where: { id: req3Id },
    update: {
      ownerId: seeker3.id,
      title: 'Technical Co-Founder for AI Design Assistant',
      needSkill: 'TECH',
      startupName: 'DesignAI',
      startupNamePublic: true,
      industry: 'Design & AI',
      stage: 'IDEA',
      currentUsers: 0,
      ownerContributes: 'UI/UX Design, User Research',
      offer: '35-50% Equity',
      equityOfferMax: 50,
      commitment: 'PART',
      location: 'Toronto, Canada',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
    create: {
      id: req3Id,
      ownerId: seeker3.id,
      title: 'Technical Co-Founder for AI Design Assistant',
      needSkill: 'TECH',
      startupName: 'DesignAI',
      startupNamePublic: true,
      industry: 'Design & AI',
      stage: 'IDEA',
      currentUsers: 0,
      ownerContributes: 'UI/UX Design, User Research',
      offer: '35-50% Equity',
      equityOfferMax: 50,
      commitment: 'PART',
      location: 'Toronto, Canada',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  console.log('Seed completed successfully (5 sample users & requirements upserted)!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
