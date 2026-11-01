import { openSession, sealSession, sessionFingerprint } from "../server/session.ts";

process.env.SESSION_SECRET = "test-secret-abcdefghijklmnopqrstuvwxyz";

const state = {
  v: 1 as const,
  school: "stmarks",
  cookies: [{ k: ".ASPXAUTH", v: "abc123", d: "stmarks.engagehosted.com", p: "/", s: true, h: true }],
  pupilId: "1234",
  user: { name: "Test Pupil", firstName: "Test", photoUrl: null },
};

const token = sealSession(state);
if (!token) throw new Error("seal returned null");

const round = openSession(token);
if (!round) throw new Error("roundtrip failed");
if (round.school !== "stmarks") throw new Error("school lost");
if (round.cookies[0].k !== ".ASPXAUTH") throw new Error("cookie lost");
if (round.user?.name !== "Test Pupil") throw new Error("user lost");

// Tamper with the ciphertext: must be rejected by GCM.
const flipped = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
if (openSession(flipped) !== null) throw new Error("tampered token was accepted");

// Wrong key: must be rejected.
process.env.SESSION_SECRET = "a-completely-different-secret-value";
if (openSession(token) !== null) throw new Error("token opened under the wrong key");

// Garbage input.
if (openSession("") !== null) throw new Error("empty token accepted");
if (openSession("!!!!") !== null) throw new Error("garbage token accepted");

process.env.SESSION_SECRET = "test-secret-abcdefghijklmnopqrstuvwxyz";
const fp = sessionFingerprint("stmarks", "Test.Pupil");
if (fp.length !== 16) throw new Error("fingerprint wrong length");

console.log("session seal/open: all checks passed");
