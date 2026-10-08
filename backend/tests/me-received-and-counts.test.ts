import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { setDailyInterestCapOverride } from '../src/config/env';

describe('GET /me/received-interests and GET /me/counts Integration Tests', () => {
  let ownerToken: string;
  let ownerId: string;
  let cand1Token: string;
  let cand1Id: string;
  let cand2Token: string;
  let cand2Id: string;
  let cand3Token: string;
  let cand3Id: string;
  let otherToken: string;
  let req1Id: string;
  let req2Id: string;

  beforeEach(async () => {
    setDailyInterestCapOverride(null);

    // Register Owner
    const regOwner = await request(app).post('/api/v1/auth/register').send({
      email: 'owner_me@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    ownerToken = regOwner.body.tokens.accessToken;
    ownerId = regOwner.body.user.id;

    // Register Candidates
    const regCand1 = await request(app).post('/api/v1/auth/register').send({
      email: 'cand1_me@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    cand1Token = regCand1.body.tokens.accessToken;
    cand1Id = regCand1.body.user.id;

    const regCand2 = await request(app).post('/api/v1/auth/register').send({
      email: 'cand2_me@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    cand2Token = regCand2.body.tokens.accessToken;
    cand2Id = regCand2.body.user.id;

    const regCand3 = await request(app).post('/api/v1/auth/register').send({
      email: 'cand3_me@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    cand3Token = regCand3.body.tokens.accessToken;
    cand3Id = regCand3.body.user.id;

    const regOther = await request(app).post('/api/v1/auth/register').send({
      email: 'other_me@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    otherToken = regOther.body.tokens.accessToken;

    // Complete Profiles
    for (const [token, name] of [
      [ownerToken, 'Owner User'],
      [cand1Token, 'Candidate One'],
      [cand2Token, 'Candidate Two'],
      [cand3Token, 'Candidate Three'],
      [otherToken, 'Other Founder'],
    ]) {
      await request(app).put('/api/v1/me').set('Authorization', `Bearer ${token}`).send({
        name,
        city: 'San Francisco',
        industry: 'Tech',
        skills: ['TECH'],
        experienceYears: 5,
        shareablePhone: '+1 555-1234',
        shareableEmail: 'share@example.com',
      });
      await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${token}`).send({
        hoursPerWeek: 40,
        availability: 'FULL',
        minMonths: 12,
        equityExpectation: 20,
        compensationPref: 'EQUITY',
      });
    }

    // Owner creates 2 requirements
    const r1 = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Backend Lead Requirement',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });
    req1Id = r1.body.requirement.id;

    const r2 = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Frontend Lead Requirement',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'IDEA',
        commitment: 'FULL',
      });
    req2Id = r2.body.requirement.id;
  });

  describe('GET /me/received-interests', () => {
    it('returns interests across multiple requirements owned by caller, newest first', async () => {
      // Cand 1 applies to Req 1
      await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Cand 2 applies to Req 2
      await request(app)
        .post(`/api/v1/requirements/${req2Id}/interest`)
        .set('Authorization', `Bearer ${cand2Token}`)
        .send({});

      const res = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].candidate.id).toBe(cand2Id);
      expect(res.body.items[1].candidate.id).toBe(cand1Id);

      // Check requirement subset shape: id, title, status
      expect(res.body.items[0].requirement).toEqual({
        id: req2Id,
        title: 'Frontend Lead Requirement',
        status: 'ACTIVE',
      });
    });

    it('returns empty list for non-owner user', async () => {
      await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      const res = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });

    it('filters by requirementId owned by caller, or returns empty list for someone elses requirementId', async () => {
      await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      // Filter by caller's own requirementId
      const resOwn = await request(app)
        .get(`/api/v1/me/received-interests?requirementId=${req1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resOwn.status).toBe(200);
      expect(resOwn.body.items.length).toBe(1);

      // Filter by someone else's requirementId
      const resOtherReq = await request(app)
        .get(`/api/v1/me/received-interests?requirementId=${req1Id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(resOtherReq.status).toBe(200);
      expect(resOtherReq.body.items).toEqual([]);
      expect(resOtherReq.body.nextCursor).toBeNull();
    });

    it('validates query params strictness (invalid status, uuid, limit, cursor -> 400)', async () => {
      const resStatus = await request(app)
        .get('/api/v1/me/received-interests?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resStatus.status).toBe(400);

      const resUuid = await request(app)
        .get('/api/v1/me/received-interests?requirementId=not-a-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resUuid.status).toBe(400);

      const resLimitHigh = await request(app)
        .get('/api/v1/me/received-interests?limit=100')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resLimitHigh.status).toBe(400);

      const resLimitInvalid = await request(app)
        .get('/api/v1/me/received-interests?limit=abc')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resLimitInvalid.status).toBe(400);

      const resCursor = await request(app)
        .get('/api/v1/me/received-interests?cursor=invalid_base64_json')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(resCursor.status).toBe(400);
    });

    it('paginates across 3 pages without duplicates', async () => {
      // Owner creates 5 requirements
      const reqIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const r = await request(app)
          .post('/api/v1/requirements')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: `Pagination Req ${i}`,
            needSkill: 'TECH',
            industry: 'Tech',
            stage: 'IDEA',
            commitment: 'FULL',
          });
        reqIds.push(r.body.requirement.id);
      }

      for (const rId of reqIds) {
        await request(app)
          .post(`/api/v1/requirements/${rId}/interest`)
          .set('Authorization', `Bearer ${cand1Token}`)
          .send({});
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Page 1
      const p1 = await request(app)
        .get('/api/v1/me/received-interests?limit=2')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(p1.status).toBe(200);
      expect(p1.body.items.length).toBe(2);
      expect(p1.body.nextCursor).not.toBeNull();

      // Page 2
      const p2 = await request(app)
        .get(`/api/v1/me/received-interests?limit=2&cursor=${p1.body.nextCursor}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(p2.status).toBe(200);
      expect(p2.body.items.length).toBe(2);
      expect(p2.body.nextCursor).not.toBeNull();

      // Page 3
      const p3 = await request(app)
        .get(`/api/v1/me/received-interests?limit=2&cursor=${p2.body.nextCursor}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(p3.status).toBe(200);
      expect(p3.body.items.length).toBe(1);
      expect(p3.body.nextCursor).toBeNull();

      // Check duplicate exclusion
      const ids1 = p1.body.items.map((i: any) => i.id);
      const ids2 = p2.body.items.map((i: any) => i.id);
      const ids3 = p3.body.items.map((i: any) => i.id);

      const allIds = [...ids1, ...ids2, ...ids3];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('enforces strict allow-list on candidate fields (never leaks email or phone)', async () => {
      await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      const res = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);

      const candidateObj = res.body.items[0].candidate;
      const allowedKeys = [
        'id',
        'name',
        'city',
        'industry',
        'skills',
        'experienceYears',
        'previousStartup',
        'badges',
        'commitment',
      ];

      expect(Object.keys(candidateObj).sort()).toEqual(allowedKeys.sort());

      // Explicit assertions on forbidden fields
      expect(candidateObj.email).toBeUndefined();
      expect(candidateObj.phone).toBeUndefined();
      expect(candidateObj.shareableEmail).toBeUndefined();
      expect(candidateObj.shareablePhone).toBeUndefined();
    });

    it('returns connectionId when interest status is ACCEPTED on both received and my interests', async () => {
      const intRes = await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});
      const interestId = intRes.body.interest.id;

      // Before accept, connectionId is null
      const beforeRec = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(beforeRec.body.items[0].connectionId).toBeNull();

      // Accept interest
      const acceptRes = await request(app)
        .patch(`/api/v1/interests/${interestId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'accept' });
      expect(acceptRes.status).toBe(200);
      const connectionId = acceptRes.body.connection.id;
      expect(connectionId).toBeDefined();

      // After accept, owner received-interests includes connectionId
      const afterRec = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(afterRec.body.items[0].connectionId).toBe(connectionId);

      // Candidate my-interests includes connectionId
      const candMine = await request(app)
        .get('/api/v1/me/interests')
        .set('Authorization', `Bearer ${cand1Token}`);
      expect(candMine.body.items[0].connectionId).toBe(connectionId);
    });

    it('excludes interests where a block exists in either direction', async () => {
      await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      // Create block from owner to cand1
      await prisma.block.create({
        data: {
          blockerId: ownerId,
          blockedId: cand1Id,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });

    it('includes CLOSED requirements in received-interests list with requirement.status === CLOSED', async () => {
      const intRes = await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});

      // Owner closes requirement
      await request(app)
        .patch(`/api/v1/requirements/${req1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CLOSED' });

      const res = await request(app)
        .get('/api/v1/me/received-interests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].requirement.status).toBe('CLOSED');
    });
  });

  describe('GET /me/counts', () => {
    it('returns correct counts after creation, accept, decline, withdraw, and requirement closing', async () => {
      // Initial counts
      const initCounts = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(initCounts.status).toBe(200);
      expect(initCounts.body).toEqual({ pendingReceivedInterests: 0, connections: 0 });

      // Cand 1 expresses interest in Req 1 -> pendingReceivedInterests = 1
      const int1 = await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand1Token}`)
        .send({});
      const int1Id = int1.body.interest.id;

      const c1 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c1.body.pendingReceivedInterests).toBe(1);
      expect(c1.body.connections).toBe(0);

      // Cand 2 expresses interest in Req 2 -> pendingReceivedInterests = 2
      const int2 = await request(app)
        .post(`/api/v1/requirements/${req2Id}/interest`)
        .set('Authorization', `Bearer ${cand2Token}`)
        .send({});
      const int2Id = int2.body.interest.id;

      const c2 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c2.body.pendingReceivedInterests).toBe(2);

      // Owner accepts Cand 1 -> pendingReceivedInterests = 1, connections = 1
      await request(app)
        .patch(`/api/v1/interests/${int1Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'accept' });

      const c3 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c3.body.pendingReceivedInterests).toBe(1);
      expect(c3.body.connections).toBe(1);

      // Assert connections count equals length of GET /connections list
      const connList = await request(app)
        .get('/api/v1/connections')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c3.body.connections).toBe(connList.body.items.length);

      // Owner declines Cand 2 -> pendingReceivedInterests = 0
      await request(app)
        .patch(`/api/v1/interests/${int2Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ action: 'decline' });

      const c4 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c4.body.pendingReceivedInterests).toBe(0);
      expect(c4.body.connections).toBe(1);

      // Cand 3 expresses interest in Req 1 -> pendingReceivedInterests = 1
      const int3 = await request(app)
        .post(`/api/v1/requirements/${req1Id}/interest`)
        .set('Authorization', `Bearer ${cand3Token}`)
        .send({});
      const int3Id = int3.body.interest.id;

      const c5 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c5.body.pendingReceivedInterests).toBe(1);

      // Cand 3 withdraws interest -> pendingReceivedInterests = 0
      await request(app)
        .patch(`/api/v1/interests/${int3Id}`)
        .set('Authorization', `Bearer ${cand3Token}`)
        .send({ action: 'withdraw' });

      const c6 = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c6.body.pendingReceivedInterests).toBe(0);

      // CLOSED requirement test: pending interest on CLOSED requirement is NOT counted
      const r3 = await request(app)
        .post('/api/v1/requirements')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Req to be Closed',
          needSkill: 'TECH',
          industry: 'Tech',
          stage: 'IDEA',
          commitment: 'FULL',
        });
      const req3Id = r3.body.requirement.id;

      await request(app)
        .post(`/api/v1/requirements/${req3Id}/interest`)
        .set('Authorization', `Bearer ${cand2Token}`)
        .send({});

      const c7BeforeClose = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c7BeforeClose.body.pendingReceivedInterests).toBe(1);

      // Close req3
      await request(app)
        .patch(`/api/v1/requirements/${req3Id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CLOSED' });

      const c7AfterClose = await request(app)
        .get('/api/v1/me/counts')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(c7AfterClose.body.pendingReceivedInterests).toBe(0);
    });
  });
});
