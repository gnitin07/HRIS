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
        SELECT e.id, e.emp_id, e.name, e.department, e.branch, e.designation
        FROM employees e
        WHERE e.role IN ('employee', 'hr') AND e.deleted_at IS NULL
        ${deptFilter}
        ${empFilter}
      ),
      dept_settings AS (
        SELECT
          e.id AS employee_id,
          COALESCE(d.checkin_start,        gs_start.value,  '09:30') AS checkin_start,
          COALESCE(d.checkin_end,          gs_end.value,    '10:15') AS checkin_end,
          COALESCE(d.hours_present,        gs_pres.value::numeric,   8) AS hours_present,
          COALESCE(d.hours_regularization, 7) AS hours_regularization,
          COALESCE(d.hours_half_day,       4) AS hours_half_day
        FROM employees e
        LEFT JOIN departments d ON d.name = e.department
        LEFT JOIN system_settings gs_start ON gs_start.key = 'checkin_window_start'
        LEFT JOIN system_settings gs_end   ON gs_end.key   = 'checkin_window_end'
        LEFT JOIN system_settings gs_pres  ON gs_pres.key  = 'work_hours_required'
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
      ),
      computed_attendance AS (
        SELECT 
          employee_id, date, check_in, check_out, status, attendance_mode, leave_type,
          EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0 AS hours_worked,
          TO_CHAR((check_out - check_in), 'HH24:MI') AS hours_fmt,
          (status = 'late') AS is_late
        FROM attendance
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
          WHEN lr.id IS NOT NULL AND lr.status = 'approved' AND a.status IS NULL THEN 'WFH Approved (No Check-in)'
          WHEN lr.id IS NOT NULL AND lr.status = 'pending' THEN 'WFH-Pending'
          WHEN a.status = 'casual' THEN 'Casual Leave (CL)'
          WHEN a.status = 'holiday' THEN 'Restricted Holiday'
          WHEN a.check_in IS NOT NULL AND a.check_out IS NULL THEN
            CASE WHEN a.attendance_mode = 'wfh' THEN 'WFH (Ongoing)' ELSE 'WFO (Ongoing)' END
          WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN
            CASE
              WHEN a.hours_worked < ds_settings.hours_half_day        THEN 'Absent'
              WHEN a.hours_worked < ds_settings.hours_regularization  THEN 'Half Day'
              WHEN a.hours_worked < ds_settings.hours_present         THEN 'Regularization'
              WHEN a.is_late                                           THEN 'Regularization'
              ELSE CASE WHEN a.attendance_mode = 'wfh' THEN 'WFH Present' ELSE 'WFO Present' END
            END
          WHEN a.status IS NULL THEN 'Absent'
          ELSE INITCAP(COALESCE(a.status, 'Absent'))
        END AS status,
        COALESCE(b.cl_left::text, '-') AS cl_left,
        COALESCE(b.casual_total::text, '-') AS cl_total,
        COALESCE(b.wfh_left::text, '-') AS wfh_left,
        COALESCE(b.wfh_total::text, '-') AS wfh_total,
        COALESCE(a.hours_fmt, '-') AS working_hours
      FROM date_series ds
      CROSS JOIN all_employees ae
      LEFT JOIN computed_attendance a   ON a.employee_id = ae.id AND a.date = ds.date
      LEFT JOIN holidays h              ON h.date = ds.date
      LEFT JOIN balances b              ON b.employee_id = ae.id
      LEFT JOIN dept_settings ds_settings ON ds_settings.employee_id = ae.id
      LEFT JOIN leave_requests lr       ON lr.employee_id = ae.id AND ds.date BETWEEN lr.from_date AND lr.to_date AND lr.leave_type = 'wfh' AND lr.status != 'rejected'
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
      'WFO Present':                  'FFD4EDDA',
      'WFH Present':                  'FFD1ECF1',
      'WFO (Ongoing)':                'FFF0F0F0',
      'WFH (Ongoing)':                'FFF0F0F0',
      'Half Day':                     'FFFFE5B4',
      'Regularization':               'FFD8E2DC',
      'WFH Approved (No Check-in)':   'FFE2E3E5',
      'WFH-Pending':                  'FFFFEEBA',
      'WFO Late':                     'FFFFF3CD',
      'Casual Leave (CL)':            'FFFDE8D8',
      'Absent':                       'FFF8D7DA',
      'Sunday':                       'FFF5F5F5',
      'Restricted Holiday':           'FFE2D9F3',
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
