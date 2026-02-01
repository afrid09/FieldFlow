import jwt from 'jsonwebtoken';
import { comparePassword, getAuthUserFromToken, hashPassword, signToken, verifyToken } from '../auth';

describe('auth helpers', () => {
  const secret = 'test-secret';

  it('hashes and compares passwords', async () => {
    const hash = await hashPassword('password123');
    expect(await comparePassword('password123', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('signs and verifies JWT with role + subject', () => {
    const token = signToken(secret, '1h', { userId: 'user-1', role: 'farmer', email: 'farmer@test.com' });
    const payload = verifyToken(secret, token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('farmer');
    expect(payload.email).toBe('farmer@test.com');
  });

  it('returns auth user from valid token', () => {
    const token = signToken(secret, '1h', { userId: 'user-2', role: 'admin' });
    const user = getAuthUserFromToken(secret, token);
    expect(user).toEqual({ userId: 'user-2', role: 'admin', email: undefined });
  });

  it('returns null when role is missing', () => {
    const token = jwt.sign({ email: 'missing@role.com' }, secret, { subject: 'user-3' });
    const user = getAuthUserFromToken(secret, token);
    expect(user).toBeNull();
  });
});
