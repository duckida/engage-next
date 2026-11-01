import { app } from "./app.ts";

/**
 * Vercel serverless entry point (compiled to api/index.js at build time).
 *
 * The Express app is stateless: sessions live in an encrypted httpOnly cookie
 * rather than process memory, so any instance can serve any request.
 */
export default app;
