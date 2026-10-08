import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('User Profile & Commitment Endpoints', () => {
  let accessToken: string;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'usertest@example.com',
      password: 'Password123!',
      role: 'BOTH',
    });
    accessToken = regRes.body.tokens.accessToken;
  });

  it('should return profileComplete: false and commitmentComplete: false initially', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.profileComplete).toBe(false);
    expect(res.body.user.commitmentComplete).toBe(false);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('should reject PUT /me with unknown fields (.strict()) or invalid skill enum', async () => {
    // Unknown field attempt
    const resUnknown = await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Jane Doe',
        city: 'Boston',
        industry: 'Tech',
        skills: ['TECH'],
        experienceYears: 5,
        role: 'ADMIN', // Unknown / forbidden field
      });

    expect(resUnknown.status).toBe(400);
    expect(resUnknown.body.error.code).toBe('INVALID_INPUT');

    // Invalid skill attempt
    const resSkill = await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Jane Doe',
        city: 'Boston',
        industry: 'Tech',
        skills: ['INVALID_SKILL'],
        experienceYears: 5,
      });

    expect(resSkill.status).toBe(400);
    expect(resSkill.body.error.code).toBe('INVALID_INPUT');
  });

  it('should update profile and turn profileComplete to true', async () => {
    const res = await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Jane Doe',
        city: 'Boston, MA',
        industry: 'Software',
        bio: 'Tech enthusiast',
        skills: ['TECH', 'PRODUCT'],
        experienceYears: 6,
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe('Jane Doe');

    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.body.user.profileComplete).toBe(true);
    expect(meRes.body.user.commitmentComplete).toBe(false);
  });

  it('should reject PUT /me/commitment when values violate constraints', async () => {
    // equityExpectation > 100
    const resEquity = await request(app)
      .put('/api/v1/me/commitment')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursPerWeek: 40,
        availability: 'FULL',
        minMonths: 12,
        equityExpectation: 150, // Invalid > 100
        compensationPref: 'EQUITY',
      });

    expect(resEquity.status).toBe(400);

    // hoursPerWeek > 80
    const resHours = await request(app)
      .put('/api/v1/me/commitment')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursPerWeek: 100, // Invalid > 80
        availability: 'FULL',
        minMonths: 12,
        equityExpectation: 50,
        compensationPref: 'EQUITY',
      });

    expect(resHours.status).toBe(400);
  });

  it('should update commitment profile and turn commitmentComplete to true', async () => {
    const res = await request(app)
      .put('/api/v1/me/commitment')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hoursPerWeek: 40,
        availability: 'FULL',
        minMonths: 12,
        canInvestAmount: 10000,
        equityExpectation: 50,
        compensationPref: 'EQUITY',
        remote: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.commitment.equityExpectation).toBe(50);
    expect(res.body.commitment.canInvestAmount).toBe(10000);

    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.body.user.commitmentComplete).toBe(true);
  });

  it('should record LINKEDIN verification with status linked and method linked-only', async () => {
    const res = await request(app)
      .post('/api/v1/me/verification/linkedin')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        linkedinUrl: 'https://linkedin.com/in/janedoe',
      });

    expect(res.status).toBe(200);
    expect(res.body.verification.type).toBe('LINKEDIN');
    expect(res.body.verification.status).toBe('linked');
    expect(res.body.verification.method).toBe('linked-only');
    expect(res.body.verification.verifiedAt).toBeNull();
    expect(res.body.verification.linkedAt).toBeDefined();

    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.body.user.verificationRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'LINKEDIN',
          status: 'linked',
          method: 'linked-only',
          verifiedAt: null,
          linkedAt: expect.any(String),
        }),
      ]),
    );
  });

  it('should return 401 UNAUTHORIZED when user row no longer exists in DB', async () => {
    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    const userId = meRes.body.user.id;

    // Delete user from database
    await prisma.user.delete({ where: { id: userId } });

    // GET /me for deleted user
    const getDeletedRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getDeletedRes.status).toBe(401);
    expect(getDeletedRes.body.error.code).toBe('UNAUTHORIZED');
    expect(getDeletedRes.body.error.message).toBe('Session is no longer valid');

    // PUT /me for deleted user (triggers Prisma P2003 FK violation)
    const putDeletedRes = await request(app)
      .put('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Deleted User',
        city: 'Boston, MA',
        industry: 'Software',
        skills: ['TECH'],
        experienceYears: 5,
      });

    expect(putDeletedRes.status).toBe(401);
    expect(putDeletedRes.body.error.code).toBe('UNAUTHORIZED');
    expect(putDeletedRes.body.error.message).toBe('Session is no longer valid');
  });

  it('should disable HTTP caching (etag false, Cache-Control no-store) and return 200 with body on repeated GET /me calls', async () => {
    const res1 = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res1.status).toBe(200);
    expect(res1.headers['cache-control']).toBe('no-store');
    expect(res1.headers['etag']).toBeUndefined();
    expect(res1.body.user).toBeDefined();

    const res2 = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res2.status).toBe(200);
    expect(res2.headers['cache-control']).toBe('no-store');
    expect(res2.headers['etag']).toBeUndefined();
    expect(res2.body.user).toBeDefined();
  });
});
