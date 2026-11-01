import { app } from "../server/app.ts";

/**
 * Vercel serverless entry point. Every /api/* request lands here.
 *
 * The Express app is stateless: sessions live in an encrypted httpOnly cookie
 * rather than process memory, so any instance can serve any request.
 */
export default app;
