const { createOwnerAuth } = require("./owner-auth");
const { createCompanyService } = require("./company-service");
const { PlatformError, requireSameOrigin } = require("./security");

function createPlatformController(options) {
  const { pool, readBody, sendJson } = options;
  const auth = createOwnerAuth(options);
  const companies = createCompanyService(options);
  return async (req, res, url) => {
    try {
      const path = url.pathname.replace(/\/$/, "");
      if (req.method === "POST") requireSameOrigin(req);
      if (req.method === "GET" && path === "/api/platform/session") {
        return sendJson(res, 200, { ...await auth.status(req), publicUrlConfigured: Boolean(options.publicUrl) });
      }
      const body = req.method === "POST" ? await readBody(req) : {};
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new PlatformError(400, "Enter valid request data.");
      if (req.method === "POST" && path.startsWith("/api/platform/agent/")) {
        let result;
        if (path.endsWith("/heartbeat")) result = await companies.heartbeat(req, body);
        else if (path.endsWith("/invitation")) result = await companies.invitation(req, body, false);
        else if (path.endsWith("/claim-invitation")) result = await companies.invitation(req, body, true);
        else throw new PlatformError(404, "Endpoint not found.");
        return sendJson(res, 200, result);
      }
      if (req.method === "POST" && path === "/api/platform/bootstrap") return sendJson(res, 200, await auth.bootstrap(req, res, body));
      if (req.method === "POST" && path === "/api/platform/login") return sendJson(res, 200, await auth.login(req, res, body));
      const owner = await auth.owner(req);
      if (!owner) throw new PlatformError(401, "Sign in with your platform owner account.");
      if (req.method === "POST" && path === "/api/platform/logout") return sendJson(res, 200, await auth.logout(req, res));
      if (path === "/api/platform/companies") {
        if (req.method === "GET") return sendJson(res, 200, { ...await companies.list(), owner: { email: owner.email }, publicUrlConfigured: Boolean(options.publicUrl) });
        if (req.method === "POST") return sendJson(res, 201, await companies.create(body, owner.email));
      }
      const match = path.match(/^\/api\/platform\/companies\/([a-f0-9-]{36})(?:\/(connection|invitations|access)(?:\/([a-f0-9-]{36})\/revoke)?)?$/);
      if (!match) throw new PlatformError(404, "Endpoint not found.");
      const [, id, action, invitationId] = match;
      if (!action && req.method === "GET") return sendJson(res, 200, await companies.detail(id));
      if (req.method === "POST") {
        let result;
        if (action === "connection") result = await companies.connection(id, body, owner.email);
        else if (action === "access") result = await companies.access(id, body, owner.email);
        else if (action === "invitations" && invitationId) result = await companies.revoke(id, invitationId, owner.email);
        else if (action === "invitations") result = await companies.invite(id, owner.email);
        else throw new PlatformError(404, "Endpoint not found.");
        return sendJson(res, 200, result);
      }
      throw new PlatformError(405, "Method not allowed.");
    } catch (error) {
      if (error instanceof PlatformError) return sendJson(res, error.status, { error: error.message });
      if (error.code === "23505") return sendJson(res, 409, { error: "That workspace slug, URL or deployment identity is already registered." });
      console.error("Platform request failed:", error.code || error.name);
      return sendJson(res, 500, { error: "The owner service could not complete the request. No success has been recorded; please refresh and try again." });
    }
  };
}
module.exports = { createPlatformController };
