import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { encodeRecentCursor, encodeMatchCursor } from '../src/services/requirement.service';

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

    // Complete User 1 Profile & Commitment
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

    await request(app)
      .put('/api/v1/me/commitment')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        hoursPerWeek: 40,
        availability: 'FULL',
        minMonths: 12,
        equityExpectation: 20,
        compensationPref: 'EQUITY',
      });

    // Complete User 2 Profile & Commitment
    await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'User Two',
        city: 'Austin',
        industry: 'Tech',
        skills: ['MARKETING'],
        experienceYears: 8,
      });

    await request(app)
      .put('/api/v1/me/commitment')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        hoursPerWeek: 40,
        availability: 'FULL',
        minMonths: 12,
        equityExpectation: 20,
        compensationPref: 'EQUITY',
      });
  });

  it('should block requirement creation if user profile is incomplete', async () => {
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

  it('should create requirement when profile is complete, set equityOfferMax, and sanitize contact info output', async () => {
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
        equityOfferMax: 40,
        ownerContributes: 'Product Strategy & Capital',
      });

    expect(res.status).toBe(201);
    expect(res.body.requirement.id).toBeDefined();
    expect(res.body.requirement.title).toBe('Building AI Agent Workflow Engine');
    expect(res.body.requirement.equityOfferMax).toBe(40);
    expect(res.body.requirement.ownerContributes).toBe('Product Strategy & Capital');
    expect(res.body.requirement.startupName).toBe('AgentX'); // Owner sees their own startupName even if startupNamePublic is false
    expect(res.body.requirement.owner.name).toBe('User One');
    expect(res.body.requirement.owner.email).toBeUndefined();
    expect(res.body.requirement.owner.shareablePhone).toBeUndefined();
  });

  it('should enforce startupName visibility rules for list, detail, and owner view', async () => {
    // User 1 creates requirement with startupNamePublic = false
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Stealth Startup Search',
        needSkill: 'TECH',
        startupName: 'SecretCo',
        startupNamePublic: false,
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
        equityOfferMax: 30,
      });

    const reqId = reqRes.body.requirement.id;

    // 1. Owner views detail -> sees startupName "SecretCo"
    const ownerDetail = await request(app)
      .get(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body.requirement.startupName).toBe('SecretCo');

    // 2. Owner views /mine -> sees startupName "SecretCo"
    const ownerMine = await request(app)
      .get('/api/v1/requirements/mine')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ownerMine.status).toBe(200);
    const mineItem = ownerMine.body.requirements.find((r: any) => r.id === reqId);
    expect(mineItem.startupName).toBe('SecretCo');

    // 3. Non-owner (User 2) views detail -> startupName is undefined
    const nonOwnerDetail = await request(app)
      .get(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(nonOwnerDetail.status).toBe(200);
    expect(nonOwnerDetail.body.requirement.startupName).toBeUndefined();

    // 4. Non-owner (User 2) views browse list -> startupName is undefined
    const nonOwnerBrowse = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(nonOwnerBrowse.status).toBe(200);
    const browseItem = nonOwnerBrowse.body.items.find((i: any) => i.id === reqId);
    expect(browseItem).toBeDefined();
    expect(browseItem.startupName).toBeUndefined();
  });

  it('should exclude own requirements from caller browse feed and return score: null for owner', async () => {
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'User 1 Requirement',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });
    const reqId = reqRes.body.requirement.id;

    const ownerDetail = await request(app)
      .get(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body.requirement.score).toBeNull();
    expect(ownerDetail.body.requirement.breakdown).toBeNull();

    const mineRes = await request(app)
      .get('/api/v1/requirements/mine')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(mineRes.status).toBe(200);
    expect(mineRes.body.requirements[0].score).toBeNull();

    const browse2 = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(browse2.status).toBe(200);
    const item = browse2.body.items.find((i: any) => i.id === reqId);
    expect(item).toBeDefined();
    expect(item.score).not.toBeNull();
    expect(typeof item.score).toBe('number');
    expect(item.breakdown).toBeDefined();
    expect(item.reasons.length).toBeGreaterThan(0);
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
        equityOfferMax: 25,
      });
    const reqId = reqRes.body.requirement.id;

    const forbiddenPatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Hacked Title' });

    expect(forbiddenPatch.status).toBe(403);

    const closePatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'CLOSED', equityOfferMax: 30 });

    expect(closePatch.status).toBe(200);
    expect(closePatch.body.requirement.status).toBe('CLOSED');
    expect(closePatch.body.requirement.equityOfferMax).toBe(30);

    const reopenPatch = await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'ACTIVE' });

    expect(reopenPatch.status).toBe(400);
    expect(reopenPatch.body.error.code).toBe('INVALID_INPUT');
  });

  it('should return score: null when candidate profile or commitment is incomplete', async () => {
    const regIncomplete = await request(app).post('/api/v1/auth/register').send({
      email: 'user_inc@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    const incToken = regIncomplete.body.tokens.accessToken;

    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Test Req',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });

    const detail = await request(app)
      .get(`/api/v1/requirements/${reqRes.body.requirement.id}`)
      .set('Authorization', `Bearer ${incToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.requirement.score).toBeNull();
    expect(detail.body.requirement.breakdown).toBeNull();
    expect(detail.body.requirement.reasons).toEqual(['Complete your profile to see your score']);

    const browse = await request(app)
      .get('/api/v1/requirements')
      .set('Authorization', `Bearer ${incToken}`);

    expect(browse.status).toBe(200);
    expect(browse.body.items[0].score).toBeNull();
    expect(browse.body.items[0].reasons).toEqual(['Complete your profile to see your score']);
  });

  it('should handle sort=match descending order and paginate across 3 pages without duplicates', async () => {
    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'High Match Marketing Req',
      needSkill: 'MARKETING',
      industry: 'Tech',
      stage: 'GROWTH',
      commitment: 'FULL',
      equityOfferMax: 50,
    });

    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'Medium Match Tech Req 1',
      needSkill: 'TECH',
      industry: 'Tech',
      stage: 'IDEA',
      commitment: 'FULL',
      equityOfferMax: 30,
    });

    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'Medium Match Tech Req 2',
      needSkill: 'TECH',
      industry: 'Tech',
      stage: 'IDEA',
      commitment: 'FULL',
      equityOfferMax: 30,
    });

    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'Low Match Finance Req',
      needSkill: 'FINANCE',
      industry: 'Fintech',
      stage: 'IDEA',
      commitment: 'PART',
      equityOfferMax: 10,
    });

    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'Low Match Sales Req',
      needSkill: 'SALES',
      industry: 'Real Estate',
      stage: 'IDEA',
      commitment: 'WEEKEND',
      equityOfferMax: 5,
    });

    const page1 = await request(app)
      .get('/api/v1/requirements?sort=match&limit=2')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.items.length).toBe(2);
    expect(page1.body.items[0].score).toBeGreaterThanOrEqual(page1.body.items[1].score);
    expect(page1.body.nextCursor).not.toBeNull();

    const page2 = await request(app)
      .get(`/api/v1/requirements?sort=match&limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.items.length).toBe(2);
    expect(page2.body.items[0].score).toBeGreaterThanOrEqual(page2.body.items[1].score);
    expect(page2.body.nextCursor).not.toBeNull();

    const p1Ids = page1.body.items.map((i: any) => i.id);
    const p2Ids = page2.body.items.map((i: any) => i.id);
    const duplicates = p1Ids.filter((id: string) => p2Ids.includes(id));
    expect(duplicates.length).toBe(0);

    const page3 = await request(app)
      .get(`/api/v1/requirements?sort=match&limit=2&cursor=${page2.body.nextCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(page3.status).toBe(200);
    expect(page3.body.items.length).toBe(1);
    expect(page3.body.nextCursor).toBeNull();
  });

  it('should return 400 when cursor mode does not match sort mode', async () => {
    const recentCursor = encodeRecentCursor(new Date(), 'some-id');

    const matchRes = await request(app)
      .get(`/api/v1/requirements?sort=match&cursor=${recentCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(matchRes.status).toBe(400);
    expect(matchRes.body.error.code).toBe('INVALID_INPUT');

    const matchCursor = encodeMatchCursor(85, 'some-id');

    const recentRes = await request(app)
      .get(`/api/v1/requirements?sort=recent&cursor=${matchCursor}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(recentRes.status).toBe(400);
    expect(recentRes.body.error.code).toBe('INVALID_INPUT');
  });

  it('should fallback to recent order when sort=match is requested by incomplete caller', async () => {
    const regIncomplete = await request(app).post('/api/v1/auth/register').send({
      email: 'user_inc2@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    const incToken = regIncomplete.body.tokens.accessToken;

    await request(app).post('/api/v1/requirements').set('Authorization', `Bearer ${user1Token}`).send({
      title: 'Req 1',
      needSkill: 'TECH',
      industry: 'Tech',
      stage: 'IDEA',
      commitment: 'FULL',
    });

    const res = await request(app)
      .get('/api/v1/requirements?sort=match')
      .set('Authorization', `Bearer ${incToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].score).toBeNull();
  });
});
