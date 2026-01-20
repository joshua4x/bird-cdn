import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { 
  purgeSingleFile, 
  purgeBucket, 
  purgeAllCache, 
  getPurgeHistory,
  listCachedFiles 
} from '../api';
import { format } from 'date-fns';

const CachePage = () => {
  const [path, setPath] = useState('');
  const [bucket, setBucket] = useState('');
  const [purgeHistory, setPurgeHistory] = useState([]);
  const [cachedFiles, setCachedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, filesRes] = await Promise.all([
        getPurgeHistory(20),
        listCachedFiles(50)
      ]);
      
      setPurgeHistory(historyRes.data.purge_operations);
      setCachedFiles(filesRes.data.cached_files);
    } catch (error) {
      console.error('Error loading cache data:', error);
    }
  };

  const handlePurgeSingle = async () => {
    if (!path) {
      alert('Please enter a path');
      return;
    }

    setLoading(true);
    try {
      const response = await purgeSingleFile(path);
      alert(`Success! Purged ${response.data.files_purged} files`);
      setPath('');
      loadData();
    } catch (error) {
      alert('Purge failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeBucket = async () => {
    if (!bucket) {
      alert('Please enter a bucket name');
      return;
    }

    if (!confirm(`Purge all files from bucket "${bucket}"?`)) return;

    setLoading(true);
    try {
      const response = await purgeBucket(bucket);
      alert(`Success! Purged ${response.data.files_purged} files from bucket "${bucket}"`);
      setBucket('');
      loadData();
    } catch (error) {
      alert('Purge failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('⚠️ PURGE ENTIRE CACHE? This cannot be undone!')) return;
    if (!confirm('Are you absolutely sure? All cached files will be deleted!')) return;

    setLoading(true);
    try {
      const response = await purgeAllCache();
      alert(`Success! Purged ${response.data.files_purged} files, freed ${(response.data.bytes_freed / 1024 / 1024).toFixed(2)} MB`);
      loadData();
    } catch (error) {
      alert('Purge failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Cache Management
        </h1>
        <p style={{ color: '#6b7280' }}>
          Purge cached files to force refresh from origin
        </p>
      </div>

      {/* Purge Actions */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Purge Single File */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Purge Single File
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Purge a specific file from cache
          </p>
          
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/media/image.jpg"
            style={{ marginBottom: '12px' }}
          />
          
          <button
            onClick={handlePurgeSingle}
            disabled={loading || !path}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Trash2 size={18} />
            Purge File
          </button>
        </div>

        {/* Purge Bucket */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Purge Bucket
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Purge all files from a bucket
          </p>
          
          <input
            type="text"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            placeholder="media"
            style={{ marginBottom: '12px' }}
          />
          
          <button
            onClick={handlePurgeBucket}
            disabled={loading || !bucket}
            className="btn"
            style={{ 
              width: '100%', 
              justifyContent: 'center',
              background: '#f59e0b',
              color: 'white'
            }}
          >
            <Trash2 size={18} />
            Purge Bucket
          </button>
        </div>

        {/* Purge All */}
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#991b1b' }}>
            ⚠️ Purge All Cache
          </h3>
          <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '16px' }}>
            <strong>Danger Zone:</strong> Deletes entire cache!
          </p>
          
          <button
            onClick={handlePurgeAll}
            disabled={loading}
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <AlertTriangle size={18} />
            Purge All Cache
          </button>
        </div>
      </div>

      {/* Currently Cached Files */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Currently Cached Files ({cachedFiles.length})
        </h3>
        
        {cachedFiles.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Hit Count</th>
                  <th>Cache Size</th>
                  <th>Last Hit</th>
                </tr>
              </thead>
              <tbody>
                {cachedFiles.map((file, index) => (
                  <tr key={index}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {file.path}
                    </td>
                    <td>
                      <span className="badge badge-success">
                        {file.hit_count} hits
                      </span>
                    </td>
                    <td>{file.cache_size ? formatBytes(file.cache_size) : '-'}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {file.last_hit ? format(new Date(file.last_hit), 'MMM dd, HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Trash2 size={48} color="#d1d5db" style={{ margin: '0 auto' }} />
            <p style={{ color: '#6b7280', marginTop: '16px' }}>No cached files</p>
          </div>
        )}
      </div>

      {/* Purge History */}
      <div className="card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Purge History
        </h3>
        
        {purgeHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Files Purged</th>
                  <th>Bytes Freed</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purgeHistory.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="badge badge-info">
                        {log.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {log.target}
                    </td>
                    <td>{log.files_purged}</td>
                    <td>{formatBytes(log.bytes_freed)}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {log.created_at ? format(new Date(log.created_at), 'MMM dd, HH:mm') : '-'}
                    </td>
                    <td>
                      {log.success ? (
                        <CheckCircle size={18} color="#10b981" />
                      ) : (
                        <AlertTriangle size={18} color="#ef4444" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Clock size={48} color="#d1d5db" style={{ margin: '0 auto' }} />
            <p style={{ color: '#6b7280', marginTop: '16px' }}>No purge history</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CachePage;
