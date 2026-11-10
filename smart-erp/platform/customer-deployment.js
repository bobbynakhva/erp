/* Runs only on an explicitly configured, separately deployed customer ERP.
 * No remote database access: the control plane sees status and invite claims,
 * never the customer's password, invoices, stock or other business records. */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  digest, randomToken, hashPassword, PlatformError, publicOrigin,
  requireSameOrigin, transaction
} = require("./security");

class CustomerDeployment {
  constructor({ pool, controlUrl, companyId, deploymentKey, deploymentUrl, allowHttp = false, fetchImpl = fetch }) {
    this.pool = pool;
    this.controlUrl = publicOrigin(controlUrl, allowHttp);
    this.deploymentUrl = publicOrigin(deploymentUrl, allowHttp);
    if (!/^[a-f0-9-]{36}$/.test(companyId || "") || !/^[A-Za-z0-9_-]{43}$/.test(deploymentKey || "")) {
      throw new Error("Customer mode requires ERP_COMPANY_ID and ERP_DEPLOYMENT_KEY from the owner panel.");
    }
    if (this.controlUrl === this.deploymentUrl) throw new Error("Customer and owner deployments must be separate.");
    Object.assign(this, { companyId, deploymentKey, fetchImpl });
    this.expiresAt = 0;
    this.acknowledgedInvitationId = null;
    this.binding = null;
    this.pendingPulse = null;
    this.inviteAttempts = new Map();
  }
  async init(freshFactory) {
    const count = await this.pool.query("SELECT id FROM factories ORDER BY id");
    if (count.rowCount !== 1) throw new Error("A customer deployment must have exactly one manufacturer in its own database.");
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS customer_deployment_binding (
        singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
        instance_id uuid NOT NULL UNIQUE, company_id uuid NOT NULL, factory_id integer NOT NULL REFERENCES factories(id),
        invitation_id uuid, invitation_token_hash text, administrator_email text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const found = await this.pool.query("SELECT * FROM customer_deployment_binding");
    if (found.rowCount) {
      this.binding = found.rows[0];
      if (this.binding.company_id !== this.companyId || this.binding.factory_id !== count.rows[0].id) {
        throw new Error("This database is bound to a different manufacturer. Do not reuse customer databases.");
      }
    } else {
      if (!freshFactory || freshFactory.newFactoryId !== count.rows[0].id) {
        throw new Error("Customer mode requires a fresh database or an existing verified binding. Existing ERP records were not changed.");
      }
      const password = await hashPassword(randomToken());
      await transaction(this.pool, async db => {
        // Invalidate bootstrap/sample credentials before this ERP opens a port.
        await db.query("UPDATE users SET password_stored=$1 WHERE factory_id=$2", [password, freshFactory.newFactoryId]);
        const result = await db.query(
          `INSERT INTO customer_deployment_binding(instance_id,company_id,factory_id)
           VALUES($1,$2,$3) RETURNING *`,
          [crypto.randomUUID(), this.companyId, freshFactory.newFactoryId]
        );
        this.binding = result.rows[0];
      });
    }
    await this.pulse();
    this.timer = setInterval(() => this.pulse(), 30000);
    this.timer.unref();
  }
  stop() { clearInterval(this.timer); }
  async control(endpoint, body) {
    let response;
    try {
      response = await this.fetchImpl(`${this.controlUrl}/api/platform/agent/${endpoint}`, {
        method: "POST", redirect: "error",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.deploymentKey}` },
        body: JSON.stringify(body), signal: AbortSignal.timeout(5000)
      });
    } catch {
      throw new PlatformError(503, "The software provider's connection is temporarily unavailable. Please try again shortly.");
    }
    let result;
    try { result = await response.json(); } catch { throw new PlatformError(503, "The provider returned an invalid response."); }
    if (!response.ok) throw new PlatformError(response.status, result.error || "The provider could not authorize this deployment.");
    return result;
  }
  async pulse() {
    if (this.pendingPulse) return this.pendingPulse;
    this.pendingPulse = (async () => {
      try {
        this.binding = (await this.pool.query("SELECT * FROM customer_deployment_binding")).rows[0];
        const completed = await this.pool.query(
          "SELECT 1 FROM manufacturer_onboarding WHERE factory_id=$1 AND completed_at IS NOT NULL", [this.binding.factory_id]
        );
        const invitationId = this.binding.invitation_id;
        const response = await this.control("heartbeat", {
          protocol: 1, instanceId: this.binding.instance_id, deploymentUrl: this.deploymentUrl,
          acceptedInvitationId: invitationId, onboardingCompleted: completed.rowCount > 0
        });
        if (response.companyId !== this.companyId || !["active", "suspended"].includes(response.accessStatus)) {
          throw new PlatformError(503, "The provider returned an invalid deployment identity.");
        }
        this.accessStatus = response.accessStatus;
        this.expiresAt = Date.now() + Math.min(300, Number(response.leaseSeconds) || 0) * 1000;
        this.acknowledgedInvitationId = invitationId;
        return true;
      } catch (error) {
        // Explicit authentication/revocation failures invalidate a prior lease.
        if ([401, 403, 409].includes(error.status)) this.expiresAt = 0;
        console.error("Customer deployment heartbeat unavailable:", error.status || error.code || error.name);
        return false;
      }
    })();
    try { return await this.pendingPulse; } finally { this.pendingPulse = null; }
  }
  assertAccess() {
    if (!this.binding?.invitation_id || this.acknowledgedInvitationId !== this.binding.invitation_id) {
      throw new PlatformError(503, "This company is awaiting administrator activation. Use the invitation from your provider.");
    }
    if (Date.now() >= this.expiresAt) throw new PlatformError(503, "This company's access could not be confirmed. Contact your software provider.");
    if (this.accessStatus === "suspended") throw new PlatformError(403, "Company access is suspended. Contact your software provider.");
  }
  async invitation(token, claim = false) {
    return this.control(claim ? "claim-invitation" : "invitation", {
      instanceId: this.binding.instance_id, token
    });
  }
  async accept(token, password) {
    const passwordHash = await hashPassword(password).catch(error => { throw new PlatformError(400, error.message); });
    const existing = (await this.pool.query("SELECT * FROM customer_deployment_binding")).rows[0];
    if (existing.invitation_id && existing.invitation_token_hash === digest(token)) {
      // Retry after a network failure never resets an already-created password.
      if (this.acknowledgedInvitationId === existing.invitation_id) {
        throw new PlatformError(410, "This invitation has already been accepted. Sign in with your chosen password.");
      }
      await this.pulse();
      this.assertAccess();
      return { ok: true, message: "Your administrator account is ready. Sign in to start company setup.", loginUrl: "/" };
    }
    const claim = await this.invitation(token, true);
    await transaction(this.pool, async db => {
      const locked = (await db.query("SELECT * FROM customer_deployment_binding FOR UPDATE")).rows[0];
      if (locked.invitation_id && locked.invitation_token_hash === digest(token)) return;
      // A newly issued, valid control-plane claim may replace a failed pending
      // activation. The control plane refuses all claims once an admin is active.
      const fid = locked.factory_id;
      await db.query("UPDATE factories SET name=$2 WHERE id=$1", [fid, claim.companyName]);
      await db.query("UPDATE financial_years SET is_current=false WHERE factory_id=$1", [fid]);
      const year = await db.query("SELECT id FROM financial_years WHERE factory_id=$1 AND min_year=$2 AND max_year=$3", [fid, claim.yearStart, claim.yearStart + 1]);
      if (year.rowCount) await db.query("UPDATE financial_years SET is_current=true WHERE id=$1", [year.rows[0].id]);
      else await db.query("INSERT INTO financial_years(factory_id,min_year,max_year,is_current) VALUES($1,$2,$3,true)", [fid, claim.yearStart, claim.yearStart + 1]);
      await db.query(
        `INSERT INTO users(factory_id,year_label,user_code,username,password_stored,role_key,role_name)
         VALUES($1,$2,1,$3,$4,'PLANT_MANAGER','Plant Manager / Administrator')
         ON CONFLICT(factory_id,year_label,user_code) DO UPDATE SET
          username=EXCLUDED.username,password_stored=EXCLUDED.password_stored,
          role_key=EXCLUDED.role_key,role_name=EXCLUDED.role_name`,
        [fid, claim.yearLabel, claim.email, passwordHash]
      );
      await db.query(
        "INSERT INTO user_rights(factory_id,year_label,user_code) VALUES($1,$2,1) ON CONFLICT DO NOTHING", [fid, claim.yearLabel]
      );
      const rights = JSON.parse(fs.readFileSync(path.join(__dirname, "../admin-rights.json"), "utf8").replace(/^\uFEFF/, ""));
      for (const [key, level] of Object.entries(rights)) {
        await db.query(
          `INSERT INTO user_right_values(factory_id,year_label,user_code,ctrl_key,level)
           VALUES($1,$2,1,$3,$4) ON CONFLICT(factory_id,year_label,user_code,ctrl_key) DO UPDATE SET level=EXCLUDED.level`,
          [fid, claim.yearLabel, key, level]
        );
      }
      const views = JSON.parse(fs.readFileSync(path.join(__dirname, "../view-rights.json"), "utf8").replace(/^\uFEFF/, ""));
      for (const view of views) {
        await db.query(
          `INSERT INTO view_rights(factory_id,year_label,sl_no,frm_name,topic,sub_topic,ctrl_key)
           VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
          [fid, claim.yearLabel, view.slNo, view.frmName, view.topic, view.subTopic, view.ctrlKey]
        );
      }
      await db.query(
        `INSERT INTO manufacturer_onboarding(factory_id,year_label,administrator_code,draft)
         VALUES($1,$2,1,$3) ON CONFLICT(factory_id) DO UPDATE SET
         year_label=EXCLUDED.year_label,draft=EXCLUDED.draft,step=0,version=manufacturer_onboarding.version+1,completed_at=NULL`,
        [fid, claim.yearLabel, JSON.stringify({ companyName: claim.companyName, gstRegistered: false, gstin: "", stateCode: "", email: claim.email })]
      );
      await db.query(
        "UPDATE customer_deployment_binding SET invitation_id=$1,invitation_token_hash=$2,administrator_email=$3",
        [claim.invitationId, digest(token), claim.email]
      );
    });
    await this.pulse();
    // A pre-acceptance heartbeat may have been in flight. Confirm the new binding.
    if (this.acknowledgedInvitationId !== claim.invitationId) await this.pulse();
    this.assertAccess();
    return { ok: true, message: "Your administrator account is ready. Sign in to start company setup.", loginUrl: "/" };
  }
  async handle(req, res, url, { readBody, sendJson }) {
    try {
      if (req.method !== "POST") throw new PlatformError(405, "Method not allowed.");
      requireSameOrigin(req);
      const ip = req.socket?.remoteAddress || "unknown";
      const limit = this.inviteAttempts.get(ip);
      if (!limit || limit.until < Date.now()) {
        if (this.inviteAttempts.size > 4096) this.inviteAttempts.clear();
        this.inviteAttempts.set(ip, { count: 1, until: Date.now() + 15 * 60000 });
      } else if (++limit.count > 30) {
        throw new PlatformError(429, "Too many invitation attempts. Try again in 15 minutes.");
      }
      const body = await readBody(req);
      if (!body || typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw new PlatformError(400, "This invitation link is invalid.");
      let result;
      if (url.pathname === "/api/deployment/invitation") result = await this.invitation(body.token);
      else if (url.pathname === "/api/deployment/accept-invite") result = await this.accept(body.token, body.password);
      else throw new PlatformError(404, "Endpoint not found.");
      return sendJson(res, 200, result);
    } catch (error) {
      if (error instanceof PlatformError) return sendJson(res, error.status, { error: error.message });
      console.error("Customer invitation failed:", error.code || error.name);
      return sendJson(res, 500, { error: "The administrator account could not be activated. Please retry or contact your provider." });
    }
  }
}
module.exports = { CustomerDeployment };
