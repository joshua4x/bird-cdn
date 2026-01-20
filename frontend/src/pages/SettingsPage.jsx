import React, { useState, useEffect } from 'react';
import { User, Lock, Check, AlertCircle, Globe, Shield, Server, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changePassword, changeUsername } from '../api';
import axios from 'axios';

const SettingsPage = () => {
  const { user } = useAuth();
  const [usernameForm, setUsernameForm] = useState({
    newUsername: '',
    password: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [domainsForm, setDomainsForm] = useState({
    grafanaDomain: '',
    prometheusDomain: '',
    minioDomain: ''
  });
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [domainsError, setDomainsError] = useState('');
  const [domainsSuccess, setDomainsSuccess] = useState('');
  const [changingUsername, setChangingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingDomains, setSavingDomains] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  
  // Update System State
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    loadMonitoringDomains();
    checkForUpdates(); // Prüfe beim Laden einmalig
  }, []);

  useEffect(() => {
    // Poll update status während Installation
    let interval;
    if (installingUpdate) {
      interval = setInterval(() => {
        pollUpdateStatus();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [installingUpdate]);

  const loadMonitoringDomains = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingDomains(false);
        return;
      }
      const response = await axios.get('/api/settings/monitoring-domains', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDomainsForm({
        grafanaDomain: response.data.grafana_domain || '',
        prometheusDomain: response.data.prometheus_domain || '',
        minioDomain: response.data.minio_domain || ''
      });
    } catch (error) {
      console.error('Error loading monitoring domains:', error);
      if (error.response?.status !== 401) {
        setDomainsError('Fehler beim Laden der Domain-Einstellungen');
      }
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleDomainsSubmit = async (e) => {
    e.preventDefault();
    setDomainsError('');
    setDomainsSuccess('');

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    
    if (domainsForm.grafanaDomain && !domainRegex.test(domainsForm.grafanaDomain)) {
      setDomainsError('Ungültiges Grafana Domain-Format');
      return;
    }
    if (domainsForm.prometheusDomain && !domainRegex.test(domainsForm.prometheusDomain)) {
      setDomainsError('Ungültiges Prometheus Domain-Format');
      return;
    }
    if (domainsForm.minioDomain && !domainRegex.test(domainsForm.minioDomain)) {
      setDomainsError('Ungültiges MinIO Domain-Format');
      return;
    }

    setSavingDomains(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/settings/monitoring-domains', {
        grafana_domain: domainsForm.grafanaDomain || null,
        prometheus_domain: domainsForm.prometheusDomain || null,
        minio_domain: domainsForm.minioDomain || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDomainsSuccess('Domains erfolgreich gespeichert! SSL-Zertifikate werden angefordert...');
      
      // Trigger SSL certificate generation
      setTimeout(async () => {
        try {
          await axios.post('/api/settings/setup-monitoring-ssl', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDomainsSuccess('Domains und SSL-Zertifikate erfolgreich konfiguriert!');
        } catch (sslError) {
          setDomainsError('Domains gespeichert, aber SSL-Setup fehlgeschlagen: ' + (sslError.response?.data?.detail || 'Unbekannter Fehler'));
        }
      }, 1000);
    } catch (error) {
      setDomainsError(error.response?.data?.detail || 'Fehler beim Speichern der Domains');
    } finally {
      setSavingDomains(false);
    }
  };

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    if (!usernameForm.newUsername || usernameForm.newUsername.length < 3) {
      setUsernameError('Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }

    if (usernameForm.newUsername === 'admin') {
      setUsernameError('Benutzername "admin" ist nicht erlaubt');
      return;
    }

    if (!usernameForm.password) {
      setUsernameError('Bitte aktuelles Passwort eingeben');
      return;
    }

    setChangingUsername(true);
    try {
      const response = await changeUsername(usernameForm.newUsername, usernameForm.password);
      setUsernameSuccess('Benutzername erfolgreich geändert! Seite wird neu geladen...');
      
      // Update token and user in localStorage
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Reload page to update UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setUsernameError(error.response?.data?.detail || 'Fehler beim Ändern des Benutzernamens');
    } finally {
      setChangingUsername(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword) {
      setPasswordError('Bitte altes Passwort eingeben');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordSuccess('Passwort erfolgreich geändert!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.response?.data?.detail || 'Fehler beim Ändern des Passworts');
    } finally {
      setChangingPassword(false);
    }
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/update/check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdateInfo(response.data);
    } catch (error) {
      console.error('Error checking updates:', error);
      if (error.response?.status === 503) {
        setUpdateError(error.response.data.detail);
      } else {
        setUpdateError('Fehler beim Prüfen auf Updates');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const installUpdate = async () => {
    if (!confirm('System-Update installieren? Das System wird neu gestartet.\n\nEin Backup wird automatisch erstellt.')) {
      return;
    }
    
    setInstallingUpdate(true);
    setUpdateError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/update/install', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Status polling startet durch useEffect
    } catch (error) {
      console.error('Error installing update:', error);
      setUpdateError('Fehler beim Starten des Updates');
      setInstallingUpdate(false);
    }
  };

  const pollUpdateStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/update/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdateStatus(response.data);
      
      // Update abgeschlossen
      if (!response.data.running && response.data.progress === 100) {
        setInstallingUpdate(false);
        setUpdateInfo({ available: false });
        // Seite neu laden nach 3 Sekunden
        setTimeout(() => window.location.reload(), 3000);
      }
      
      // Update fehlgeschlagen
      if (response.data.error) {
        setUpdateError(response.data.error);
        setInstallingUpdate(false);
      }
    } catch (error) {
      console.error('Error polling update status:', error);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Einstellungen
        </h1>
        <p style={{ color: '#6b7280' }}>
          Verwalten Sie Ihre Konto-Einstellungen und Sicherheit
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px', maxWidth: '1200px' }}>
        {/* Monitoring Domains */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              background: '#8b5cf6', 
              padding: '10px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                Monitoring Domains (Optional)
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Konfigurieren Sie separate Domains für sicheren externen Zugriff mit SSL
              </p>
            </div>
          </div>

          {domainsError && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fc8181',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#c53030',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {domainsError}
            </div>
          )}

          {domainsSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#166534',
              fontSize: '14px'
            }}>
              <Check size={16} />
              {domainsSuccess}
            </div>
          )}

          <div style={{
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>💡 Hinweis:</strong> Stellen Sie sicher, dass die Domains in Ihrem DNS auf die Server-IP zeigen. 
            SSL-Zertifikate werden automatisch via Let's Encrypt erstellt.
          </div>

          {loadingDomains ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              Lade Einstellungen...
            </div>
          ) : (
            <form onSubmit={handleDomainsSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Server size={16} color="#3b82f6" />
                  Grafana Domain
                </label>
                <input
                  type="text"
                  placeholder="grafana.example.com (optional)"
                  value={domainsForm.grafanaDomain}
                  onChange={(e) => setDomainsForm({ ...domainsForm, grafanaDomain: e.target.value })}
                  disabled={savingDomains}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Aktuell: http://localhost:3001
                </small>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Server size={16} color="#ef4444" />
                  Prometheus Domain
                </label>
                <input
                  type="text"
                  placeholder="prometheus.example.com (optional)"
                  value={domainsForm.prometheusDomain}
                  onChange={(e) => setDomainsForm({ ...domainsForm, prometheusDomain: e.target.value })}
                  disabled={savingDomains}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Aktuell: http://localhost:9090
                </small>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Server size={16} color="#8b5cf6" />
                  MinIO Console Domain
                </label>
                <input
                  type="text"
                  placeholder="minio.example.com (optional)"
                  value={domainsForm.minioDomain}
                  onChange={(e) => setDomainsForm({ ...domainsForm, minioDomain: e.target.value })}
                  disabled={savingDomains}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Aktuell: http://localhost:9011
                </small>
              </div>

              <button
                type="submit"
                disabled={savingDomains}
                style={{
                  padding: '12px 24px',
                  background: savingDomains ? '#d1d5db' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: savingDomains ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Shield size={16} />
                {savingDomains ? 'Wird gespeichert...' : 'Domains speichern & SSL einrichten'}
              </button>
            </form>
          )}
        </div>

        {/* Benutzername ändern */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              background: '#3b82f6', 
              padding: '10px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                Benutzername ändern
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Aktueller Benutzername: <strong>{user?.username}</strong>
              </p>
            </div>
          </div>

          {usernameError && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fc8181',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#c53030',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {usernameError}
            </div>
          )}

          {usernameSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#166534',
              fontSize: '14px'
            }}>
              <Check size={16} />
              {usernameSuccess}
            </div>
          )}

          <form onSubmit={handleUsernameChange}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Neuer Benutzername
              </label>
              <input
                type="text"
                placeholder="Neuer Benutzername (min. 3 Zeichen)"
                value={usernameForm.newUsername}
                onChange={(e) => setUsernameForm({ ...usernameForm, newUsername: e.target.value })}
                disabled={changingUsername}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Aktuelles Passwort bestätigen
              </label>
              <input
                type="password"
                placeholder="Aktuelles Passwort"
                value={usernameForm.password}
                onChange={(e) => setUsernameForm({ ...usernameForm, password: e.target.value })}
                disabled={changingUsername}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={changingUsername || !usernameForm.newUsername || !usernameForm.password}
              style={{
                padding: '12px 24px',
                background: changingUsername || !usernameForm.newUsername || !usernameForm.password ? '#d1d5db' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: changingUsername || !usernameForm.newUsername || !usernameForm.password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {changingUsername ? 'Wird geändert...' : 'Benutzername ändern'}
            </button>
          </form>
        </div>

        {/* Passwort ändern */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <div style={{ 
              background: '#10b981', 
              padding: '10px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                Passwort ändern
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Ändern Sie Ihr Passwort für mehr Sicherheit
              </p>
            </div>
          </div>

          {passwordError && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fc8181',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#c53030',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#166534',
              fontSize: '14px'
            }}>
              <Check size={16} />
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Altes Passwort
              </label>
              <input
                type="password"
                placeholder="Altes Passwort"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Neues Passwort
              </label>
              <input
                type="password"
                placeholder="Mindestens 8 Zeichen"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Neues Passwort bestätigen
              </label>
              <input
                type="password"
                placeholder="Passwort wiederholen"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword || !passwordForm.oldPassword || !passwordForm.newPassword}
              style={{
                padding: '12px 24px',
                background: changingPassword || !passwordForm.oldPassword || !passwordForm.newPassword ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: changingPassword || !passwordForm.oldPassword || !passwordForm.newPassword ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {changingPassword ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* System Updates */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '20px',
            paddingBottom: '20px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                System Updates
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Automatische Updates von GitHub
              </p>
            </div>
          </div>

          {updateError && (
            <div style={{
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#dc2626', fontSize: '14px' }}>{updateError}</span>
                {updateError.includes('Host') && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px',
                    background: '#fff',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#374151'
                  }}>
                    <strong>💡 Manuelles Update:</strong><br/>
                    Auf dem Server ausführen:<br/>
                    <code style={{ 
                      background: '#f3f4f6', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontFamily: 'monospace'
                    }}>
                      ./update.sh
                    </code> (Linux) oder <code style={{ 
                      background: '#f3f4f6', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontFamily: 'monospace'
                    }}>
                      update.bat
                    </code> (Windows)
                  </div>
                )}
              </div>
            </div>
          )}

          {installingUpdate && updateStatus && (
            <div style={{
              padding: '20px',
              background: '#f0f9ff',
              border: '2px solid #bae6fd',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                    {updateStatus.stage}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                    {updateStatus.progress}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e0f2fe',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${updateStatus.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#075985', margin: 0 }}>
                ⚠️ Bitte Seite nicht schließen während des Updates
              </p>
            </div>
          )}

          {updateInfo && updateInfo.available ? (
            <div>
              <div style={{
                padding: '16px',
                background: '#fef3c7',
                border: '2px solid #fcd34d',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <Download size={20} color="#d97706" />
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#92400e'
                  }}>
                    {updateInfo.commits_behind} neue{updateInfo.commits_behind > 1 ? '' : 's'} Update{updateInfo.commits_behind > 1 ? 's' : ''} verfügbar
                  </span>
                </div>

                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  marginBottom: '16px'
                }}>
                  {updateInfo.commits.map((commit, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <code style={{
                          background: '#f3f4f6',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}>
                          {commit.hash}
                        </code>
                        <span style={{ color: '#6b7280' }}>
                          {commit.date}
                        </span>
                      </div>
                      <div style={{ fontWeight: '500', color: '#111827' }}>
                        {commit.message}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        von {commit.author}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={installUpdate}
                  disabled={installingUpdate}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: installingUpdate ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: installingUpdate ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={18} />
                  {installingUpdate ? 'Update läuft...' : 'Update jetzt installieren'}
                </button>

                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#991b1b'
                }}>
                  <strong>⚠️ Wichtig:</strong> Automatisches Backup wird vor dem Update erstellt. 
                  System wird für ca. 1-2 Minuten neu gestartet.
                </div>
              </div>
            </div>
          ) : updateInfo && !updateInfo.available ? (
            <div style={{
              padding: '20px',
              background: '#f0fdf4',
              border: '2px solid #bbf7d0',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <Check size={32} color="#16a34a" style={{ marginBottom: '12px' }} />
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#166534',
                margin: 0
              }}>
                System ist auf dem neuesten Stand
              </p>
              {updateInfo.last_check && (
                <p style={{ 
                  fontSize: '13px', 
                  color: '#15803d',
                  marginTop: '8px'
                }}>
                  Letzter Check: {new Date(updateStatus?.last_check || updateInfo.last_check).toLocaleString('de-DE')}
                </p>
              )}
            </div>
          ) : null}

          <button
            onClick={checkForUpdates}
            disabled={checkingUpdate || installingUpdate}
            style={{
              padding: '12px 24px',
              background: checkingUpdate || installingUpdate ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: checkingUpdate || installingUpdate ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} className={checkingUpdate ? 'spin' : ''} />
            {checkingUpdate ? 'Prüfe...' : 'Jetzt auf Updates prüfen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

