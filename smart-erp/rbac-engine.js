/**
 * SMART ERP - Role-Based Access Control (RBAC) Engine
 * Predefined enterprise role profiles and 1-click permission assignment
 */
const { recordAuditLog } = require("./audit-engine");

const ROLES = {
  PLANT_MANAGER: {
    key: "PLANT_MANAGER",
    name: "Plant Manager / Administrator",
    badge: "👑 Plant Manager",
    description: "Full, unrestricted administrative control across all operations, financial records, configurations, and security rights.",
    defaultLevel: 12,
    rules: {} // all 12
  },

  ACCOUNTS_BILLING: {
    key: "ACCOUNTS_BILLING",
    name: "Accounts & Billing Controller",
    badge: "💼 Accounts & Billing",
    description: "Manage Tax Invoices, Debit/Credit Notes, Bank Transactions, Payments, Receipts, and GST Returns. Read-only on Inventory & Master.",
    defaultLevel: 0,
    rules: {
      // 12: Full Access
      mnuMfgInvoice: 12,
      mnuLabInv: 12,
      CrDbNote: 12,
      mnuAdvAdjust: 12,
      mnuBankTrans: 12,
      mnuPayments: 12,
      mnureceipts: 12,
      mnuExpense: 12,
      mnuIncome: 12,
      mnuPurchBills: 12,
      mnuInvPurchIn: 12,
      mnuInvSubConIn: 12,
      mnuBank: 12,
      mnuCurrToday: 12,
      mnuCurrency: 12,
      mnuCostCntr: 12,
      // 1: Read-Only
      mnuCustomer: 1,
      mnuVendor: 1,
      mnuSupplier: 1,
      mnuItem: 1,
      mnuCategory: 1,
      mnuStock: 1,
      mnuMfgDC: 1,
      mnuLabDCout: 1,
      mnuStores: 1,
      mnuCompDB: 1,
      mnuMisc: 1
    }
  },

  STORE_KEEPER: {
    key: "STORE_KEEPER",
    name: "Stores & Warehouse Manager",
    badge: "📦 Store Keeper",
    description: "Full control over Inventory Stock, Delivery Challans (DC Out/In), Material Issue Notes, and GRN receipts. Zero access to billing.",
    defaultLevel: 0,
    rules: {
      // 12: Full Access
      mnuStock: 12,
      mnuMfgDC: 12,
      mnuLabDCout: 12,
      mnuLabDCin: 12,
      mnuDcSubConIn: 12,
      mnuDcSubConOut: 12,
      mnuDcSubConStoreCrNote: 12,
      mnuProdnStoreCrNote: 12,
      mnuPurchStoreCrNote: 12,
      mnuStkIssueBill: 12,
      mnuStoreInterTrans: 12,
      mnuStores: 12,
      mnuToolCrib: 12,
      // 1: Read-Only
      mnuItem: 1,
      ItemMoreDet: 1,
      ItemAssign: 1,
      mnuCategory: 1,
      mnuVendor: 1,
      mnuSupplier: 1,
      mnuPurchasePOout: 1,
      mnuPurchPOout: 1
    }
  },

  PRODUCTION_SUPERVISOR: {
    key: "PRODUCTION_SUPERVISOR",
    name: "Production Supervisor / Shop-Floor",
    badge: "⚙️ Production Supervisor",
    description: "Manage shop-floor scheduling, work orders (IWO), machine maintenance, capacity planning, and tool cribs.",
    defaultLevel: 0,
    rules: {
      // 12: Full Access
      mnuprodSchd: 12,
      mnuPlanProdCapa: 12,
      mnuPlanChart: 12,
      mnuIWOiss: 12,
      mnuIWOret: 12,
      mnuSCNGen: 12,
      mnuProductionLog: 12,
      RejRework: 12,
      mnuBreak: 12,
      mnuToolCrib: 12,
      mnuShiftAlloc: 12,
      mnuAssmReqAnaly: 12,
      mnuMatlReqAnaly: 12,
      mnuMaintainPro: 12,
      mnuMaintainSch: 12,
      mnuEsti: 12,
      // 1: Read-Only
      mnuStock: 1,
      mnuItem: 1,
      mnuBOM: 1,
      mnuMachine: 1,
      mnuProcID: 1
    }
  },

  QA_INSPECTOR: {
    key: "QA_INSPECTOR",
    name: "Quality Assurance & Inspection Officer",
    badge: "🔬 Quality Inspector",
    description: "Perform inward, random, independent, and subcontract inspections; manage instrument calibration and traceability.",
    defaultLevel: 0,
    rules: {
      // 12: Full Access
      mnuInsCommon: 12,
      mnuInsMfgLabIndivi: 12,
      mnuInsMfgLabRand: 12,
      mnuInsSubCon: 12,
      mnuCalibrate: 12,
      RejRework: 12,
      // 1: Read-Only
      mnuItem: 1,
      ItemMoreDet: 1,
      mnuStock: 1,
      mnuDcSubConIn: 1,
      mnuPurchBills: 1,
      mnuMfgDC: 1,
      mnuLabDCout: 1
    }
  },

  HR_PAYROLL: {
    key: "HR_PAYROLL",
    name: "HR & Payroll Executive",
    badge: "👥 HR & Payroll",
    description: "Manage employee staff directory, daily attendance entries, salary processing, staff loans, and shift allocations.",
    defaultLevel: 0,
    rules: {
      // 12: Full Access
      mnuStaff: 12,
      mnuSalary: 12,
      mnuSalHead: 12,
      mnuAttendance: 12,
      mnuShiftAlloc: 12,
      mnuStaffLoan: 12,
      // 1: Read-Only
      mnuCompDB: 1,
      mnuMisc: 1
    }
  }
};

function getAvailableRoles() {
  return Object.values(ROLES).map(r => ({
    key: r.key,
    name: r.name,
    badge: r.badge,
    description: r.description
  }));
}

/**
 * Apply a role preset to a user across all permissions
 */
async function applyRoleToUser(pool, {
  factoryId,
  yearLabel,
  targetUserCode,
  roleKey,
  assignedByUserCode,
  assignedByUsername,
  ipAddress = "127.0.0.1"
}) {
  const role = ROLES[roleKey];
  if (!role) throw new Error(`Unknown role key: ${roleKey}`);

  // 1. Fetch all distinct ctrl_keys from view_rights
  const vrRes = await pool.query(
    `SELECT DISTINCT ctrl_key FROM view_rights
     WHERE factory_id = $1 AND year_label = $2`,
    [factoryId, yearLabel]
  );

  const ctrlKeys = vrRes.rows.map(r => r.ctrl_key).filter(Boolean);

  // 2. Ensure user_rights header exists
  await pool.query(
    `INSERT INTO user_rights (factory_id, year_label, user_code)
     VALUES ($1, $2, $3)
     ON CONFLICT (factory_id, year_label, user_code) DO NOTHING`,
    [factoryId, yearLabel, targetUserCode]
  );

  // 3. Upsert rights values for each key
  let assignedCount = 0;
  for (const key of ctrlKeys) {
    const level = (role.rules[key] !== undefined) ? role.rules[key] : role.defaultLevel;
    await pool.query(
      `INSERT INTO user_right_values (factory_id, year_label, user_code, ctrl_key, level)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (factory_id, year_label, user_code, ctrl_key)
       DO UPDATE SET level = EXCLUDED.level`,
      [factoryId, yearLabel, targetUserCode, key, level]
    );
    if (level > 0) assignedCount++;
  }

  // 4. Update role metadata on user record
  await pool.query(
    `UPDATE users
     SET role_key = $1, role_name = $2
     WHERE factory_id = $3 AND year_label = $4 AND user_code = $5`,
    [role.key, role.name, factoryId, yearLabel, targetUserCode]
  );

  // 5. Record in Tamper-Evident Audit Trail
  const targetUserRes = await pool.query(
    `SELECT username FROM users
     WHERE factory_id = $1 AND year_label = $2 AND user_code = $3`,
    [factoryId, yearLabel, targetUserCode]
  );
  const targetUsername = targetUserRes.rows[0]?.username || `User #${targetUserCode}`;

  await recordAuditLog(pool, {
    factoryId,
    yearLabel,
    userCode: assignedByUserCode,
    username: assignedByUsername,
    action: "ROLE_CHANGE",
    module: "SECURITY",
    recordId: `USER-${targetUserCode}`,
    details: {
      targetUserCode,
      targetUsername,
      assignedRole: role.name,
      roleKey: role.key,
      accessibleModulesCount: assignedCount,
      totalModulesCount: ctrlKeys.length
    },
    ipAddress,
    severity: "WARNING"
  });

  return {
    ok: true,
    userCode: targetUserCode,
    username: targetUsername,
    roleKey: role.key,
    roleName: role.name,
    badge: role.badge,
    accessibleModulesCount: assignedCount,
    totalModulesCount: ctrlKeys.length,
    message: `Role "${role.name}" successfully applied to ${targetUsername} (${assignedCount} active permissions).`
  };
}

/**
 * Fetch a user's current security profile and role
 */
async function getUserSecurityProfile(pool, { factoryId, yearLabel, userCode }) {
  const userRes = await pool.query(
    `SELECT id, username, user_code, COALESCE(role_key, 'PLANT_MANAGER') AS role_key, COALESCE(role_name, 'Plant Manager / Administrator') AS role_name
     FROM users
     WHERE factory_id = $1 AND year_label = $2 AND user_code = $3`,
    [factoryId, yearLabel, userCode]
  );

  if (userRes.rowCount === 0) return null;
  const u = userRes.rows[0];

  const valsRes = await pool.query(
    `SELECT ctrl_key, level FROM user_right_values
     WHERE factory_id = $1 AND year_label = $2 AND user_code = $3`,
    [factoryId, yearLabel, userCode]
  );

  let full = 0;
  let modify = 0;
  let write = 0;
  let read = 0;
  let none = 0;

  valsRes.rows.forEach(r => {
    const l = Number(r.level);
    if (l === 12) full++;
    else if (l === 7) modify++;
    else if (l === 3) write++;
    else if (l === 1) read++;
    else none++;
  });

  const roleObj = ROLES[u.role_key] || ROLES.PLANT_MANAGER;

  return {
    userCode: u.user_code,
    username: u.username,
    roleKey: u.role_key,
    roleName: u.role_name,
    badge: roleObj.badge,
    description: roleObj.description,
    counts: {
      fullAccess: full,
      modifyAccess: modify,
      writeOnly: write,
      readOnly: read,
      noAccess: none,
      totalConfigured: valsRes.rowCount
    }
  };
}

module.exports = {
  ROLES,
  getAvailableRoles,
  applyRoleToUser,
  getUserSecurityProfile
};
