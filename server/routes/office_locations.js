const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get all active office locations
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM office_locations WHERE is_active = true ORDER BY name ASC');
    res.json({ officeLocations: result.rows });
  } catch (err) {
    console.error('Office locations fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new office location
router.post('/', auth, roleCheck('super_admin'), async (req, res) => {
  const { name, latitude, longitude, radius_m } = req.body;
  if (!name || !latitude || !longitude) {
    return res.status(400).json({ message: 'Name, latitude, and longitude are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO office_locations (name, latitude, longitude, radius_m, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [name, latitude, longitude, radius_m || 200]
    );
    res.status(201).json({ message: 'Office location created', location: result.rows[0] });
  } catch (err) {
    console.error('Office location create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update office location
router.put('/:id', auth, roleCheck('super_admin'), async (req, res) => {
  const { name, latitude, longitude, radius_m } = req.body;
  try {
    const result = await pool.query(
      'UPDATE office_locations SET name = $1, latitude = $2, longitude = $3, radius_m = $4 WHERE id = $5 RETURNING *',
      [name, latitude, longitude, radius_m, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Office location not found.' });
    }
    res.json({ message: 'Office location updated', location: result.rows[0] });
  } catch (err) {
    console.error('Office location update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete (disable) office location
router.delete('/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE office_locations SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Office location not found.' });
    }
    res.json({ message: 'Office location deleted (disabled)' });
  } catch (err) {
    console.error('Office location delete error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
