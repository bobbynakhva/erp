const crypto = require("node:crypto");
const {
  digest, randomToken, PlatformError, publicOrigin, emailAddress, transaction
} = require("./security");

function companyView(row) {
  const live = row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < 300000;
  const status = row.access_status === "suspended" ? "suspended" :
    !row.instance_id ? "provisioning" : !live ? "offline" :
      row.administrator_ready ? "active" : row.invited ? "invited" : "connected";
  return {
    id: row.id, name: row.name, slug: row.slug, adminEmail: row.admin_email,
    yearStart: row.year_start, yearLabel: `${row.year_start}-${String(row.year_start + 1).slice(-2)}`,
    plan: row.plan, trialEndsOn: row.trial_ends_on ?
      (typeof row.trial_ends_on === "string" ? row.trial_ends_on : row.trial_ends_on.toISOString().slice(0, 10)) : null,
    deploymentUrl: row.deployment_url, accessStatus: row.access_status, status,
    lastSeenAt: row.last_seen_at, administratorReady: row.administrator_ready,
    onboardingCompleted: row.onboarding_completed, createdAt: row.created_at
  };
}
function createCompanyService({ pool, publicUrl = "", allowHttp = false }) {
  const select = `SELECT c.*, EXISTS(SELECT 1 FROM platform_invitations i
    WHERE i.company_id=c.id AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at>now()) invited
    FROM platform_companies c`;
  async function row(db, id, lock = false) {
    if (!/^[a-f0-9-]{36}$/.test(id || "")) throw new PlatformError(404, "Company not found.");
    const result = await db.query(
      lock ? "SELECT * FROM platform_companies WHERE id=$1 FOR UPDATE" : `${select} WHERE c.id=$1`, [id]
    );
    if (!result.rowCount) throw new PlatformError(404, "Company not found.");
    return result.rows[0];
  }
  async function event(db, id, actor, action) {
    await db.query("INSERT INTO platform_events(company_id,actor,action) VALUES($1,$2,$3)", [id, actor, action]);
  }
  async function list() {
    return { companies: (await pool.query(`${select} ORDER BY c.created_at DESC`)).rows.map(companyView) };
  }
  async function detail(id) {
    const company = companyView(await row(pool, id));
    const invitations = await pool.query(
      `SELECT id,email,expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt"
       FROM platform_invitations WHERE company_id=$1 ORDER BY created_at DESC LIMIT 20`, [id]
    );
    const events = await pool.query(
      `SELECT actor,action,created_at AS "createdAt" FROM platform_events
       WHERE company_id=$1 ORDER BY id DESC LIMIT 50`, [id]
    );
    return { company, invitations: invitations.rows, events: events.rows };
  }
  async function create(body, actor) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const plan = typeof body.plan === "string" ? body.plan.trim() : "";
    if (!name || name.length > 160) throw new PlatformError(400, "Enter a company name up to 160 characters.");
    if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug)) throw new PlatformError(400, "Use a workspace slug of 3–40 lowercase letters, numbers or hyphens, starting with a letter.");
    if (["owner", "admin", "api", "www", "platform"].includes(slug)) throw new PlatformError(400, "Choose a different workspace slug.");
    const email = emailAddress(body.adminEmail);
    const year = Number(body.yearStart);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new PlatformError(400, "Choose a financial-year starting year between 2020 and 2100.");
    if (!plan || plan.length > 60) throw new PlatformError(400, "Enter a plan label up to 60 characters.");
    const trial = body.trialEndsOn || null;
    if (trial && (typeof trial !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(trial) ||
        !Number.isFinite(Date.parse(trial)) || new Date(trial).toISOString().slice(0, 10) !== trial)) {
      throw new PlatformError(400, "Enter a valid trial end date.");
    }
    return transaction(pool, async db => {
      const result = await db.query(
        `INSERT INTO platform_companies(id,name,slug,admin_email,year_start,plan,trial_ends_on)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [crypto.randomUUID(), name, slug, email, year, plan, trial]
      );
      await event(db, result.rows[0].id, actor, "Company created; separate deployment required");
      return { company: companyView(result.rows[0]) };
    });
  }
  async function connection(id, body, actor) {
    if (!publicUrl) throw new PlatformError(409, "Configure PLATFORM_PUBLIC_URL on the owner server before connecting deployments.");
    const controlUrl = publicOrigin(publicUrl, allowHttp);
    const deploymentUrl = publicOrigin(body.deploymentUrl, allowHttp);
    if (deploymentUrl === controlUrl) throw new PlatformError(400, "Use a separate customer deployment, not the owner server.");
    return transaction(pool, async db => {
      const company = await row(db, id, true);
      const key = randomToken();
      const updated = await db.query(
        `UPDATE platform_companies SET deployment_url=$2,deployment_key_hash=$3,last_seen_at=NULL
         WHERE id=$1 RETURNING *`, [id, deploymentUrl, digest(key)]
      );
      if (company.deployment_url && company.deployment_url !== deploymentUrl && company.administrator_ready) {
        throw new PlatformError(409, "An active deployment cannot be moved here. Plan and verify its data migration first.");
      }
      await event(db, id, actor, company.deployment_key_hash ? "Deployment key rotated; reconnection required" : "Deployment connection configured");
      return {
        company: companyView(updated.rows[0]), deploymentKey: key,
        configuration: {
          ERP_MODE: "customer", ERP_CONTROL_URL: controlUrl, ERP_COMPANY_ID: id,
          ERP_PUBLIC_URL: deploymentUrl, ERP_DEPLOYMENT_KEY: key
        }
      };
    });
  }
  async function invite(id, actor) {
    return transaction(pool, async db => {
      const company = await row(db, id, true);
      if (company.access_status === "suspended") throw new PlatformError(409, "Reactivate the company before creating an invitation.");
      if (!company.instance_id || !company.last_seen_at || Date.now() - new Date(company.last_seen_at).getTime() > 300000) {
        throw new PlatformError(409, "Connect the customer deployment and receive a recent heartbeat before inviting its administrator.");
      }
      if (company.administrator_ready) throw new PlatformError(409, "The initial administrator is already set up. Manage additional users inside that company's ERP.");
      await db.query("UPDATE platform_invitations SET revoked_at=now() WHERE company_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL", [id]);
      const token = randomToken();
      const result = await db.query(
        `INSERT INTO platform_invitations(id,company_id,email,token_hash,expires_at)
         VALUES($1,$2,$3,$4,now()+interval '48 hours') RETURNING expires_at`,
        [crypto.randomUUID(), id, company.admin_email, digest(token)]
      );
      await event(db, id, actor, "Administrator invitation link created; previous pending links revoked");
      return { invitationUrl: `${company.deployment_url}/accept-invite#token=${token}`, expiresAt: result.rows[0].expires_at };
    });
  }
  async function revoke(id, invitationId, actor) {
    return transaction(pool, async db => {
      await row(db, id, true);
      const found = await db.query(
        `UPDATE platform_invitations SET revoked_at=now() WHERE id=$1 AND company_id=$2
         AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`, [invitationId, id]
      );
      if (!found.rowCount) throw new PlatformError(409, "This invitation is already used or revoked.");
      await event(db, id, actor, "Administrator invitation revoked");
      return { ok: true };
    });
  }
  async function access(id, body, actor) {
    if (!["active", "suspended"].includes(body.accessStatus)) throw new PlatformError(400, "Choose active or suspended access.");
    return transaction(pool, async db => {
      await row(db, id, true);
      const result = await db.query("UPDATE platform_companies SET access_status=$2 WHERE id=$1 RETURNING *", [id, body.accessStatus]);
      await event(db, id, actor, body.accessStatus === "active" ? "Company access reactivated" : "Company access suspended");
      return { company: companyView(result.rows[0]) };
    });
  }
  async function agentCompany(req, db, lock = false) {
    const key = String(req.headers.authorization || "").match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!key) throw new PlatformError(401, "Deployment authentication required.");
    const found = await db.query(
      `SELECT * FROM platform_companies WHERE deployment_key_hash=$1${lock ? " FOR UPDATE" : ""}`, [digest(key)]
    );
    if (!found.rowCount) throw new PlatformError(401, "Deployment key is invalid.");
    return found.rows[0];
  }
  async function heartbeat(req, body) {
    return transaction(pool, async db => {
      const company = await agentCompany(req, db, true);
      if (!/^[a-f0-9-]{36}$/.test(body.instanceId || "") || body.protocol !== 1 ||
          publicOrigin(body.deploymentUrl, allowHttp) !== company.deployment_url) {
        throw new PlatformError(409, "Deployment identity does not match this company's connection settings.");
      }
      if (company.instance_id && company.instance_id !== body.instanceId) {
        throw new PlatformError(409, "A different database instance is already bound to this company.");
      }
      let ready = company.administrator_ready;
      if (body.acceptedInvitationId) {
        const accepted = await db.query(
          `UPDATE platform_invitations SET accepted_at=COALESCE(accepted_at,now())
           WHERE id=$1 AND company_id=$2 AND claimed_instance_id=$3
           AND revoked_at IS NULL RETURNING id`,
          [body.acceptedInvitationId, company.id, body.instanceId]
        );
        if (!accepted.rowCount) throw new PlatformError(409, "The administrator invitation cannot be acknowledged.");
        if (!ready) await event(db, company.id, "Deployment", "Initial administrator account created");
        ready = true;
      }
      if (!company.instance_id) await event(db, company.id, "Deployment", "Separate deployment connected");
      await db.query(
        `UPDATE platform_companies SET instance_id=$2,last_seen_at=now(),
         administrator_ready=$3,onboarding_completed=$4 WHERE id=$1`,
        [company.id, body.instanceId, ready, ready && body.onboardingCompleted === true]
      );
      return {
        companyId: company.id, companyName: company.name, yearStart: company.year_start,
        accessStatus: company.access_status, leaseSeconds: 300
      };
    });
  }
  async function invitation(req, body, claim) {
    return transaction(pool, async db => {
      const company = await agentCompany(req, db, true);
      if (company.access_status === "suspended") throw new PlatformError(403, "Company access is suspended. Contact the software provider.");
      if (company.administrator_ready) throw new PlatformError(410, "The initial administrator is already active. This invitation cannot be used.");
      if (!company.instance_id || body.instanceId !== company.instance_id) throw new PlatformError(409, "Connect this deployment first.");
      if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw new PlatformError(400, "This invitation link is invalid.");
      const result = await db.query(
        `SELECT * FROM platform_invitations WHERE company_id=$1 AND token_hash=$2 FOR UPDATE`,
        [company.id, digest(body.token)]
      );
      const invite = result.rows[0];
      if (!invite || invite.revoked_at || invite.accepted_at || new Date(invite.expires_at).getTime() <= Date.now()) {
        throw new PlatformError(410, "This invitation has expired, was revoked, or has already been used. Ask the provider for a new link.");
      }
      if (claim) {
        await db.query("UPDATE platform_invitations SET claimed_instance_id=$2 WHERE id=$1", [invite.id, company.instance_id]);
      }
      return {
        invitationId: invite.id, companyName: company.name, email: invite.email,
        yearStart: company.year_start, yearLabel: `${company.year_start}-${String(company.year_start + 1).slice(-2)}`
      };
    });
  }
  return { list, detail, create, connection, invite, revoke, access, heartbeat, invitation };
}
module.exports = { createCompanyService, companyView };
