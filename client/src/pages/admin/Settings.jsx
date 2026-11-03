import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import FormField from '../../components/FormField';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import api from '../../api/client';

export default function Settings() {
  const { showToast } = useToast();
  const { refreshSettings } = useSettings();

  const [settings, setSettings] = useState({
    businessName: 'True clothing',
    phone: '0985698888',
    telegramUrl: 't.me/Trueclothing16',
    alertOnOrders: true,
    alertOnRequests: true,
    payTelebirr: true,
    payCbeBirr: true,
    payBank: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Recent activity logs
  const [logs, setLogs] = useState([]);

  const fetchSettingsAndLogs = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        api.get('/settings'),
        api.get('/activity')
      ]);
      if (settingsRes.data.success) {
        setSettings(settingsRes.data.settings);
      }
      if (logsRes.data.success) {
        setLogs(logsRes.data.logs);
      }
    } catch (err) {
      showToast('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/settings', settings);
      if (res.data.success) {
        showToast('Settings saved');
        refreshSettings();
        fetchSettingsAndLogs();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Enter current and new password');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.post('/auth/admin/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        showToast('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        fetchSettingsAndLogs();
      }
    } catch (err) {
      showToast(err.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <AdminLayout currentTab="set">
      <h1>Settings</h1>

      {loading ? (
        <p className="mut">Loading settings...</p>
      ) : (
        <div style={{ maxWidth: '640px' }}>
          {/* Business Information Card */}
          <form onSubmit={handleSaveSettings}>
            <div className="card">
              <b>Business</b>
              <div className="fg" style={{ marginTop: '8px' }}>
                <FormField
                  id="sn"
                  label="Business name"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  required
                />
                <FormField
                  id="sp2"
                  label="Phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  required
                />
              </div>

              <FormField
                id="st"
                label="Telegram channel"
                value={settings.telegramUrl}
                onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                placeholder="t.me/Trueclothing16"
              />
            </div>

            {/* Alerts & Payments */}
            <div className="card">
              <b>Alerts and payments</b>
              <div style={{ marginTop: '10px' }}>
                <label className="ck">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.alertOnOrders)}
                    onChange={(e) => setSettings({ ...settings, alertOnOrders: e.target.checked })}
                  />
                  Alert on new orders
                </label>

                <label className="ck">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.alertOnRequests)}
                    onChange={(e) => setSettings({ ...settings, alertOnRequests: e.target.checked })}
                  />
                  Alert on new requests
                </label>

                <label className="ck">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.payTelebirr)}
                    onChange={(e) => setSettings({ ...settings, payTelebirr: e.target.checked })}
                  />
                  Telebirr
                </label>

                <label className="ck">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.payCbeBirr)}
                    onChange={(e) => setSettings({ ...settings, payCbeBirr: e.target.checked })}
                  />
                  CBE Birr
                </label>

                <label className="ck">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.payBank)}
                    onChange={(e) => setSettings({ ...settings, payBank: e.target.checked })}
                  />
                  Bank transfer
                </label>
              </div>
            </div>

            <div className="rw end" style={{ marginBottom: '24px' }}>
              <button className="btn acc" type="submit" disabled={saving}>
                {saving ? '...' : 'Save settings'}
              </button>
            </div>
          </form>

          {/* Admin Change Password Card */}
          <div className="card">
            <b>Admin Security</b>
            <form onSubmit={handleChangePassword} style={{ marginTop: '8px' }}>
              <div className="fg">
                <FormField
                  id="cp"
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <FormField
                  id="npw"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div className="rw end" style={{ marginTop: '14px' }}>
                <button className="btn out" type="submit" disabled={changingPass}>
                  {changingPass ? '...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Activity Log */}
          <div className="card" style={{ marginTop: '16px' }}>
            <b>Recent Activity Log</b>
            <div style={{ marginTop: '8px' }}>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="li">
                    <div>
                      <span style={{ fontSize: '13px' }}>{log.message}</span>
                      <div className="mut" style={{ fontSize: '11px' }}>
                        {new Date(log.createdAt).toLocaleString()} • {log.actorType}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="mut">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

