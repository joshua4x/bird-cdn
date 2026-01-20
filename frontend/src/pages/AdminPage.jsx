import React, { useState, useEffect } from 'react';
import { Settings, Database, Server, FolderPlus } from 'lucide-react';
import { getSystemInfo, listBuckets, createBucket } from '../api';

const AdminPage = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [newBucket, setNewBucket] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [infoRes, bucketsRes] = await Promise.all([
        getSystemInfo(),
        listBuckets()
      ]);
      
      setSystemInfo(infoRes.data);
      setBuckets(bucketsRes.data.buckets);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!newBucket) {
      alert('Please enter a bucket name');
      return;
    }

    try {
      await createBucket(newBucket);
      alert(`Bucket "${newBucket}" created successfully!`);
      setNewBucket('');
      loadData();
    } catch (error) {
      alert('Failed to create bucket: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Settings & Administration
        </h1>
        <p style={{ color: '#6b7280' }}>
          System configuration and management
        </p>
      </div>

      {/* System Info */}
      {systemInfo && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* CDN Config */}
          <div className="card">
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Server size={20} color="#3b82f6" />
              CDN Configuration
            </h3>
            
            <div style={{ fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Domain:</span>
                <span style={{ fontWeight: '500' }}>{systemInfo.cdn.domain}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Protocol:</span>
                <span style={{ fontWeight: '500' }}>{systemInfo.cdn.protocol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Cache Path:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {systemInfo.cdn.cache_path}
                </span>
              </div>
            </div>
          </div>

          {/* Storage Config */}
          <div className="card">
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Database size={20} color="#10b981" />
              Storage Configuration
            </h3>
            
            <div style={{ fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Type:</span>
                <span style={{ fontWeight: '500' }}>{systemInfo.storage.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Endpoint:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {systemInfo.storage.endpoint}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Default Bucket:</span>
                <span style={{ fontWeight: '500' }}>{systemInfo.storage.default_bucket}</span>
              </div>
            </div>
          </div>

          {/* Upload Limits */}
          <div className="card">
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Settings size={20} color="#f59e0b" />
              Upload Limits
            </h3>
            
            <div style={{ fontSize: '14px', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Max Size:</span>
                <span style={{ fontWeight: '500' }}>{systemInfo.upload_limits.max_size_gb} GB</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Image Types:
                </span>
                <div style={{ fontSize: '12px' }}>
                  {systemInfo.upload_limits.allowed_image_types.join(', ')}
                </div>
              </div>
              <div>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Video Types:
                </span>
                <div style={{ fontSize: '12px' }}>
                  {systemInfo.upload_limits.allowed_video_types.join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bucket Management */}
      <div className="card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          <Database size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Bucket Management
        </h3>

        {/* Create New Bucket */}
        <div style={{ 
          padding: '20px', 
          background: '#f9fafb', 
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Create New Bucket
          </h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={newBucket}
              onChange={(e) => setNewBucket(e.target.value)}
              placeholder="bucket-name"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCreateBucket}
              className="btn btn-primary"
            >
              <FolderPlus size={18} />
              Create Bucket
            </button>
          </div>
        </div>

        {/* Existing Buckets */}
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Existing Buckets
        </h4>
        
        {buckets.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {buckets.map((bucket, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '16px',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Database size={16} color="#3b82f6" />
                  <span style={{ fontWeight: '500' }}>{bucket.name}</span>
                </div>
                {bucket.created && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(bucket.created).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', padding: '20px', textAlign: 'center' }}>
            No buckets found
          </p>
        )}
      </div>

      {/* External Links */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          External Services
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href="http://localhost:9001" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn"
            style={{ background: '#e5e7eb', color: '#374151' }}
          >
            MinIO Console →
          </a>
          <a 
            href="http://localhost:3001" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn"
            style={{ background: '#e5e7eb', color: '#374151' }}
          >
            Grafana Dashboard →
          </a>
          <a 
            href="http://localhost:9090" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn"
            style={{ background: '#e5e7eb', color: '#374151' }}
          >
            Prometheus →
          </a>
          <a 
            href="/api/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            API Documentation →
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
