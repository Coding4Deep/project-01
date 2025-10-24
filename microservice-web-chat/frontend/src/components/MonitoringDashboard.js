import React, { useState, useEffect } from 'react';

const MonitoringDashboard = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('http://localhost:8082/monitoring/monitoring/system-info');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSystemInfo(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch system information');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Running': return '#28a745';
      case 'Down': return '#dc3545';
      case 'Unhealthy': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading monitoring dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={fetchSystemInfo} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  const runningServices = systemInfo.services.filter(s => s.status === 'Running').length;
  const totalServices = systemInfo.services.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>System Monitoring Dashboard</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => window.history.back()} style={styles.backButton}>
            ← Back to Dashboard
          </button>
          <button onClick={fetchSystemInfo} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div style={styles.overviewGrid}>
        <div style={styles.overviewCard}>
          <h3>Services Status</h3>
          <div style={styles.overviewValue}>
            {runningServices}/{totalServices}
          </div>
          <div style={styles.overviewLabel}>Services Running</div>
        </div>
        <div style={styles.overviewCard}>
          <h3>System Health</h3>
          <div style={{...styles.overviewValue, color: runningServices === totalServices ? '#28a745' : '#ffc107'}}>
            {runningServices === totalServices ? 'Healthy' : 'Warning'}
          </div>
          <div style={styles.overviewLabel}>Overall Status</div>
        </div>
        <div style={styles.overviewCard}>
          <h3>CPU Usage</h3>
          <div style={styles.overviewValue}>
            {systemInfo.systemMetrics.cpuUsage.toFixed(1)}%
          </div>
          <div style={styles.overviewLabel}>Current Load</div>
        </div>
        <div style={styles.overviewCard}>
          <h3>Memory Usage</h3>
          <div style={styles.overviewValue}>
            {systemInfo.systemMetrics.memoryUsage.toFixed(1)}%
          </div>
          <div style={styles.overviewLabel}>RAM Utilization</div>
        </div>
      </div>

      {/* System Metrics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>System Metrics</h2>
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <h3>CPU Usage</h3>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${systemInfo.systemMetrics.cpuUsage}%`,
                  backgroundColor: systemInfo.systemMetrics.cpuUsage > 80 ? '#dc3545' : '#28a745'
                }}
              />
            </div>
            <span>{systemInfo.systemMetrics.cpuUsage.toFixed(1)}%</span>
          </div>
          
          <div style={styles.metricCard}>
            <h3>Memory Usage</h3>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${systemInfo.systemMetrics.memoryUsage}%`,
                  backgroundColor: systemInfo.systemMetrics.memoryUsage > 80 ? '#dc3545' : '#28a745'
                }}
              />
            </div>
            <span>{systemInfo.systemMetrics.memoryUsage.toFixed(1)}%</span>
            <small>{formatBytes(systemInfo.systemMetrics.totalMemory - systemInfo.systemMetrics.freeMemory)} / {formatBytes(systemInfo.systemMetrics.totalMemory)}</small>
          </div>
          
          <div style={styles.metricCard}>
            <h3>Disk Usage</h3>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${systemInfo.systemMetrics.diskUsage}%`,
                  backgroundColor: systemInfo.systemMetrics.diskUsage > 80 ? '#dc3545' : '#28a745'
                }}
              />
            </div>
            <span>{systemInfo.systemMetrics.diskUsage.toFixed(1)}%</span>
            <small>{formatBytes(systemInfo.systemMetrics.totalDisk - systemInfo.systemMetrics.freeDisk)} / {formatBytes(systemInfo.systemMetrics.totalDisk)}</small>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Microservices Status</h2>
        <div style={styles.servicesGrid}>
          {systemInfo.services.map((service, index) => (
            <div key={index} style={styles.serviceCard}>
              <div style={styles.serviceHeader}>
                <h3>{service.name}</h3>
                <span 
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(service.status)
                  }}
                >
                  {service.status}
                </span>
              </div>
              <div style={styles.serviceDetails}>
                <p><strong>Port:</strong> {service.port}</p>
                <p><strong>Database:</strong> {service.database}</p>
                <p><strong>CPU:</strong> {service.cpuUsage.toFixed(1)}%</p>
                <p><strong>Memory:</strong> {service.memoryUsage.toFixed(1)}%</p>
                <p><strong>Status:</strong> {service.uptime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Database Status</h2>
        <div style={styles.databaseGrid}>
          {Object.entries(systemInfo.databases).map(([name, db]) => (
            <div key={name} style={styles.databaseCard}>
              <div style={styles.serviceHeader}>
                <h3>{db.type}</h3>
                <span 
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(db.status)
                  }}
                >
                  {db.status}
                </span>
              </div>
              <div style={styles.serviceDetails}>
                <p><strong>Version:</strong> {db.version}</p>
                <p><strong>Connected Services:</strong></p>
                <ul style={styles.servicesList}>
                  {db.connectedServices.map((service, idx) => (
                    <li key={idx}>{service}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    color: '#333',
    margin: 0
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  loading: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#666',
    padding: '50px'
  },
  error: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#dc3545',
    padding: '50px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '5px',
    marginBottom: '20px'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  overviewCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  overviewValue: {
    fontSize: '2em',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '10px 0'
  },
  overviewLabel: {
    color: '#666',
    fontSize: '14px'
  },
  section: {
    marginBottom: '40px',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    color: '#495057',
    marginBottom: '20px',
    borderBottom: '2px solid #dee2e6',
    paddingBottom: '10px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  metricCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#e9ecef',
    borderRadius: '10px',
    overflow: 'hidden',
    margin: '10px 0'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  serviceCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  serviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  statusBadge: {
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  serviceDetails: {
    fontSize: '14px',
    color: '#666'
  },
  databaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  databaseCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  servicesList: {
    margin: '5px 0',
    paddingLeft: '20px'
  }
};

export default MonitoringDashboard;
