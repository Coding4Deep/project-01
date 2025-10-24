import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const { username, token, logout } = useAuth();
  const navigate = useNavigate();

  const USER_SERVICE_URL = 'http://localhost:8080';
  const CHAT_SERVICE_URL = 'http://localhost:3001';

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }

    // Connect to Socket.IO to be tracked as online
    const newSocket = io(CHAT_SERVICE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', username);
    });

    newSocket.on('activeUsers', (users) => {
      setOnlineUsers((users || []).filter(u => u !== username));
    });

    fetchData();
    
    const interval = setInterval(fetchOnlineUsers, 5000);
    
    return () => {
      clearInterval(interval);
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [username, navigate]);

  const fetchData = async () => {
    await Promise.all([fetchDashboardData(), fetchOnlineUsers()]);
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/api/users/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError('Failed to fetch user data');
      }
    } catch (err) {
      setError('Cannot connect to user service');
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await fetch(`${CHAT_SERVICE_URL}/api/users/active`);
      if (response.ok) {
        const data = await response.json();
        setOnlineUsers((data.activeUsers || []).filter(u => u !== username));
      }
    } catch (err) {
      console.error('Cannot fetch online users:', err);
    }
  };

  const startPrivateChat = (targetUser) => {
    navigate('/chat', { 
      state: { 
        selectedUser: targetUser, 
        chatMode: 'private' 
      } 
    });
  };

  if (!username) {
    return <div>Please log in</div>;
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error: {error}</h3>
          <button onClick={() => window.location.reload()} style={styles.button}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome, {username}!</p>
        </div>
        <div>
          <button onClick={() => navigate('/profile')} style={styles.primaryButton}>
            My Profile
          </button>
          <button onClick={() => navigate('/posts')} style={styles.primaryButton}>
            📸 Posts
          </button>
          <button onClick={() => navigate('/chat')} style={styles.primaryButton}>
            Go to Chat
          </button>
          <button onClick={() => navigate('/monitoring')} style={styles.monitoringButton}>
            📊 System Monitor
          </button>
          <button onClick={logout} style={styles.dangerButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total Users</h3>
            <div style={styles.statNumber}>{dashboardData?.totalUsers || 0}</div>
          </div>
          <div style={styles.statCard}>
            <h3>Registered & Active</h3>
            <div style={styles.statNumber}>{dashboardData?.activeUsers || 0}</div>
          </div>
          <div style={styles.statCard}>
            <h3>Currently Online</h3>
            <div style={styles.statNumber}>{onlineUsers.length}</div>
            <button onClick={fetchOnlineUsers} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Online Users - Currently in chat */}
        {onlineUsers.length > 0 && (
          <div style={styles.section}>
            <h2>🟢 Users Online Now (In Chat)</h2>
            <div style={styles.onlineGrid}>
              {onlineUsers.map(user => (
                <div key={user} style={styles.onlineCard}>
                  <div>
                    <div style={styles.onlineUser}>👤 {user}</div>
                    <div style={styles.onlineStatus}>🟢 Online in chat</div>
                  </div>
                  <button
                    onClick={() => startPrivateChat(user)}
                    style={styles.chatButton}
                  >
                    💬 Chat Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Users */}
        <div style={styles.section}>
          <h2>All Registered Users</h2>
          <div style={styles.usersList}>
            {dashboardData?.users?.map(user => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>
                    {user.username}
                    {user.username === username && <span style={styles.youBadge}> (You)</span>}
                  </div>
                  <div style={styles.userEmail}>{user.email}</div>
                  <div style={styles.lastSeen}>
                    Last seen: {new Date(user.lastSeen).toLocaleString()}
                  </div>
                </div>
                <div style={styles.userActions}>
                  <div style={styles.statusContainer}>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: user.active ? '#28a745' : '#6c757d'
                    }}>
                      {user.active ? '✓ Active Account' : '✗ Inactive Account'}
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: onlineUsers.includes(user.username) ? '#007bff' : '#e9ecef',
                      color: onlineUsers.includes(user.username) ? 'white' : '#6c757d'
                    }}>
                      {onlineUsers.includes(user.username) ? '🟢 Online' : '⚫ Offline'}
                    </div>
                  </div>
                  {user.username !== username && (
                    <>
                      <button
                        onClick={() => navigate(`/profile/${user.username}`)}
                        style={styles.profileButton}
                      >
                        👤 View Profile
                      </button>
                      <button
                        onClick={() => startPrivateChat(user.username)}
                        style={{
                          ...styles.chatButton,
                          backgroundColor: onlineUsers.includes(user.username) ? '#28a745' : '#ffc107',
                          color: onlineUsers.includes(user.username) ? 'white' : 'black'
                        }}
                      >
                        💬 {onlineUsers.includes(user.username) ? 'Chat Now' : 'Send Message'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {onlineUsers.length === 0 && (
          <div style={styles.section}>
            <div style={styles.emptyState}>
              <h3>No Other Users Online</h3>
              <p>When other users join the chat, they will appear here and you can start private conversations.</p>
              <button onClick={fetchOnlineUsers} style={styles.primaryButton}>
                🔄 Check Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#007bff',
    margin: '10px 0'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  onlineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  onlineCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '2px solid #007bff',
    borderRadius: '8px',
    backgroundColor: '#f0f8ff'
  },
  onlineUser: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff'
  },
  onlineStatus: {
    fontSize: '14px',
    color: '#28a745'
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  youBadge: {
    color: '#007bff',
    fontSize: '14px'
  },
  userEmail: {
    color: '#6c757d',
    marginBottom: '5px'
  },
  lastSeen: {
    color: '#6c757d',
    fontSize: '12px'
  },
  userActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white'
  },
  primaryButton: {
    padding: '12px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '10px'
  },
  dangerButton: {
    padding: '12px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  monitoringButton: {
    padding: '12px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '10px'
  },
  chatButton: {
    padding: '8px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    marginLeft: '5px'
  },
  profileButton: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  refreshButton: {
    padding: '5px 10px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '10px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6c757d'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px'
  },
  error: {
    textAlign: 'center',
    padding: '50px',
    color: '#dc3545'
  }
};

export default Dashboard;
