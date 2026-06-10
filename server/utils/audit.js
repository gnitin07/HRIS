const pool = require('../config/db');

async function logAudit({ userId, action, entityType, entityId, details, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
