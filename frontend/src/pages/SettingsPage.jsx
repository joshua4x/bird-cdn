import React, { useState } from 'react';
import { User, Lock, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changePassword, changeUsername } from '../api';

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
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingUsername, setChangingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

      <div style={{ display: 'grid', gap: '20px', maxWidth: '800px' }}>
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
      </div>
    </div>
  );
};

export default SettingsPage;
