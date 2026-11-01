process.env.SESSION_SECRET = "hdr-secret-0123456789abcdefgh";
const { default: app } = await import("./api/index.js");
const tok = process.argv[2];
const s = app.listen(9971, "127.0.0.1", () => console.log("reseal test up"));
setTimeout(async () => {
  const r = await fetch("http://127.0.0.1:9971/api/me", { headers: { cookie: `en_sid=${tok}` } });
  const body = await r.text();
  const sc = r.headers.get("set-cookie");
  console.log("status:", r.status);
  console.log("body:", body.slice(0, 80));
  console.log("resealed cookie:", sc ? "YES (len " + sc.length + ")" : "no");
}, 800);
