const crypto = require("node:crypto");
const {
  digest, secretEqual, randomToken, hashPassword, verifyPassword,
  PlatformError, emailAddress, transaction
} = require("./security");
const COOKIE = "platform_owner_session";

function createOwnerAuth({ pool, bootstrapKey = "", secureCookies = true }) {
  function cookie(res, token, clear = false) {
    res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; ${secureCookies ? "Secure; " : ""}Max-Age=${clear ? 0 : 28800}`);
  }
  async function issueSession(client, res, ownerId) {
    const token = randomToken();
    await client.query("DELETE FROM platform_sessions WHERE expires_at < now() OR last_seen_at < now()-interval '30 minutes'");
    await client.query(
      "INSERT INTO platform_sessions(token_hash,owner_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')",
      [digest(token), ownerId]
    );
    cookie(res, token);
  }
  async function owner(req) {
    const match = String(req.headers.cookie || "").match(/(?:^|;\s*)platform_owner_session=([A-Za-z0-9_-]{43})(?:;|$)/);
    if (!match) return null;
    const result = await pool.query(
      `UPDATE platform_sessions s SET last_seen_at=now() FROM platform_owners o
       WHERE s.token_hash=$1 AND s.owner_id=o.id AND s.expires_at>now()
       AND s.last_seen_at>now()-interval '30 minutes' RETURNING o.id,o.email`,
      [digest(match[1])]
    );
    return result.rows[0] || null;
  }
  async function rateLimit(req, email) {
    const address = req.socket?.remoteAddress || "unknown";
    // IP-only limit prevents bypass by changing the submitted email each time.
    for (const key of [`ip:${address}`, `account:${email}`]) {
      const result = await pool.query(
        `INSERT INTO platform_login_limits(key_hash,attempts) VALUES($1,1)
         ON CONFLICT(key_hash) DO UPDATE SET
           attempts=CASE WHEN platform_login_limits.window_start<now()-interval '15 minutes'
             THEN 1 ELSE platform_login_limits.attempts+1 END,
           window_start=CASE WHEN platform_login_limits.window_start<now()-interval '15 minutes'
             THEN now() ELSE platform_login_limits.window_start END RETURNING attempts`,
        [digest(key)]
      );
      if (result.rows[0].attempts > 10) throw new PlatformError(429, "Too many attempts. Try again in 15 minutes.");
    }
  }
  async function status(req) {
    const current = await owner(req);
    const count = await pool.query("SELECT 1 FROM platform_owners LIMIT 1");
    return {
      authenticated: Boolean(current), setupRequired: count.rowCount === 0,
      bootstrapConfigured: bootstrapKey.length >= 32,
      ...(current ? { owner: { email: current.email } } : {})
    };
  }
  async function bootstrap(req, res, body) {
    const email = emailAddress(body.email);
    await rateLimit(req, email);
    if (bootstrapKey.length < 32 || typeof body.bootstrapKey !== "string" ||
        !secretEqual(body.bootstrapKey, bootstrapKey)) {
      throw new PlatformError(403, "Owner setup is not authorized. Configure and enter the server's owner bootstrap key.");
    }
    let passwordHash;
    try { passwordHash = await hashPassword(body.password); } catch (e) { throw new PlatformError(400, e.message); }
    await transaction(pool, async client => {
      await client.query("SELECT pg_advisory_xact_lock(531018201)");
      if ((await client.query("SELECT 1 FROM platform_owners LIMIT 1")).rowCount) {
        throw new PlatformError(409, "The owner account is already configured. Sign in instead.");
      }
      const id = crypto.randomUUID();
      await client.query("INSERT INTO platform_owners(id,email,password_hash) VALUES($1,$2,$3)", [id, email, passwordHash]);
      await client.query("INSERT INTO platform_events(actor,action) VALUES($1,'Owner account created')", [email]);
      await issueSession(client, res, id);
    });
    return { ok: true };
  }
  async function login(req, res, body) {
    const email = emailAddress(body.email);
    await rateLimit(req, email);
    const row = (await pool.query("SELECT * FROM platform_owners WHERE email=$1", [email])).rows[0];
    // Use a valid work factor even for unknown emails.
    const dummy = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
    const valid = await verifyPassword(body.password, row?.password_hash || dummy);
    if (!row || !valid) throw new PlatformError(401, "Email or password is incorrect.");
    await transaction(pool, async client => {
      await client.query("INSERT INTO platform_events(actor,action) VALUES($1,'Owner signed in')", [email]);
      await issueSession(client, res, row.id);
    });
    return { ok: true };
  }
  async function logout(req, res) {
    const token = String(req.headers.cookie || "").match(/(?:^|;\s*)platform_owner_session=([A-Za-z0-9_-]+)/)?.[1];
    if (token) await pool.query("DELETE FROM platform_sessions WHERE token_hash=$1", [digest(token)]);
    cookie(res, "", true);
    return { ok: true };
  }
  return { owner, status, bootstrap, login, logout };
}
module.exports = { createOwnerAuth };
