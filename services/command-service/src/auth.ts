import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'manager' | 'farmer';
export type AuthUser = { userId: string; role: Role; email?: string };

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (secret: string, ttl: string, user: AuthUser) => {
  const options: jwt.SignOptions = {
    subject: user.userId,
    expiresIn: ttl as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ role: user.role, email: user.email }, secret as jwt.Secret, options);
};

export const verifyToken = (secret: string, token: string) =>
  jwt.verify(token, secret) as jwt.JwtPayload;

export const getAuthUserFromToken = (secret: string, token: string): AuthUser | null => {
  const payload = verifyToken(secret, token);
  const role = payload.role as Role | undefined;
  if (!payload.sub || !role) {
    return null;
  }
  return {
    userId: String(payload.sub),
    role,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
};
