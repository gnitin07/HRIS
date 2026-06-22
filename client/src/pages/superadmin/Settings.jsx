import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { MapPin, Save, Plus, Trash2 } from 'lucide-react';

export default function SASettings() {
  const [settings, setSettings] = useState({
    checkin_window_start: '09:30',
    checkin_window_end: '10:15',
    work_hours_required: '8',
    office_lat: '28.5700',
    office_lng: '77.3210',
    office_radius_meters: '200',
    max_regularizations: '3',
  });
  const [offices, setOffices] = useState([]);
  
  const [newOffice, setNewOffice] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_m: '200'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const [settingsRes, officesRes] = await Promise.all([
        api.get('/auth/settings'),
        api.get('/office-locations')
      ]);
      setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
      setOffices(officesRes.data.officeLocations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/auth/settings', { settings });
      setMessage('Global settings saved.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/office-locations', newOffice);
      setNewOffice({ name: '', latitude: '', longitude: '', radius_m: '200' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add office');
    }
  };

  const handleDeleteOffice = async (id) => {
    if (!window.confirm('Delete this office location? Employees there will no longer be able to check in until you add it back.')) return;
    try {
      await api.delete(`/office-locations/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete office');
    }
  };

  const useMyLocationForNewOffice = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewOffice(prev => ({
          ...prev,
          latitude: String(pos.coords.latitude.toFixed(7)),
          longitude: String(pos.coords.longitude.toFixed(7))
        }));
      },
      () => alert('Could not get your location. Allow location access and try again.')
    );
  };

  const useMyLocationForGlobal = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSettingsChange('office_lat', String(pos.coords.latitude.toFixed(7)));
        handleSettingsChange('office_lng', String(pos.coords.longitude.toFixed(7)));
      },
      () => alert('Could not get your location. Allow location access and try again.')
    );
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MapPin size={24} color="var(--primary)" /> Office & Check-in Settings
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage global check-in rules and all physical office locations.
        </p>
      </div>

      {/* Global Check-in Rules */}
      <form onSubmit={handleSaveSettings} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0 }}>Global Check-in Rules</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          These apply if a department does not have its own specific schedule.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <label style={styles.label}>Window Start</label>
            <input type="time" className="input-field" value={settings.checkin_window_start || ''} onChange={(e) => handleSettingsChange('checkin_window_start', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Window End (late after)</label>
            <input type="time" className="input-field" value={settings.checkin_window_end || ''} onChange={(e) => handleSettingsChange('checkin_window_end', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Default Work Hours</label>
            <input type="number" className="input-field" value={settings.work_hours_required || ''} onChange={(e) => handleSettingsChange('work_hours_required', e.target.value)} min="1" max="12" required />
          </div>
          <div>
            <label style={styles.label}>Max Regularizations/mo</label>
            <input type="number" className="input-field" value={settings.max_regularizations || ''} onChange={(e) => handleSettingsChange('max_regularizations', e.target.value)} min="0" required />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
        
        <h4 style={{ margin: 0 }}>Main Office Geofence</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={styles.label}>Office Latitude</label>
            <input type="text" className="input-field" value={settings.office_lat || ''} onChange={(e) => handleSettingsChange('office_lat', e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Office Longitude</label>
            <input type="text" className="input-field" value={settings.office_lng || ''} onChange={(e) => handleSettingsChange('office_lng', e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Allowed Radius (meters)</label>
            <input type="number" className="input-field" value={settings.office_radius_meters || ''} onChange={(e) => handleSettingsChange('office_radius_meters', e.target.value)} min="50" max="5000" required />
          </div>
          <button type="button" className="btn btn-outline" onClick={useMyLocationForGlobal} style={{ height: '42px' }}>
            Use My Current Location
          </button>
        </div>

        {message && <p style={{ color: 'var(--success)', margin: 0, fontSize: '0.9rem' }}>{message}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Global Settings'}
        </button>
      </form>

      {/* Office Locations */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0 }}>Office Locations (Geofences)</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Employees can check in if they are within the radius of ANY of these active locations.
        </p>

        {/* List of Offices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          {offices.map(office => (
            <div key={office.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{office.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                  <span>📍 {office.latitude}, {office.longitude}</span>
                  <span>📏 {office.radius_m}m radius</span>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }}
                onClick={() => handleDeleteOffice(office.id)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          ))}
          {offices.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--input-bg)', borderRadius: '8px' }}>
              No active office locations. Employees will not be able to check in.
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />

        {/* Add New Office Form */}
        <form onSubmit={handleAddOffice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0 }}>Add New Office</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={styles.label}>Office Name</label>
              <input type="text" className="input-field" placeholder="e.g. Branch 2" value={newOffice.name} onChange={(e) => setNewOffice({...newOffice, name: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Allowed Radius (m)</label>
              <input type="number" className="input-field" value={newOffice.radius_m} onChange={(e) => setNewOffice({...newOffice, radius_m: e.target.value})} min="50" max="5000" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Latitude</label>
              <input type="text" className="input-field" value={newOffice.latitude} onChange={(e) => setNewOffice({...newOffice, latitude: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Longitude</label>
              <input type="text" className="input-field" value={newOffice.longitude} onChange={(e) => setNewOffice({...newOffice, longitude: e.target.value})} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Plus size={18} /> Add Office
            </button>
            <button type="button" className="btn btn-outline" onClick={useMyLocationForNewOffice}>
              Use My Current Location
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};
