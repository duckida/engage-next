import crypto from "node:crypto";
import type { SerializedSession } from "./engage.ts";

/**
 * Stateless, encrypted session cookies.
 *
 * Serverless hosts (Vercel) keep no memory between requests, so a session
 * cannot live in a Map. Instead the portal's own cookies are sealed into the
 * browser's httpOnly cookie with AES-256-GCM. The user's password is never
 * part of this payload.
 */

const COOKIE_NAME = "en_sid";
/** Bumped when the payload shape changes, so old cookies are dropped cleanly. */
const COOKIE_VERSION = 2;
/** Vercel caps request headers at ~16 KB; keep well inside it. */
const MAX_COOKIE_BYTES = 12 * 1024;
const MAX_AGE_SECONDS = 12 * 60 * 60;

type SealedPayload = {
  v: typeof COOKIE_VERSION;
  /** Expiry, epoch ms — enforced server-side too, not just by the browser. */
  x: number;
  s: SerializedSession;
};

function secret(): Buffer {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random 32+ character value in the environment.",
    );
  }
  // Derive a fixed 32-byte key so any sufficiently long secret works.
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypt a session into a URL-safe token. Returns null if it would be too large. */
export function sealSession(state: SerializedSession): string | null {
  const payload: SealedPayload = {
    v: COOKIE_VERSION,
    x: Date.now() + MAX_AGE_SECONDS * 1000,
    s: state,
  };

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const token = Buffer.concat([iv, tag, body]).toString("base64url");
  return Buffer.byteLength(token, "utf8") > MAX_COOKIE_BYTES ? null : token;
}

/** Decrypt a token. Returns null for anything tampered with, stale, or malformed. */
export function openSession(token: string | undefined): SerializedSession | null {
  if (!token) return null;

  try {
    const buf = Buffer.from(token, "base64url");
    // 12-byte IV + 16-byte GCM tag + at least some ciphertext.
    if (buf.length < 29) return null;

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const body = buf.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as SealedPayload;

    if (payload?.v !== COOKIE_VERSION) return null;
    if (typeof payload.x !== "number" || payload.x < Date.now()) return null;
    if (!payload.s || typeof payload.s.school !== "string") return null;

    return payload.s;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  // Secure only over HTTPS, so local http:// dev keeps working.
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearedCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookie(header: string | undefined, name = COOKIE_NAME): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

/** A stable, non-reversible fingerprint so we can tell sessions apart. */
export function sessionFingerprint(school: string, username: string): string {
  return crypto
    .createHash("sha256")
    .update(`${school}:${username.toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
}
