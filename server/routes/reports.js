/* ─────────────────────────────────────────────
   Report Routes — /api/reports
   
   GET /attendance   — Download Excel attendance report
   HR → own department only
   SA → all employees
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');


/* ═══════════════════════════════════════
   GET /api/reports/attendance
   Downloads styled Excel with attendance data
   Accepts token via header OR query param (for direct download links)
   ═══════════════════════════════════════ */
router.get('/attendance', async (req, res) => {
  // Accept token from header or query (for download links)
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (decoded.role !== 'hr' && decoded.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { from_date, to_date, employee_id, department } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ message: 'from_date and to_date are required.' });
  }

  try {
    const params = [from_date, to_date];
    let deptFilter = '';
    let empFilter = '';
    let paramIdx = 3;

    if (decoded.role === 'hr') {
      const hrRow = await pool.query('SELECT department FROM employees WHERE id = $1', [decoded.id]);
      const hrDept = hrRow.rows[0]?.department;
      if (!hrDept) {
        return res.status(400).json({ message: 'HR account has no department assigned.' });
      }
      deptFilter = `AND department = $${paramIdx}`;
      params.push(hrDept);
      paramIdx++;
    } else if (department) {
      deptFilter = `AND department = $${paramIdx}`;
      params.push(department);
      paramIdx++;
    }

    if (employee_id) {
      empFilter = `AND emp_id = $${paramIdx}`;
      params.push(employee_id);
      paramIdx++;
    }

    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS date
      ),
      all_employees AS (
        SELECT id, emp_id, name, department, branch, designation
        FROM employees
        WHERE role IN ('employee', 'hr') AND deleted_at IS NULL
        ${deptFilter}
        ${empFilter}
      ),
      balances AS (
        SELECT lb.employee_id,
               lb.casual_total, lb.casual_used,
               lb.casual_total - lb.casual_used AS cl_left,
               lb.wfh_total, lb.wfh_used,
               lb.wfh_total - lb.wfh_used AS wfh_left
        FROM leave_balances lb
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
          AND lb.month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
      )
      SELECT
        ae.emp_id, ae.name, ae.designation, ae.department, ae.branch,
        ds.date,
        EXTRACT(DOW FROM ds.date)::INT AS day_of_week,
        h.name AS holiday_name,
        COALESCE(a.check_in::text, '-') AS check_in,
        COALESCE(a.check_out::text, '-') AS check_out,
        CASE
          WHEN EXTRACT(DOW FROM ds.date) = 0 THEN 'Sunday'
          WHEN h.name IS NOT NULL THEN 'Restricted Holiday'
          WHEN a.status = 'present' AND a.attendance_mode = 'wfh' THEN 'WFH Present'
          WHEN a.status = 'present' AND a.attendance_mode = 'wfo' THEN 'WFO Present'
          WHEN a.status = 'late' THEN 'WFO Late'
          WHEN a.status = 'casual' THEN 'Casual Leave (CL)'
          WHEN a.status = 'holiday' THEN 'Restricted Holiday'
          WHEN a.status IS NULL THEN 'Absent'
          ELSE INITCAP(COALESCE(a.status, 'Absent'))
        END AS status,
        COALESCE(b.cl_left::text, '-') AS cl_left,
        COALESCE(b.casual_total::text, '-') AS cl_total,
        COALESCE(b.wfh_left::text, '-') AS wfh_left,
        COALESCE(b.wfh_total::text, '-') AS wfh_total,
        -- Calculate working hours
        CASE
          WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL
          THEN ROUND(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600.0, 1)::text
          ELSE '-'
        END AS working_hours
      FROM date_series ds
      CROSS JOIN all_employees ae
      LEFT JOIN attendance a ON a.employee_id = ae.id AND a.date = ds.date
      LEFT JOIN holidays h ON h.date = ds.date
      LEFT JOIN balances b ON b.employee_id = ae.id
      ORDER BY ds.date ASC, ae.name ASC
    `, params);

    // ─── Build Excel ───
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    sheet.columns = [
      { header: 'Emp ID',     key: 'emp_id',        width: 12 },
      { header: 'Name',       key: 'name',          width: 22 },
      { header: 'Designation',key: 'designation',    width: 20 },
      { header: 'Department', key: 'department',     width: 20 },
      { header: 'Date',       key: 'date',          width: 14 },
      { header: 'Day',        key: 'day',           width: 12 },
      { header: 'Check In',   key: 'check_in',      width: 12 },
      { header: 'Check Out',  key: 'check_out',     width: 12 },
      { header: 'Hours',      key: 'working_hours', width: 8  },
      { header: 'Status',     key: 'status',        width: 22 },
      { header: 'CL Left',    key: 'cl_left',       width: 10 },
      { header: 'CL Total',   key: 'cl_total',      width: 10 },
      { header: 'WFH Left',   key: 'wfh_left',      width: 10 },
      { header: 'WFH Total',  key: 'wfh_total',     width: 12 },
    ];

    // Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
      cell.font = { color: { argb: 'FFEAA911' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const statusColors = {
      'WFO Present':        'FFD4EDDA',
      'WFH Present':        'FFD1ECF1',
      'WFO Late':           'FFFFF3CD',
      'Casual Leave (CL)':  'FFFDE8D8',
      'Absent':             'FFF8D7DA',
      'Sunday':             'FFF5F5F5',
      'Restricted Holiday': 'FFE2D9F3',
    };

    result.rows.forEach(row => {
      const added = sheet.addRow({
        emp_id:        row.emp_id,
        name:          row.name,
        designation:   row.designation || '-',
        department:    row.department || '-',
        date:          new Date(row.date).toLocaleDateString('en-IN'),
        day:           days[row.day_of_week],
        check_in:      row.check_in,
        check_out:     row.check_out,
        working_hours: row.working_hours,
        status:        row.status,
        cl_left:       row.cl_left,
        cl_total:      row.cl_total,
        wfh_left:      row.wfh_left,
        wfh_total:     row.wfh_total,
      });

      // Color the status cell
      const statusCell = added.getCell('status');
      const color = statusColors[row.status];
      if (color) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      }

      // Grey out Sundays
      if (row.day_of_week === 0) {
        added.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
          cell.font = { color: { argb: 'FFAAAAAA' } };
        });
      }
    });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${from_date}_to_${to_date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
