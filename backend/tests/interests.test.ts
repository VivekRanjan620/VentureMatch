import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { setDailyInterestCapOverride } from '../src/config/env';

describe('Interests & State Machine Integration Tests', () => {
  let ownerToken: string;
  let ownerId: string;
  let cand1Token: string;
  let cand1Id: string;
  let cand2Token: string;
  let cand2Id: string;
  let reqId: string;

  beforeEach(async () => {
    setDailyInterestCapOverride(null); // Reset override

    // Register Owner
    const regOwner = await request(app).post('/api/v1/auth/register').send({
      email: 'owner_int@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    ownerToken = regOwner.body.tokens.accessToken;
    ownerId = regOwner.body.user.id;

    // Register Candidate 1
    const regCand1 = await request(app).post('/api/v1/auth/register').send({
      email: 'cand1_int@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    cand1Token = regCand1.body.tokens.accessToken;
    cand1Id = regCand1.body.user.id;

    // Register Candidate 2
    const regCand2 = await request(app).post('/api/v1/auth/register').send({
      email: 'cand2_int@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    cand2Token = regCand2.body.tokens.accessToken;
    cand2Id = regCand2.body.user.id;

    // Complete Owner Profile
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${ownerToken}`).send({
      name: 'Owner User',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['PRODUCT'],
      experienceYears: 10,
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${ownerToken}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 50,
      compensationPref: 'EQUITY',
    });

    // Complete Candidate 1 Profile
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${cand1Token}`).send({
      name: 'Candidate One',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['TECH'],
      experienceYears: 5,
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${cand1Token}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 20,
      compensationPref: 'EQUITY',
    });

    // Complete Candidate 2 Profile
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${cand2Token}`).send({
      name: 'Candidate Two',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['MARKETING'],
      experienceYears: 6,
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${cand2Token}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 25,
      compensationPref: 'EQUITY',
    });

    // Owner creates requirement
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'CTO Wanted for AI Engine',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'MVP',
        commitment: 'FULL',
        equityOfferMax: 50,
      });
    reqId = reqRes.body.requirement.id;
  });

  afterEach(() => {
    setDailyInterestCapOverride(null);
  });

  it('should block interest creation if profile is incomplete or if owner tries on own requirement', async () => {
    // Incomplete user
    const regInc = await request(app).post('/api/v1/auth/register').send({
      email: 'inc_int@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    const incToken = regInc.body.tokens.accessToken;

    const incRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${incToken}`)
      .send({});
    expect(incRes.status).toBe(403);
    expect(incRes.body.error.code).toBe('FORBIDDEN');

    // Owner on own requirement
    const ownerRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(ownerRes.status).toBe(403);
    expect(ownerRes.body.error.code).toBe('FORBIDDEN');
  });

  it('should reject client-sent score in request body', async () => {
    const res = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({ score: 100 }); // strict Zod rejects unknown fields

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('should create interest with server-side score snapshot and reject duplicate interest with 409 CONFLICT', async () => {
    const res1 = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});

    expect(res1.status).toBe(201);
    expect(res1.body.interest.id).toBeDefined();
    expect(res1.body.interest.status).toBe('PENDING');
    expect(res1.body.interest.score).not.toBeNull();
    expect(res1.body.interest.breakdown).toBeDefined();

    // Duplicate attempt -> 409 CONFLICT
    const res2 = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('CONFLICT');
  });

  it('should enforce daily interest cap and return 429 DAILY_LIMIT_REACHED', async () => {
    setDailyInterestCapOverride(1); // Set cap to 1

    // First interest succeeds
    const res1 = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});
    expect(res1.status).toBe(201);

    // Create 2nd requirement by owner
    const reqRes2 = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Req 2',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });

    // Second interest exceeds cap -> 429
    const res2 = await request(app)
      .post(`/api/v1/requirements/${reqRes2.body.requirement.id}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});

    expect(res2.status).toBe(429);
    expect(res2.body.error.code).toBe('DAILY_LIMIT_REACHED');
  });

  it('should list interests for requirement owner only and hide private contact fields', async () => {
    // Candidate 1 expresses interest
    await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});

    // Non-owner attempts to view GET /requirements/:id/interests -> 404
    const nonOwnerRes = await request(app)
      .get(`/api/v1/requirements/${reqId}/interests`)
      .set('Authorization', `Bearer ${cand1Token}`);

    expect(nonOwnerRes.status).toBe(404);

    // Owner views interests
    const ownerRes = await request(app)
      .get(`/api/v1/requirements/${reqId}/interests`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.items.length).toBe(1);

    const candidateData = ownerRes.body.items[0].candidate;
    expect(candidateData.name).toBe('Candidate One');
    expect(candidateData.email).toBeUndefined();
    expect(candidateData.shareablePhone).toBeUndefined();
    expect(candidateData.shareableEmail).toBeUndefined();
  });

  it('should execute state machine transitions, reject illegal transitions with 409 INVALID_TRANSITION, and wrong actor with 403', async () => {
    const intRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});
    const interestId = intRes.body.interest.id;

    // Candidate trying to accept -> 403 FORBIDDEN
    const wrongActorRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({ action: 'accept' });
    expect(wrongActorRes.status).toBe(403);

    // Outsider trying to access -> 404 NOT_FOUND
    const outsiderRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${cand2Token}`)
      .send({ action: 'accept' });
    expect(outsiderRes.status).toBe(404);

    // Owner marks LATER
    const laterRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'later' });
    expect(laterRes.status).toBe(200);
    expect(laterRes.body.interest.status).toBe('LATER');

    // Owner accepts
    const acceptRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'accept' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.interest.status).toBe('ACCEPTED');
    expect(acceptRes.body.connection).toBeDefined();

    // Illegal transition from ACCEPTED -> 409 INVALID_TRANSITION
    const illegalRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'decline' });
    expect(illegalRes.status).toBe(409);
    expect(illegalRes.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('should handle race condition safely with simultaneous accepts (Promise.all)', async () => {
    const intRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});
    const interestId = intRes.body.interest.id;

    // Fire 2 parallel accept requests
    const [res1, res2] = await Promise.all([
      request(app).patch(`/api/v1/interests/${interestId}`).set('Authorization', `Bearer ${ownerToken}`).send({ action: 'accept' }),
      request(app).patch(`/api/v1/interests/${interestId}`).set('Authorization', `Bearer ${ownerToken}`).send({ action: 'accept' }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // Verify exactly 1 connection and 1 conversation created in DB
    const connCount = await prisma.connection.count({ where: { interestId } });
    expect(connCount).toBe(1);
    const convCount = await prisma.conversation.count();
    expect(convCount).toBe(1);
  });

  it('should prevent accept when requirement status is CLOSED', async () => {
    const intRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${cand1Token}`)
      .send({});
    const interestId = intRes.body.interest.id;

    // Close requirement
    await request(app)
      .patch(`/api/v1/requirements/${reqId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'CLOSED' });

    // Accept attempt -> 409 CONFLICT
    const acceptRes = await request(app)
      .patch(`/api/v1/interests/${interestId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'accept' });

    expect(acceptRes.status).toBe(409);
  });

  it('should paginate GET /me/interests across 3 pages without duplicates', async () => {
    // Create 5 requirements by owner
    const reqIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await request(app)
        .post('/api/v1/requirements')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: `Paginated Interest Req ${i}`,
          needSkill: 'TECH',
          industry: 'Tech',
          stage: 'IDEA',
          commitment: 'FULL',
        });
      reqIds.push(r.body.requirement.id);
    }

    // Candidate 1 expresses interest in all 5
    for (const rId of reqIds) {
      await request(app)
        .post(`/api/v1/requirements/${rId}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Page 1 (limit 2)
    const page1 = await request(app)
      .get('/api/v1/me/interests?limit=2')
      .set('Authorization', `Bearer ${cand1Token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.items.length).toBe(2);
    expect(page1.body.nextCursor).not.toBeNull();

    // Page 2 (limit 2)
    const page2 = await request(app)
      .get(`/api/v1/me/interests?limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', `Bearer ${cand1Token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.items.length).toBe(2);
    expect(page2.body.nextCursor).not.toBeNull();

    const p1Ids = page1.body.items.map((i: any) => i.id);
    const p2Ids = page2.body.items.map((i: any) => i.id);
    const duplicates = p1Ids.filter((id: string) => p2Ids.includes(id));
    expect(duplicates.length).toBe(0);

    // Page 3 (limit 2)
    const page3 = await request(app)
      .get(`/api/v1/me/interests?limit=2&cursor=${page2.body.nextCursor}`)
      .set('Authorization', `Bearer ${cand1Token}`);

    expect(page3.status).toBe(200);
    expect(page3.body.items.length).toBe(1);
    expect(page3.body.nextCursor).toBeNull();
  });
});
