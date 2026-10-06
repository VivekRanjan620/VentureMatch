import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { encodeCursor } from '../src/services/requirement.service';

describe('Requirements CRUD, Browse & Search Integration Tests', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

  beforeEach(async () => {
    // Register User 1
    const reg1 = await request(app).post('/api/v1/auth/register').send({
      email: 'founder1@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    user1Token = reg1.body.tokens.accessToken;
    user1Id = reg1.body.user.id;

    // Register User 2
    const reg2 = await request(app).post('/api/v1/auth/register').send({
      email: 'founder2@example.com',
      password: 'Password123!',
      role: 'BOTH',
    });
    user2Token = reg2.body.tokens.accessToken;
    user2Id = reg2.body.user.id;

    // Complete User 1 Profile
    await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'User One',
        city: 'San Francisco',
        industry: 'Tech',
        skills: ['TECH'],
        experienceYears: 5,
      });

    // Complete User 2 Profile
    await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'User Two',
        city: 'Austin',
        industry: 'Fintech',
        skills: ['MARKETING'],
        experienceYears: 8,
      });
  });

  it('should block requirement creation if user profile is incomplete', async () => {
    // Create User 3 with incomplete profile
    const reg3 = await request(app).post('/api/v1/auth/register').send({
      email: 'incomplete@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    const user3Token = reg3.body.tokens.accessToken;

    const res = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user3Token}`)
      .send({
        title: 'Need CTO',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'MVP',
        commitment: 'FULL',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should create requirement when profile is complete and sanitize contact info output', async () => {
    const res = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Building AI Agent Workflow Engine',
        needSkill: 'TECH',
        startupName: 'AgentX',
        startupNamePublic: false,
        industry: 'Artificial Intelligence',
        stage: 'MVP',
        commitment: 'FULL',
        ownerContributes: 'Product Strategy & Capital',
      });

    expect(res.status).toBe(201);
    expect(res.body.requirement.id).toBeDefined();
    expect(res.body.requirement.title).toBe('Building AI Agent Workflow Engine');
    expect(res.body.requirement.ownerContributes).toBe('Product Strategy & Capital');
    expect(res.body.requirement.startupName).toBeUndefined(); // Hidden because startupNamePublic is false
    expect(res.body.requirement.owner.name).toBe('User One');
    expect(res.body.requirement.owner.email).toBeUndefined();
    expect(res.body.requirement.owner.shareablePhone).toBeUndefined();
  });

  it('should exclude own requirements from caller browse feed', async () => {
    // User 1 creates requirement
    await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'User 1 Requirement',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });

    // User 1 browses
    const browse1 = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(browse1.status).toBe(200);
    expect(browse1.body.items.some((i: any) => i.owner.id === user1Id)).toBe(false);

    // User 2 browses (should see User 1 requirement)
    const browse2 = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browse2.status).toBe(200);
    expect(browse2.body.items.some((i: any) => i.owner.id === user1Id)).toBe(true);
  });

  it('should enforce ownership on PATCH and prevent reopening CLOSED requirement', async () => {
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Updatable Req',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });
    const reqId = reqRes.body.requirement.id;

    // User 2 attempts to update User 1 requirement -> 403
    const forbiddenPatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Hacked Title' });

    expect(forbiddenPatch.status).toBe(403);

    // Owner closes requirement
    const closePatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'CLOSED' });

    expect(closePatch.status).toBe(200);
    expect(closePatch.body.requirement.status).toBe('CLOSED');

    // Attempt to reopen CLOSED requirement -> 400
    const reopenPatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'ACTIVE' });

    expect(reopenPatch.status).toBe(400);
    expect(reopenPatch.body.error.code).toBe('INVALID_INPUT');
  });

  it('should hide PAUSED and CLOSED requirements from browse feed and return 404 for non-owners', async () => {
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Paused Requirement',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });
    const reqId = reqRes.body.requirement.id;

    // Owner pauses requirement
    await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'PAUSED' });

    // Non-owner browses -> requirement missing
    const browseRes = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browseRes.body.items.some((i: any) => i.id === reqId)).toBe(false);

    // Non-owner accesses GET /requirements/:id -> 404
    const detailRes = await request(app)
      .get(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(detailRes.status).toBe(404);

    // Owner accesses GET /requirements/:id -> 200 OK
    const ownerDetail = await request(app)
      .get(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body.requirement.id).toBe(reqId);
  });

  it('should safely handle search operators like +foo -bar* "x and short 2-letter queries (AI)', async () => {
    // Create requirement containing AI
    await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'AI Dev Specialist Needed',
        needSkill: 'TECH',
        industry: 'Artificial Intelligence',
        stage: 'MVP',
        commitment: 'FULL',
      });

    // Short term query "AI" (2 characters, uses LIKE fallback)
    const shortSearch = await request(app)
      .get('/api/v1/requirements?q=AI')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(shortSearch.status).toBe(200);
    expect(shortSearch.body.items.length).toBeGreaterThan(0);
    expect(shortSearch.body.items[0].title).toContain('AI');

    // Query with boolean operators should not error out
    const operatorSearch = await request(app)
      .get('/api/v1/requirements?q=+AI -Dev* "specialist"')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(operatorSearch.status).toBe(200);

    // Wildcard % search should be escaped and not match everything
    const percentSearch = await request(app)
      .get('/api/v1/requirements?q=%')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(percentSearch.status).toBe(200);
    expect(percentSearch.body.items.length).toBe(0);
  });

  it('should return 400 for invalid cursor string', async () => {
    const res = await request(app)
      .get('/api/v1/requirements?cursor=invalid_base64_string_xyz')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('should paginate across 3 pages without duplicates and return nextCursor null on last page', async () => {
    // Create 5 requirements by User 1
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post('/api/v1/requirements')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: `Paginated Req ${i}`,
          needSkill: 'TECH',
          industry: 'Software',
          stage: 'IDEA',
          commitment: 'FULL',
        });
      // Slight delay to ensure distinct createdAt timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Page 1 (limit 2)
    const page1 = await request(app)
      .get('/api/v1/requirements?limit=2')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.items.length).toBe(2);
    expect(page1.body.nextCursor).not.toBeNull();

    // Page 2 (limit 2 using nextCursor)
    const page2 = await request(app)
      .get(`/api/v1/requirements?limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.items.length).toBe(2);
    expect(page2.body.nextCursor).not.toBeNull();

    // Verify no duplicates between Page 1 and Page 2
    const p1Ids = page1.body.items.map((i: any) => i.id);
    const p2Ids = page2.body.items.map((i: any) => i.id);
    const intersection = p1Ids.filter((id: string) => p2Ids.includes(id));
    expect(intersection.length).toBe(0);

    // Page 3 (limit 2)
    const page3 = await request(app)
      .get(`/api/v1/requirements?limit=2&cursor=${page2.body.nextCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page3.status).toBe(200);
    expect(page3.body.items.length).toBe(1);
    expect(page3.body.nextCursor).toBeNull();
  });

  it('should enforce VERIFIED_ONLY visibility rule and block bidirectional exclusion', async () => {
    // User 1 creates VERIFIED_ONLY requirement
    const verifiedReq = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Verified Only Co-Founder Search',
        needSkill: 'TECH',
        industry: 'Fintech',
        stage: 'GROWTH',
        commitment: 'FULL',
        visibility: 'VERIFIED_ONLY',
      });

    const vReqId = verifiedReq.body.requirement.id;

    // User 2 has no LinkedIn/Phone record -> hidden from browse
    const browseUnverified = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browseUnverified.body.items.some((i: any) => i.id === vReqId)).toBe(false);

    // User 2 links LinkedIn account
    await request(app)
      .post('/api/v1/me/verification/linkedin')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ linkedinUrl: 'https://linkedin.com/in/user2' });

    // User 2 browses again -> now visible!
    const browseVerified = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browseVerified.body.items.some((i: any) => i.id === vReqId)).toBe(true);

    // Block test: User 1 blocks User 2
    await prisma.block.create({
      data: {
        blockerId: user1Id,
        blockedId: user2Id,
      },
    });

    // User 2 browses -> User 1 requirement is now excluded due to block
    const browseBlocked = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browseBlocked.body.items.some((i: any) => i.id === vReqId)).toBe(false);
  });
});
