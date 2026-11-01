import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, demoMode } from "./app.ts";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Locally we serve the built frontend from the same process. On Vercel the
// static assets are served by the platform, so this block is never reached.
const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(port, host, () => {
  console.log(
    `engage-next api listening on http://${host}:${port}${demoMode ? " (demo mode)" : ""}`,
  );
});
