const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function secretEqual(a, b) {
  return crypto.timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}
function randomToken() { return crypto.randomBytes(32).toString("base64url"); }
function isPasswordHash(value) { return String(value).startsWith("scrypt$"); }
async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Use a password between 12 and 128 characters.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  if (typeof password !== "string" || password.length > 128) return false;
  const [kind, salt, hash] = String(stored).split("$");
  if (kind !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const key = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(key, Buffer.from(hash, "hex"));
}
class PlatformError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function publicOrigin(value, allowHttp = false) {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) ||
        url.username || url.password || url.search || url.hash ||
        (url.pathname !== "/" && url.pathname !== "")) throw new Error();
    return url.origin;
  } catch { throw new PlatformError(400, "Enter an HTTPS origin only, such as https://company.example.com."); }
}
function emailAddress(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PlatformError(400, "Enter a valid email address.");
  return email;
}
function requireSameOrigin(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) {
    throw new PlatformError(415, "Use an application/json request.");
  }
  if (req.headers.origin) {
    let host;
    try { host = new URL(req.headers.origin).host; } catch {}
    if (!host || host !== req.headers.host) throw new PlatformError(403, "This request must come from this application.");
  }
}
async function transaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
module.exports = {
  digest, secretEqual, randomToken, isPasswordHash, hashPassword, verifyPassword,
  PlatformError, publicOrigin, emailAddress, requireSameOrigin, transaction
};
