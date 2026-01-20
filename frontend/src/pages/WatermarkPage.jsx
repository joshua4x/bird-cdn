import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const WatermarkPage = () => {
  const { token } = useAuth();
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkPreview, setWatermarkPreview] = useState(null);
  const [currentWatermark, setCurrentWatermark] = useState(null);
  const [position, setPosition] = useState('bottom-right');
  const [opacity, setOpacity] = useState(70);
  const [scale, setScale] = useState(20);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const canvasRef = useRef(null);
  const sampleImageRef = useRef(null);

  // Positions für Auswahl
  const positions = [
    { value: 'top-left', label: 'Oben Links' },
    { value: 'top-right', label: 'Oben Rechts' },
    { value: 'bottom-left', label: 'Unten Links' },
    { value: 'bottom-right', label: 'Unten Rechts' },
    { value: 'center', label: 'Zentriert' }
  ];

  // Lade aktuelle Watermark-Config
  useEffect(() => {
    loadCurrentWatermark();
  }, []);

  // Update Preview wenn Settings ändern
  useEffect(() => {
    if (watermarkPreview || currentWatermark) {
      drawPreview();
    }
  }, [position, opacity, scale, watermarkPreview, currentWatermark]);

  const loadCurrentWatermark = async () => {
    try {
      const response = await api.get('/watermark/config');
      const data = response.data;
      
      if (data) {
        if (data.has_logo) {
          setCurrentWatermark(data);
          setPosition(data.position || 'bottom-right');
          // Backend returns opacity as 0.0-1.0, convert to 0-100 for UI
          setOpacity((data.opacity || 0.7) * 100);
          setScale(data.scale_percent || 20);
          
          // Lade Logo-Bild
          const logoResponse = await api.get('/watermark/logo', { responseType: 'blob' });
          const blob = logoResponse.data;
          setWatermarkPreview(URL.createObjectURL(blob));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'image/png') {
        setMessage({ type: 'error', text: 'Bitte nur PNG-Dateien verwenden!' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Datei zu groß! Max 5MB.' });
        return;
      }

      setWatermarkFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setWatermarkPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setMessage({ type: '', text: '' });
    }
  };

  const drawPreview = () => {
    const canvas = canvasRef.current;
    const sampleImg = sampleImageRef.current;
    
    if (!canvas || !sampleImg) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Canvas Größe setzen
      canvas.width = 800;
      canvas.height = 600;
      
      // Sample-Bild zeichnen (grauer Hintergrund mit Text)
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b7280';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Beispiel-Bild (800x600)', canvas.width / 2, canvas.height / 2);
      
      // Wasserzeichen zeichnen
      if (watermarkPreview) {
        const watermarkImg = new Image();
        watermarkImg.crossOrigin = 'anonymous';
        watermarkImg.onerror = (e) => {
          console.error('Failed to load watermark image:', e);
        };
        watermarkImg.onload = () => {
          console.log('Watermark image loaded successfully');
          // Größe berechnen (scale% der Bildbreite)
          const logoWidth = (canvas.width * scale) / 100;
          const logoHeight = (watermarkImg.height * logoWidth) / watermarkImg.width;
          
          // Position berechnen
          const padding = 20;
          let x, y;
          
          switch (position) {
            case 'top-left':
              x = padding;
              y = padding;
              break;
            case 'top-right':
              x = canvas.width - logoWidth - padding;
              y = padding;
              break;
            case 'bottom-left':
              x = padding;
              y = canvas.height - logoHeight - padding;
              break;
            case 'bottom-right':
              x = canvas.width - logoWidth - padding;
              y = canvas.height - logoHeight - padding;
              break;
            case 'center':
              x = (canvas.width - logoWidth) / 2;
              y = (canvas.height - logoHeight) / 2;
              break;
          }
          
          // Mit Transparenz zeichnen
          ctx.globalAlpha = opacity / 100;
          ctx.drawImage(watermarkImg, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
        };
        watermarkImg.src = watermarkPreview;
      }
    };
    
    img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>');
  };

  const handleUpload = async () => {
    if (!watermarkFile && !currentWatermark) {
      setMessage({ type: 'error', text: 'Bitte wähle ein PNG-Logo aus!' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      if (watermarkFile) {
        formData.append('file', watermarkFile);
      }
      formData.append('position', position);
      formData.append('opacity', opacity / 100);
      formData.append('scale_percent', scale);

      if (watermarkFile) {
        await api.post('/watermark/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.put('/watermark/config', formData);
      }

      setMessage({ type: 'success', text: '✅ Wasserzeichen erfolgreich gespeichert!' });
      await loadCurrentWatermark();
      // Don't clear watermarkFile so preview stays
      // setWatermarkFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Fehler: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Wasserzeichen wirklich löschen?')) return;

    setLoading(true);
    try {
      await api.delete('/watermark');

      setMessage({ type: 'success', text: '🗑️ Wasserzeichen gelöscht!' });
      setCurrentWatermark(null);
      setWatermarkPreview(null);
      setWatermarkFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Fehler: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <ImageIcon size={28} color="#667eea" />
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Wasserzeichen-Verwaltung</h2>
        </div>

        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#6ee7b7' : '#fca5a5'}`
          }}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Linke Seite: Upload & Settings */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Logo hochladen</h3>
            
            {/* File Input */}
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              border: '2px dashed #cbd5e0',
              borderRadius: '8px',
              cursor: 'pointer',
              background: '#f9fafb',
              transition: 'all 0.2s',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e0'}
            >
              <Upload size={40} color="#667eea" style={{ marginBottom: '10px' }} />
              <span style={{ fontSize: '14px', color: '#4a5568', marginBottom: '5px' }}>
                {watermarkFile ? watermarkFile.name : 'PNG-Logo auswählen'}
              </span>
              <span style={{ fontSize: '12px', color: '#a0aec0' }}>
                Max 5MB, nur PNG mit Transparenz
              </span>
              <input
                type="file"
                accept="image/png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {/* Position */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#4a5568'
              }}>
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {positions.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>

            {/* Opacity */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#4a5568'
              }}>
                <span>Transparenz</span>
                <span style={{ color: '#667eea' }}>{opacity}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e2e8f0',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Scale */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#4a5568'
              }}>
                <span>Größe (% der Bildbreite)</span>
                <span style={{ color: '#667eea' }}>{scale}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e2e8f0',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpload}
                disabled={loading || (!watermarkFile && !currentWatermark)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Save size={18} />
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              
              {currentWatermark && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn btn-danger"
                >
                  <Trash2 size={18} />
                  Löschen
                </button>
              )}
            </div>
          </div>

          {/* Rechte Seite: Live-Vorschau */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Live-Vorschau</h3>
            <div style={{
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px',
              background: '#ffffff'
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '4px'
                }}
              />
              <img ref={sampleImageRef} style={{ display: 'none' }} alt="" />
            </div>
            <p style={{
              fontSize: '12px',
              color: '#718096',
              marginTop: '10px',
              textAlign: 'center'
            }}>
              Beispiel-Bild (800x600px) mit Wasserzeichen-Vorschau
            </p>
          </div>
        </div>
      </div>

      {/* Info-Box */}
      <div className="card" style={{ marginTop: '20px', background: '#f0f9ff' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px', color: '#1e40af' }}>
          ℹ️ Hinweise
        </h3>
        <ul style={{ fontSize: '14px', color: '#1e40af', paddingLeft: '20px' }}>
          <li>Verwende PNG-Dateien mit transparentem Hintergrund für beste Ergebnisse</li>
          <li>Das Wasserzeichen wird automatisch auf alle Uploads angewendet (wenn aktiviert)</li>
          <li>Beim Upload kannst du wählen: <code>apply_watermark_flag=true</code></li>
          <li>Die Größe wird relativ zur Bildbreite skaliert</li>
        </ul>
      </div>
    </div>
  );
};

export default WatermarkPage;
