import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Clock, Calendar, AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function MyAttendancePanel({ title = "My Attendance Today" }) {
  const [status, setStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [liveTimer, setLiveTimer] = useState('00:00:00');

  const fetchData = async () => {
    try {
      const [statusRes, notifRes] = await Promise.all([
        api.get('/attendance/today-status'),
        api.get('/notifications/active'),
      ]);
      setStatus(statusRes.data);
      setNotifications(notifRes.data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live timer — ticks every second while checked in but not checked out
  useEffect(() => {
    const checkIn = status?.attendance?.check_in;
    const checkOut = status?.attendance?.check_out;

    if (!checkIn || checkOut) {
      setLiveTimer('00:00:00');
      return;
    }

    const computeElapsed = () => {
      // Use local date (not UTC) to match the server's IST-based check_in time
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const checkInDate = new Date(`${today}T${checkIn}`);
      const diffMs = now - checkInDate;

      if (diffMs < 0) {
        setLiveTimer('00:00:00');
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setLiveTimer(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [status?.attendance?.check_in, status?.attendance?.check_out]);

  const handleCheckInOut = () => {
    setLocationError('');
    setActionLoading(true);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setActionLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const isCheckOut = status?.attendance?.check_in && !status?.attendance?.check_out;
          const endpoint = isCheckOut ? '/attendance/checkout' : '/attendance/checkin';
          await api.post(endpoint, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          await fetchData();
        } catch (err) {
          setLocationError(err.response?.data?.message || 'Failed to mark attendance.');
        } finally {
          setActionLoading(false);
        }
      },
      () => {
        setLocationError('Please enable location services to check in.');
        setActionLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };



  const markNotifRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading your attendance...</div>;

  const isCheckedIn = status?.attendance?.check_in;
  const isCheckedOut = status?.attendance?.check_out;
  const isWfh = status?.attendance?.attendance_mode === 'wfh';
  const isWfhApproved = status?.is_wfh_approved;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {notifications.filter(n => !n.read_at).map(notif => (
        <div key={notif.id} className="glass-panel animate-fade-in" style={{ padding: '16px', borderLeft: '4px solid var(--warning)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', margin: 0 }}>
              <AlertTriangle size={18} /> {notif.title}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>{notif.message}</p>
          </div>
          <button onClick={() => markNotifRead(notif.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--primary)" /> {title}
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
              Window: {status?.window_start} - {status?.window_end}
            </p>
            {status?.is_sunday && <div style={styles.statusBadge}>Sunday</div>}
            {status?.is_holiday && <div style={styles.statusBadge}>Holiday: {status?.holiday_name}</div>}
            {status?.on_approved_leave && <div style={styles.statusBadge}>On Leave</div>}
            {(isWfh || isWfhApproved) && <div style={styles.statusBadge}>Working From Home</div>}

            {!status?.is_sunday && !status?.is_holiday && !status?.on_approved_leave && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <div style={styles.timeBlock}>
                  <div style={styles.timeLabel}>Check In</div>
                  <div style={styles.timeValue}>{status?.attendance?.check_in || '--:--'}</div>
                </div>
                <div style={styles.timeBlock}>
                  <div style={styles.timeLabel}>Check Out</div>
                  <div style={styles.timeValue}>{status?.attendance?.check_out || '--:--'}</div>
                </div>
              </div>
            )}

            {/* Live timer — visible only when checked in and not yet checked out */}
            {isCheckedIn && !isCheckedOut && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '10px',
                background: 'var(--input-bg)',
                border: `2px solid ${liveTimer >= '08:00:00' ? 'var(--success)' : 'var(--border-color)'}`,
                textAlign: 'center',
                transition: 'border-color 0.4s',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  Time Worked Today
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  fontVariantNumeric: 'tabular-nums',
                  color: liveTimer >= '08:00:00' ? 'var(--success)' : 'var(--text)',
                  letterSpacing: '2px',
                  transition: 'color 0.4s',
                }}>
                  {liveTimer}
                </div>
                <div style={{ fontSize: '0.8rem', color: liveTimer >= '08:00:00' ? 'var(--success)' : 'var(--text-muted)', marginTop: '4px' }}>
                  {liveTimer >= '08:00:00'
                    ? '😊 8 hours done — safe to check out!'
                    : liveTimer >= '07:00:00'
                    ? '⚠️ Almost there — 7+ hrs, checkout = Regularization'
                    : liveTimer >= '04:00:00'
                    ? '🕐 4+ hrs — checkout now = Half Day'
                    : '🔴 Under 4 hrs — checkout now = Absent'}
                </div>
              </div>
            )}
          </div>

          {locationError && <div style={styles.error}><AlertCircle size={16} /> {locationError}</div>}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(!isCheckedIn || (!isCheckedOut && isCheckedIn)) && !status?.on_approved_leave && !status?.is_sunday && !status?.is_holiday && (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCheckInOut} disabled={actionLoading}>
                {actionLoading ? 'Locating...' : (isCheckedIn ? 'Check Out' : (isWfhApproved ? 'Check In (WFH)' : 'Check In (WFO)'))}
              </button>
            )}
            {!isCheckedIn && !status?.on_approved_leave && !status?.is_sunday && !status?.is_holiday && !isWfhApproved && (
               <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 Want to WFH? Apply via the Leave tab.
               </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--secondary)" /> My Leave Balances
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.balanceRow}>
              <div>
                <div style={styles.balanceTitle}>Casual Leaves (CL)</div>
                <div style={styles.balanceSub}>Used: {status?.balance?.casual_used || 0} / {status?.balance?.casual_total || 0}</div>
              </div>
              <div style={styles.balanceBadge}>
                {(status?.balance?.casual_total || 0) - (status?.balance?.casual_used || 0)} Left
              </div>
            </div>
            <div style={styles.balanceRow}>
              <div>
                <div style={styles.balanceTitle}>Work From Home (WFH)</div>
                <div style={styles.balanceSub}>Used: {status?.balance?.wfh_used || 0} / {status?.balance?.wfh_total || 0}</div>
              </div>
              <div style={styles.balanceBadge}>
                {(status?.balance?.wfh_total || 0) - (status?.balance?.wfh_used || 0)} Left
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  timeBlock: {
    background: 'var(--input-bg)',
    padding: '12px 16px',
    borderRadius: '8px',
    flex: 1,
    border: '1px solid var(--border-color)',
  },
  timeLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timeValue: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginTop: '4px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--success)',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'var(--input-bg)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  balanceTitle: { fontWeight: '500', fontSize: '1rem' },
  balanceSub: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' },
  balanceBadge: {
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '8px 12px',
    borderRadius: '6px',
  },
};
