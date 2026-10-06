import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { score } from '../src/services/matching.service';

describe('Connections & Contact Unlock Integration Tests', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let connectionId: string;
  let reqId: string;

  beforeEach(async () => {
    // Register User A (Founder/Owner)
    const regA = await request(app).post('/api/v1/auth/register').send({
      email: 'usera_conn@example.com',
      password: 'Password123!',
      role: 'FOUNDER',
    });
    userAToken = regA.body.tokens.accessToken;
    userAId = regA.body.user.id;

    // Register User B (Seeker/Candidate)
    const regB = await request(app).post('/api/v1/auth/register').send({
      email: 'userb_conn@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    userBToken = regB.body.tokens.accessToken;
    userBId = regB.body.user.id;

    // Complete User A Profile & Commitment
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${userAToken}`).send({
      name: 'User A',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['PRODUCT'],
      experienceYears: 10,
      shareablePhone: '+1 555-0199', // Normalizes to +15550199
      shareableEmail: 'usera_share@example.com',
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${userAToken}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 50,
      compensationPref: 'EQUITY',
    });

    // Complete User B Profile & Commitment
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${userBToken}`).send({
      name: 'User B',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['TECH'],
      experienceYears: 6,
      shareablePhone: '+1 555-0288', // Normalizes to +15550288
      shareableEmail: 'userb_share@example.com',
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${userBToken}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 25,
      compensationPref: 'EQUITY',
    });

    // User A creates requirement
    const reqRes = await request(app)
      .post('/api/v1/requirements')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Need Tech Lead',
        needSkill: 'TECH',
        industry: 'Tech',
        stage: 'MVP',
        commitment: 'FULL',
        equityOfferMax: 50,
      });
    reqId = reqRes.body.requirement.id;

    // User B expresses interest
    const intRes = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({});

    // User A accepts interest -> Connection created
    const acceptRes = await request(app)
      .patch(`/api/v1/interests/${intRes.body.interest.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ action: 'accept' });

    connectionId = acceptRes.body.connection.id;
  });

  it('should list connections without contact fields', async () => {
    const res = await request(app)
      .get('/api/v1/connections')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);

    const connItem = res.body.items[0];
    expect(connItem.id).toBe(connectionId);
    expect(connItem.requirement.title).toBe('Need Tech Lead');
    expect(connItem.otherUser.name).toBe('User B');
    expect(connItem.otherUser.shareablePhone).toBeUndefined();
    expect(connItem.otherUser.shareableEmail).toBeUndefined();
    expect(connItem.conversationId).toBeDefined();
  });

  it('should reject share-contact if caller has no shareable contact info in profile', async () => {
    // Register User C with no shareable fields
    const regC = await request(app).post('/api/v1/auth/register').send({
      email: 'userc_noshare@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });
    const userCToken = regC.body.tokens.accessToken;
    await request(app).put('/api/v1/me').set('Authorization', `Bearer ${userCToken}`).send({
      name: 'User C',
      city: 'San Francisco',
      industry: 'Tech',
      skills: ['TECH'],
      experienceYears: 4,
    });
    await request(app).put('/api/v1/me/commitment').set('Authorization', `Bearer ${userCToken}`).send({
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 20,
      compensationPref: 'EQUITY',
    });

    const intC = await request(app)
      .post(`/api/v1/requirements/${reqId}/interest`)
      .set('Authorization', `Bearer ${userCToken}`)
      .send({});
    const accC = await request(app)
      .patch(`/api/v1/interests/${intC.body.interest.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ action: 'accept' });
    const connCId = accC.body.connection.id;

    // User C attempts share-contact without shareable fields -> 400 INVALID_INPUT
    const shareRes = await request(app)
      .post(`/api/v1/connections/${connCId}/share-contact`)
      .set('Authorization', `Bearer ${userCToken}`);

    expect(shareRes.status).toBe(400);
    expect(shareRes.body.error.code).toBe('INVALID_INPUT');
  });

  it('should keep contact fields ABSENT until BOTH users share, and reveal them ONLY AFTER both share', async () => {
    // 1. User A checks detail before anyone shares -> contact fields absent
    const detail1 = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(detail1.status).toBe(200);
    expect(detail1.body.connection.otherUser.shareablePhone).toBeUndefined();
    expect(detail1.body.connection.otherUser.shareableEmail).toBeUndefined();

    // 2. User A shares contact
    await request(app)
      .post(`/api/v1/connections/${connectionId}/share-contact`)
      .set('Authorization', `Bearer ${userAToken}`);

    // User A checks detail again (only A shared so far) -> still absent!
    const detail2 = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(detail2.body.connection.otherUser.shareablePhone).toBeUndefined();

    // 3. User B shares contact (now BOTH shared!)
    await request(app)
      .post(`/api/v1/connections/${connectionId}/share-contact`)
      .set('Authorization', `Bearer ${userBToken}`);

    // 4. User A checks detail -> contact fields present!
    const detail3 = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(detail3.status).toBe(200);
    expect(detail3.body.connection.otherUser.shareablePhone).toBe('+15550288');
    expect(detail3.body.connection.otherUser.shareableEmail).toBe('userb_share@example.com');

    // 5. User B checks detail -> contact fields present!
    const detail4 = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(detail4.status).toBe(200);
    expect(detail4.body.connection.otherUser.shareablePhone).toBe('+15550199');
    expect(detail4.body.connection.otherUser.shareableEmail).toBe('usera_share@example.com');
  });

  it('should return 404 for outsider accessing connection detail', async () => {
    // Register User C
    const regC = await request(app).post('/api/v1/auth/register').send({
      email: 'outsider_conn@example.com',
      password: 'Password123!',
      role: 'SEEKER',
    });

    const res = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${regC.body.tokens.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 and treat connection as invisible if a block exists between users', async () => {
    // Both users share contact
    await request(app).post(`/api/v1/connections/${connectionId}/share-contact`).set('Authorization', `Bearer ${userAToken}`);
    await request(app).post(`/api/v1/connections/${connectionId}/share-contact`).set('Authorization', `Bearer ${userBToken}`);

    // Insert block between User A and User B
    await prisma.block.create({
      data: {
        blockerId: userAId,
        blockedId: userBId,
      },
    });

    // GET /connections/:id returns 404 NOT_FOUND
    const detailRes = await request(app)
      .get(`/api/v1/connections/${connectionId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(detailRes.status).toBe(404);

    // GET /connections list excludes blocked connection
    const listRes = await request(app)
      .get('/api/v1/connections')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(listRes.body.items.some((c: any) => c.id === connectionId)).toBe(false);
  });

  it('LEAK TEST: verify shareable contact fields NEVER appear in any unauthorized response', async () => {
    // Both share contact
    await request(app).post(`/api/v1/connections/${connectionId}/share-contact`).set('Authorization', `Bearer ${userAToken}`);
    await request(app).post(`/api/v1/connections/${connectionId}/share-contact`).set('Authorization', `Bearer ${userBToken}`);

    // 1. GET /requirements
    const reqList = await request(app).get('/api/v1/requirements').set('Authorization', `Bearer ${userBToken}`);
    expect(JSON.stringify(reqList.body)).not.toContain('usera_share@example.com');
    expect(JSON.stringify(reqList.body)).not.toContain('+15550199');

    // 2. GET /requirements/:id
    const reqDetail = await request(app).get(`/api/v1/requirements/${reqId}`).set('Authorization', `Bearer ${userBToken}`);
    expect(JSON.stringify(reqDetail.body)).not.toContain('usera_share@example.com');
    expect(JSON.stringify(reqDetail.body)).not.toContain('+15550199');

    // 3. GET /requirements/:id/interests
    const intList = await request(app).get(`/api/v1/requirements/${reqId}/interests`).set('Authorization', `Bearer ${userAToken}`);
    expect(JSON.stringify(intList.body)).not.toContain('userb_share@example.com');
    expect(JSON.stringify(intList.body)).not.toContain('+15550288');

    // 4. GET /me/interests
    const meInt = await request(app).get('/api/v1/me/interests').set('Authorization', `Bearer ${userBToken}`);
    expect(JSON.stringify(meInt.body)).not.toContain('usera_share@example.com');
    expect(JSON.stringify(meInt.body)).not.toContain('+15550199');

    // 5. GET /connections (list endpoint)
    const connList = await request(app).get('/api/v1/connections').set('Authorization', `Bearer ${userAToken}`);
    expect(JSON.stringify(connList.body)).not.toContain('userb_share@example.com');
    expect(JSON.stringify(connList.body)).not.toContain('+15550288');
  });

  it('Score sum equality test preserved (totalScore === sum of breakdown points)', () => {
    const candidate = {
      profile: { name: 'Test', city: 'SF', industry: 'Tech', skills: ['TECH'], experienceYears: 5, previousStartup: true },
      commitment: { hoursPerWeek: 40, availability: 'FULL', minMonths: 12, equityExpectation: 20, compensationPref: 'EQUITY', remote: true },
    };
    const req = { needSkill: 'TECH', industry: 'Tech', stage: 'MVP', equityOfferMax: 50, commitment: 'FULL', location: 'SF', remote: true };
    const owner = { profile: { skills: [] }, commitment: { equityExpectation: 50 } };

    const res = score(candidate as any, req as any, owner as any);
    expect(res.score).not.toBeNull();
    const sumPoints = Object.values(res.breakdown!).reduce((a, b) => a + b.points, 0);
    expect(res.score).toBe(sumPoints);
  });
});
