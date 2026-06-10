import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { MapPin, Save } from 'lucide-react';

export default function SASettings() {
  const [settings, setSettings] = useState({
    checkin_window_start: '09:30',
    checkin_window_end: '10:15',
    work_hours_required: '8',
    office_lat: '28.5700',
    office_lng: '77.3210',
    office_radius_meters: '200',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/auth/settings');
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/auth/settings', { settings });
      setMessage('Settings saved. Use these coordinates for geofence testing.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleChange('office_lat', String(pos.coords.latitude.toFixed(7)));
        handleChange('office_lng', String(pos.coords.longitude.toFixed(7)));
        setMessage('Current GPS coordinates filled in. Save to apply.');
      },
      () => alert('Could not get your location. Allow location access and try again.')
    );
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MapPin size={24} color="var(--primary)" /> Office & Check-in Settings
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Single office location for development testing. Employees must be within the radius to check in.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0 }}>Geofence (single location)</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={styles.label}>Office Latitude</label>
            <input type="text" className="input-field" value={settings.office_lat} onChange={(e) => handleChange('office_lat', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Office Longitude</label>
            <input type="text" className="input-field" value={settings.office_lng} onChange={(e) => handleChange('office_lng', e.target.value)} required />
          </div>
        </div>

        <div>
          <label style={styles.label}>Allowed Radius (meters)</label>
          <input type="number" className="input-field" value={settings.office_radius_meters} onChange={(e) => handleChange('office_radius_meters', e.target.value)} min="50" max="5000" required />
        </div>

        <button type="button" className="btn btn-outline" onClick={useMyLocation}>
          Use My Current Location
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        <h3 style={{ margin: 0 }}>Check-in Rules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={styles.label}>Window Start</label>
            <input type="time" className="input-field" value={settings.checkin_window_start} onChange={(e) => handleChange('checkin_window_start', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Window End (late after)</label>
            <input type="time" className="input-field" value={settings.checkin_window_end} onChange={(e) => handleChange('checkin_window_end', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Work Hours</label>
            <input type="number" className="input-field" value={settings.work_hours_required} onChange={(e) => handleChange('work_hours_required', e.target.value)} min="1" max="12" required />
          </div>
        </div>

        {message && <p style={{ color: 'var(--success)', margin: 0, fontSize: '0.9rem' }}>{message}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};
