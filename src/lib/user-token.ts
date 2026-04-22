import { createHmac } from "crypto";

const SECRET = process.env.AUTH_SECRET || "hikamani-secret";

export function signUserId(userId: string): string {
  const sig = createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 16);
  return `${userId}.${sig}`;
}

export function verifyUserToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 16);
  return sig === expected ? userId : null;
}
