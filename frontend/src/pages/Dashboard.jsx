import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  HardDrive, 
  Zap, 
  Activity,
  FileImage,
  Video,
  Database
} from 'lucide-react';
import { getOverview, getBandwidth } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div className="card" style={{ 
    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
    border: `1px solid ${color}30`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
          {value}
        </h2>
        {subtitle && <p style={{ color: '#9ca3af', fontSize: '12px' }}>{subtitle}</p>}
      </div>
      <div style={{ 
        background: color, 
        padding: '12px', 
        borderRadius: '12px',
        boxShadow: `0 4px 12px ${color}40`
      }}>
        <Icon size={24} color="white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [bandwidth, setBandwidth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, bandwidthRes] = await Promise.all([
        getOverview(),
        getBandwidth(7)
      ]);
      
      setOverview(overviewRes.data);
      setBandwidth(bandwidthRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Activity size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '20px', color: '#6b7280' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!overview) {
    return <div>Error loading data</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#6b7280' }}>
          Overview of your CDN performance and statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatCard
          icon={Database}
          title="Total Files"
          value={overview.files.total.toLocaleString()}
          subtitle={`${overview.files.images} images, ${overview.files.videos} videos`}
          color="#3b82f6"
        />
        
        <StatCard
          icon={HardDrive}
          title="Storage Used"
          value={`${overview.storage.used_gb} GB`}
          subtitle={`${(overview.storage.used_bytes / 1024 / 1024).toFixed(0)} MB total`}
          color="#10b981"
        />
        
        <StatCard
          icon={Zap}
          title="Cache Hit Ratio"
          value={`${overview.cache.hit_ratio}%`}
          subtitle={`${overview.cache.cached_files} files cached`}
          color="#f59e0b"
        />
        
        <StatCard
          icon={TrendingUp}
          title="Bandwidth (24h)"
          value={`${overview.bandwidth.last_24h_gb} GB`}
          subtitle="Last 24 hours"
          color="#8b5cf6"
        />
      </div>

      {/* Bandwidth Chart */}
      <div className="card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Bandwidth Usage (Last 7 Days)
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={bandwidth}>
            <defs>
              <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
              formatter={(value) => [`${value.toFixed(2)} GB`, 'Bandwidth']}
            />
            <Area 
              type="monotone" 
              dataKey="gb_sent" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorBandwidth)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/admin/upload" className="btn btn-primary">
            Upload Files
          </a>
          <a href="/admin/cache" className="btn btn-danger">
            Purge Cache
          </a>
          <a href="/admin/stats" className="btn btn-success">
            View Analytics
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
