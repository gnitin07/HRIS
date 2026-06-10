/* ─────────────────────────────────────────────
   Notification Routes — /api/notifications
   
   POST /create        — Create emergency notification (SA only)
   GET  /active        — Get active notifications for current user
   POST /:id/read      — Mark notification as read
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { logAudit } = require('../utils/audit');


/* ═══════════════════════════════════════
   POST /api/notifications/create
   SA creates an emergency notification visible to everyone
   ═══════════════════════════════════════ */
router.post('/create', auth, roleCheck('super_admin'), async (req, res) => {
  const { title, message, type, target_role, expires_at } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO notifications (title, message, type, created_by, target_role, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, message, type || 'emergency', req.user.id, target_role || null, expires_at || null]
    );

    await logAudit({
      userId: req.user.id,
      action: 'notification_created',
      entityType: 'notification',
      entityId: result.rows[0].id,
      details: { title, type: type || 'emergency', target_role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Notification created',
      notification: result.rows[0],
    });
  } catch (err) {
    console.error('Notification create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/notifications/active
   Get all active notifications for the current user's role
   Includes read/unread status
   ═══════════════════════════════════════ */
router.get('/active', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, 
              nr.read_at,
              e.name AS created_by_name
       FROM notifications n
       LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.employee_id = $1
       LEFT JOIN employees e ON n.created_by = e.id
       WHERE n.is_active = true
       AND (n.target_role IS NULL OR n.target_role = $2)
       AND (n.expires_at IS NULL OR n.expires_at > NOW())
       ORDER BY n.created_at DESC`,
      [req.user.id, req.user.role]
    );

    res.json({
      notifications: result.rows,
      unread_count: result.rows.filter(n => !n.read_at).length,
    });
  } catch (err) {
    console.error('Active notifications error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/notifications/:id/read
   Mark a notification as read by current user
   ═══════════════════════════════════════ */
router.get('/all', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, e.name AS created_by_name
       FROM notifications n
       LEFT JOIN employees e ON n.created_by = e.id
       ORDER BY n.created_at DESC
       LIMIT 50`
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('All notifications error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:id/deactivate', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deactivated', notification: result.rows[0] });
  } catch (err) {
    console.error('Deactivate notification error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/:id/read', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO notification_reads (notification_id, employee_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Notification read error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
