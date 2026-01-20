import React, { useState, useEffect } from 'react';
import { TrendingUp, Database, Activity, Trash2 } from 'lucide-react';
import { getTopFiles, getCachePerformance, getBandwidth } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const StatsPage = () => {
  const [topFiles, setTopFiles] = useState([]);
  const [cachePerf, setCachePerf] = useState(null);
  const [bandwidth, setBandwidth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [topRes, cachePerfRes, bandwidthRes] = await Promise.all([
        getTopFiles(10),
        getCachePerformance(),
        getBandwidth(7)
      ]);
      
      setTopFiles(topRes.data.top_files);
      setCachePerf(cachePerfRes.data);
      setBandwidth(bandwidthRes.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading statistics...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Statistics & Analytics
        </h1>
        <p style={{ color: '#6b7280' }}>
          Detailed performance metrics and insights
        </p>
      </div>

      {/* Bandwidth Trend */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Bandwidth & Cache Hit Ratio
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={bandwidth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="hour" stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="gb_sent" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Bandwidth (GB)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="hit_ratio" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Hit Ratio (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Files */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          <Database size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Top Downloaded Files
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topFiles.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="filename" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Bar dataKey="downloads" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Downloads</th>
                <th>Bandwidth Used</th>
              </tr>
            </thead>
            <tbody>
              {topFiles.map((file, index) => (
                <tr key={index}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {file.filename}
                  </td>
                  <td>
                    <span className={`badge ${file.type === 'image' ? 'badge-info' : 'badge-success'}`}>
                      {file.type}
                    </span>
                  </td>
                  <td>{file.downloads.toLocaleString()}</td>
                  <td>{formatBytes(file.bandwidth_used)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cache Performance */}
      {cachePerf && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* Top Cached Files */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              <Activity size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Top Cached Files
            </h3>
            {cachePerf.top_cached_files.length > 0 ? (
              <div style={{ fontSize: '14px' }}>
                {cachePerf.top_cached_files.slice(0, 5).map((file, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px',
                      borderBottom: index < 4 ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '12px',
                        color: '#374151'
                      }}>
                        {file.path.split('/').pop()}
                      </span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>
                        {file.hit_count} hits
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatBytes(file.bytes_served)} served
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                No cache data yet
              </p>
            )}
          </div>

          {/* Recent Cache Misses */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              <Trash2 size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Recent Cache Misses
            </h3>
            {cachePerf.recent_cache_misses.length > 0 ? (
              <div style={{ fontSize: '14px' }}>
                {cachePerf.recent_cache_misses.slice(0, 5).map((file, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px',
                      borderBottom: index < 4 ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '12px',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      {file.path.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#ef4444' }}>
                      {file.miss_count} misses
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                No misses recorded
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
