import { PrismaClient, Role, Availability, CompensationPref, Visibility, RequirementStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding VentureMatch database...');

  // Clean existing data
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

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // User 1: Tech Founder
  const founder1 = await prisma.user.create({
    data: {
      email: 'alex.founder@example.com',
      passwordHash,
      role: Role.FOUNDER,
      verificationRecords: {
        create: {
          type: 'EMAIL',
          method: 'self-declared',
        },
      },
      profile: {
        create: {
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
      },
      commitmentProfile: {
        create: {
          hoursPerWeek: 50,
          availability: Availability.FULL,
          minMonths: 12,
          canInvestAmount: 25000,
          contributes: ['PRODUCT', 'FINANCE', 'OPERATIONS'],
          equityExpectation: 50,
          compensationPref: CompensationPref.EQUITY,
          remote: true,
        },
      },
    },
  });

  // User 2: Senior Technical Seeker
  const seeker1 = await prisma.user.create({
    data: {
      email: 'elena.seeker@example.com',
      passwordHash,
      role: Role.SEEKER,
      verificationRecords: {
        create: {
          type: 'EMAIL',
          method: 'self-declared',
        },
      },
      profile: {
        create: {
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
      },
      commitmentProfile: {
        create: {
          hoursPerWeek: 45,
          availability: Availability.FULL,
          minMonths: 18,
          canInvestAmount: 15000,
          contributes: ['TECH'],
          equityExpectation: 45,
          compensationPref: CompensationPref.EQUITY,
          remote: true,
        },
      },
    },
  });

  // User 3: Serial Founder (BOTH)
  const founder2 = await prisma.user.create({
    data: {
      email: 'marcus.both@example.com',
      passwordHash,
      role: Role.BOTH,
      verificationRecords: {
        create: {
          type: 'EMAIL',
          method: 'self-declared',
        },
      },
      profile: {
        create: {
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
      },
      commitmentProfile: {
        create: {
          hoursPerWeek: 60,
          availability: Availability.FULL,
          minMonths: 24,
          canInvestAmount: 50000,
          contributes: ['FINANCE', 'OPERATIONS'],
          equityExpectation: 50,
          compensationPref: CompensationPref.REV_SHARE,
          remote: false,
        },
      },
    },
  });

  // User 4: Growth / Marketing Seeker
  const seeker2 = await prisma.user.create({
    data: {
      email: 'sarah.growth@example.com',
      passwordHash,
      role: Role.SEEKER,
      verificationRecords: {
        create: {
          type: 'EMAIL',
          method: 'self-declared',
        },
      },
      profile: {
        create: {
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
      },
      commitmentProfile: {
        create: {
          hoursPerWeek: 30,
          availability: Availability.PART,
          minMonths: 6,
          canInvestAmount: 10000,
          contributes: ['MARKETING'],
          equityExpectation: 25,
          compensationPref: CompensationPref.SALARY,
          remote: true,
        },
      },
    },
  });

  // User 5: Product & Design Co-founder (BOTH)
  const seeker3 = await prisma.user.create({
    data: {
      email: 'david.design@example.com',
      passwordHash,
      role: Role.BOTH,
      verificationRecords: {
        create: {
          type: 'EMAIL',
          method: 'self-declared',
        },
      },
      profile: {
        create: {
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
      },
      commitmentProfile: {
        create: {
          hoursPerWeek: 40,
          availability: Availability.FULL,
          minMonths: 12,
          canInvestAmount: 20000,
          contributes: ['DESIGN', 'PRODUCT'],
          equityExpectation: 40,
          compensationPref: CompensationPref.EQUITY,
          remote: true,
        },
      },
    },
  });

  // Create sample requirements for seeded users
  await prisma.requirement.create({
    data: {
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
      commitment: 'FULL',
      location: 'San Francisco, CA',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  await prisma.requirement.create({
    data: {
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
      commitment: 'FULL',
      location: 'Austin, TX',
      remote: false,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  await prisma.requirement.create({
    data: {
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
      commitment: 'PART',
      location: 'Toronto, Canada',
      remote: true,
      visibility: Visibility.PUBLIC,
      status: RequirementStatus.ACTIVE,
    },
  });

  console.log('Seed completed successfully! 5 sample users created.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
