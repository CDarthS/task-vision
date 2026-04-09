import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = "365d";

export interface TokenPayload {
  sub: string; // user ID
  iat: number;
}

export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
