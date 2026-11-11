/* Manufacturer setup is explicitly enrolled, not inferred from legacy records.
 * Only drafts are saved until completion; applying settings is one transaction. */
const { STATE_CODES } = require("./tax-engine");

class SetupError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function initOnboarding(pool, freshFactory) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manufacturer_onboarding (
      factory_id integer PRIMARY KEY REFERENCES factories(id),
      year_label text NOT NULL,
      administrator_code integer NOT NULL,
      draft jsonb NOT NULL DEFAULT '{}',
      step smallint NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 3),
      version integer NOT NULL DEFAULT 1,
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  if (freshFactory) {
    await pool.query(
      `INSERT INTO manufacturer_onboarding (factory_id, year_label, administrator_code, draft)
       VALUES ($1, $2, 1, '{"companyName":"","gstRegistered":false,"gstin":"","stateCode":""}')
       ON CONFLICT (factory_id) DO NOTHING`,
      [freshFactory.newFactoryId, freshFactory.yearLabel]
    );
  }
}

function canManage(session, rights) {
  const level = Number(rights?.mnuMisc);
  return session?.role_key === "PLANT_MANAGER" &&
    Number.isInteger(level) && (level & 255) >= 7;
}

function normalizeDraft(input = {}, complete = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SetupError(400, "Setup data must be an object.");
  }
  const limits = {
    companyName: 160, address: 800, phone: 40, email: 160, gstin: 15,
    pan: 10, stateCode: 2, prefixQuote: 12, prefixPo: 12, prefixWo: 12, prefixEnq: 12
  };
  const draft = {};
  const fields = {};
  for (const [key, limit] of Object.entries(limits)) {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > limit) {
      fields[key] = `Use text of no more than ${limit} characters.`;
    } else draft[key] = value.trim();
  }
  for (const key of ["gstin", "pan", "prefixQuote", "prefixPo", "prefixWo", "prefixEnq"]) {
    if (draft[key]) draft[key] = draft[key].toUpperCase();
  }
  if (typeof input.gstRegistered !== "boolean") fields.gstRegistered = "Choose a GST registration status.";
  draft.gstRegistered = input.gstRegistered === true;
  for (const [key, allowed] of [["bookType", [1, 2, 3]], ["bookTypeInv", [1, 2]]]) {
    const n = Number(input[key]);
    if (!allowed.includes(n)) fields[key] = "Choose a valid document numbering option.";
    else draft[key] = n;
  }
  if (complete) {
    if (!draft.companyName) fields.companyName = "Enter your company name.";
    if (!draft.address) fields.address = "Enter your company address.";
    if (!STATE_CODES[draft.stateCode]) fields.stateCode = "Choose your company's state or union territory.";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) fields.email = "Enter a valid email address.";
    if (draft.phone && !/^[+\d\s().-]{6,40}$/.test(draft.phone)) fields.phone = "Enter a valid contact number.";
    if (draft.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(draft.pan)) fields.pan = "Enter a valid 10-character PAN.";
    if (draft.gstRegistered) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(draft.gstin)) {
        fields.gstin = "Enter a valid 15-character GSTIN.";
      } else if (draft.gstin.slice(0, 2) !== draft.stateCode) {
        fields.gstin = "The GSTIN state code must match the selected state.";
      } else if (draft.pan && draft.gstin.slice(2, 12) !== draft.pan) {
        fields.pan = "PAN must match the PAN within your GSTIN.";
      }
    }
    for (const key of ["prefixQuote", "prefixPo", "prefixWo", "prefixEnq"]) {
      if (draft[key] && !/^[A-Z0-9/-]{1,12}$/.test(draft[key])) {
        fields[key] = "Use up to 12 letters, numbers, slashes or hyphens.";
      }
    }
  }
  if (Object.keys(fields).length) throw new SetupError(400, "Please check the highlighted setup fields.", fields);
  // Clear hidden GST details for an unregistered manufacturer.
  if (!draft.gstRegistered) draft.gstin = "";
  return draft;
}

async function readConfiguration(db, session) {
  const result = await db.query(
    `SELECT f.name, f.gstin, f.state_code, m.*
     FROM factories f LEFT JOIN misc m ON m.factory_id = f.id AND m.year_label = $2
     WHERE f.id = $1`, [session.factory_id, session.year_label]
  );
  if (!result.rowCount) throw new SetupError(404, "Manufacturer account not found.");
  const row = result.rows[0];
  const existingConfiguration = row.factory_id != null;
  const prefix = key => String(row[key] || "").trim();
  const draft = {
    companyName: String(row.name || "").trim(),
    address: prefix("print_short_addr"), phone: "", email: "",
    gstRegistered: Boolean(String(row.gstin || "").trim()),
    gstin: String(row.gstin || "").trim(), pan: prefix("my_pan_no"),
    stateCode: String(row.state_code || "").trim(),
    prefixQuote: prefix("prefix_quote"), prefixPo: prefix("prefix_po"),
    prefixWo: prefix("prefix_wo"), prefixEnq: prefix("prefix_enq"),
    bookType: [1, 2, 3].includes(Number(row.book_type)) ? Number(row.book_type) : 1,
    bookTypeInv: [1, 2].includes(Number(row.book_type_inv)) ? Number(row.book_type_inv) : 1
  };
  return { draft, existingConfiguration };
}

function createOnboarding({ pool, openSession, loadRights, readBody, sendJson }) {
  async function status(db, session) {
    const found = await db.query(
      "SELECT * FROM manufacturer_onboarding WHERE factory_id = $1", [session.factory_id]
    );
    const state = found.rows[0];
    if (state?.completed_at) return { canManage: true, completed: true, required: false };
    if (state && state.year_label !== session.year_label) {
      throw new SetupError(409, `Company setup belongs to financial year ${state.year_label}. Sign in to that year to continue.`);
    }
    const configuration = await readConfiguration(db, session);
    return {
      canManage: true, required: Boolean(state), completed: false,
      step: state?.step ?? 0, version: state?.version ?? 0,
      yearLabel: session.year_label, states: STATE_CODES,
      draft: { ...configuration.draft, ...(state?.draft || {}) },
      existingConfiguration: configuration.existingConfiguration
    };
  }

  return async function handleOnboarding(req, res) {
    let client;
    try {
      const session = await openSession(req);
      if (!session) return sendJson(res, 401, { error: "Sign in first." });
      const rights = await loadRights(session);
      if (!canManage(session, rights)) {
        return sendJson(res, req.method === "GET" ? 200 : 403,
          req.method === "GET" ? { canManage: false, required: false, completed: false } :
            { error: "Only a manufacturer administrator with company-edit permission can run setup." });
      }
      if (req.method === "GET") return sendJson(res, 200, await status(pool, session));
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
      // Do not let an external website submit authenticated setup changes.
      if (req.headers.origin) {
        let host;
        try { host = new URL(req.headers.origin).host; } catch {}
        if (host !== req.headers.host) throw new SetupError(403, "Setup changes must come from this application.");
      }
      const body = await readBody(req);
      if (!["start", "save", "complete"].includes(body?.action)) throw new SetupError(400, "Unknown setup action.");
      client = await pool.connect();
      await client.query("BEGIN");
      // Serialize setup requests for a factory, including first enrollment.
      await client.query("SELECT id FROM factories WHERE id = $1 FOR UPDATE", [session.factory_id]);
      const current = await status(client, session);
      if (current.completed) throw new SetupError(409, "Setup is already complete. Use Company Details for future changes.");
      if (body.action === "start") {
        if (!current.required) {
          await client.query(
            `INSERT INTO manufacturer_onboarding
              (factory_id, year_label, administrator_code, draft)
             VALUES ($1, $2, $3, $4)`,
            [session.factory_id, session.year_label, session.user_code, JSON.stringify(current.draft)]
          );
        }
      } else {
        if (!current.required) throw new SetupError(409, "Start company setup before saving.");
        if (!Number.isInteger(body.version) || body.version !== current.version) {
          throw new SetupError(409, "Setup changed in another window. Reopen setup to load the saved progress.");
        }
        if (!Number.isInteger(body.step) || body.step < 0 || body.step > 3) throw new SetupError(400, "Choose a valid setup step.");
        const complete = body.action === "complete";
        const draft = normalizeDraft(body.draft, complete);
        if (current.existingConfiguration) {
          // Existing numbering policies must not change through onboarding.
          const existing = await readConfiguration(client, session);
          for (const key of ["bookType", "bookTypeInv", "prefixQuote", "prefixPo", "prefixWo", "prefixEnq"]) {
            draft[key] = existing.draft[key];
          }
        }
        if (complete) {
          if (body.step !== 3 || body.confirmed !== true) throw new SetupError(400, "Review and confirm your settings before finishing setup.");
          await client.query(
            `UPDATE factories SET name=$2, gstin=$3, state_code=$4, state_name=$5 WHERE id=$1`,
            [session.factory_id, draft.companyName, draft.gstin, draft.stateCode, STATE_CODES[draft.stateCode]]
          );
          const heading = [draft.companyName, draft.address,
            [draft.phone, draft.email].filter(Boolean).join(" | ")].filter(Boolean).join("\n");
          await client.query(
            `INSERT INTO misc (factory_id, year_label, print_head, print_short_addr, my_pan_no,
              prefix_quote, prefix_po, prefix_wo, prefix_enq, book_type, book_type_inv)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (factory_id, year_label) DO UPDATE SET
               print_head=EXCLUDED.print_head, print_short_addr=EXCLUDED.print_short_addr,
               my_pan_no=EXCLUDED.my_pan_no`,
            [session.factory_id, session.year_label, heading, draft.address, draft.pan,
              draft.prefixQuote, draft.prefixPo, draft.prefixWo, draft.prefixEnq, draft.bookType, draft.bookTypeInv]
          );
          await client.query(
            `UPDATE sessions SET book_type=$3, book_type_inv=$4 WHERE factory_id=$1 AND year_label=$2`,
            [session.factory_id, session.year_label, draft.bookType, draft.bookTypeInv]
          );
        }
        await client.query(
          `UPDATE manufacturer_onboarding SET draft=$2, step=$3, version=version+1,
             updated_at=now(), completed_at=CASE WHEN $4 THEN now() ELSE NULL END
           WHERE factory_id=$1`,
          [session.factory_id, JSON.stringify(draft), body.step, complete]
        );
      }
      const response = await status(client, session);
      await client.query("COMMIT");
      return sendJson(res, 200, response);
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      if (error instanceof SetupError) return sendJson(res, error.status, { error: error.message, fields: error.fields });
      console.error("Manufacturer setup failed:", error.code || error.name);
      return sendJson(res, 500, { error: "Setup could not be saved. Your previous progress is safe; please try again." });
    } finally {
      if (client) client.release();
    }
  };
}

module.exports = { initOnboarding, createOnboarding, normalizeDraft, canManage, SetupError };
