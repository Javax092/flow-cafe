import crypto from "node:crypto";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

export function getAccessTokenExpiresAt() {
  return new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
}

export function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
