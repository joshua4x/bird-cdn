import React, { useState, useEffect } from 'react';
import { FileImage, Video, Trash2, Copy, ExternalLink } from 'lucide-react';
import { listFiles, deleteFile } from '../api';
import { format } from 'date-fns';

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [bucket, setBucket] = useState('');

  useEffect(() => {
    loadFiles();
  }, [filter, bucket]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.file_type = filter;
      if (bucket) params.bucket = bucket;
      
      const response = await listFiles(params);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId, filename) => {
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
      await deleteFile(fileId);
      loadFiles();
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied!');
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Files
        </h1>
        <p style={{ color: '#6b7280' }}>
          Manage all uploaded files
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Type
            </label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Files</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Bucket
            </label>
            <input
              type="text"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              placeholder="Filter by bucket..."
              style={{ width: '200px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={loadFiles} className="btn btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <FileImage size={48} color="#d1d5db" style={{ margin: '0 auto' }} />
            <p style={{ color: '#6b7280', marginTop: '16px' }}>No files found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Downloads</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      {file.file_type === 'image' ? (
                        <img 
                          src={file.cdn_url} 
                          alt={file.original_filename}
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            objectFit: 'cover', 
                            borderRadius: '4px' 
                          }}
                        />
                      ) : (
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          background: '#f3f4f6',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Video size={24} color="#6b7280" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {file.original_filename}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>
                          {file.bucket}/{file.path}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${file.file_type === 'image' ? 'badge-info' : 'badge-success'}`}>
                        {file.file_type}
                      </span>
                    </td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{file.download_count.toLocaleString()}</td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {file.created_at ? format(new Date(file.created_at), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => copyUrl(file.cdn_url)}
                          className="btn"
                          style={{ 
                            padding: '6px 12px',
                            background: '#e5e7eb',
                            color: '#374151'
                          }}
                          title="Copy URL"
                        >
                          <Copy size={14} />
                        </button>
                        <a
                          href={file.cdn_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ 
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white'
                          }}
                          title="Open"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => handleDelete(file.id, file.filename)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>
        Total: {files.length} files
      </div>
    </div>
  );
};

export default FilesPage;
