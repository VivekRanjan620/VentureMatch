import request from 'supertest';
import app from '../src/app';

describe('Auth Endpoints & Security Guards', () => {
  const testUser = {
    email: 'authtest@example.com',
    password: 'Password123!',
    role: 'BOTH',
  };

  it('should register a new user and create an EMAIL self-declared verification record', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();

    // Verify /me reflects EMAIL unverified self-declared status
    const meRes = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${res.body.tokens.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.verificationRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'EMAIL',
          status: 'unverified',
          method: 'self-declared',
          verifiedAt: null,
        }),
      ]),
    );
  });

  it('should not leak passwordHash or refresh token internal data in login response', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.refreshToken).toBeUndefined();
    expect(res.body.user.refreshTokens).toBeUndefined();
  });

  it('should return 401 when accessing protected route /me without auth token', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
