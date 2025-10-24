import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthContext } from '../../context/AuthContext';

// Mock fetch
global.fetch = jest.fn();

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  let mockAuthContext;

  beforeEach(() => {
    mockAuthContext = {
      token: 'test-token',
      logout: jest.fn()
    };

    fetch.mockClear();
    mockNavigate.mockClear();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Dashboard />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders dashboard with loading state initially', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderDashboard();
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  test('displays dashboard data after successful fetch', async () => {
    const mockDashboardData = {
      totalUsers: 5,
      activeUsers: 3,
      users: [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          active: true,
          lastSeen: '2023-10-23T10:00:00'
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          active: false,
          lastSeen: '2023-10-22T15:30:00'
        }
      ]
    };

    const mockActiveUsers = {
      activeUsers: ['user1', 'user3']
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActiveUsers)
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Total users
      expect(screen.getByText('3')).toBeInTheDocument(); // Active users
      expect(screen.getByText('2')).toBeInTheDocument(); // Online now
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Error connecting to user service')).toBeInTheDocument();
    });
  });

  test('shows retry button on error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  test('navigates to chat when Go to Chat is clicked', async () => {
    const mockDashboardData = {
      totalUsers: 1,
      activeUsers: 1,
      users: []
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData)
    });

    renderDashboard();

    await waitFor(() => {
      const chatButton = screen.getByText('Go to Chat');
      fireEvent.click(chatButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });

  test('handles logout', async () => {
    const mockDashboardData = {
      totalUsers: 1,
      activeUsers: 1,
      users: []
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData)
    });

    renderDashboard();

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
    });

    expect(mockAuthContext.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('shows private chat buttons for online users', async () => {
    const mockDashboardData = {
      totalUsers: 2,
      activeUsers: 1,
      users: [
        {
          id: 1,
          username: 'onlineuser',
          email: 'online@example.com',
          active: true,
          lastSeen: '2023-10-23T10:00:00'
        }
      ]
    };

    const mockActiveUsers = {
      activeUsers: ['onlineuser']
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActiveUsers)
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Chat Privately')).toBeInTheDocument();
      expect(screen.getByText('Start Private Chat')).toBeInTheDocument();
    });
  });

  test('starts private chat with selected user', async () => {
    const mockDashboardData = {
      totalUsers: 1,
      activeUsers: 1,
      users: [
        {
          id: 1,
          username: 'chatuser',
          email: 'chat@example.com',
          active: true,
          lastSeen: '2023-10-23T10:00:00'
        }
      ]
    };

    const mockActiveUsers = {
      activeUsers: ['chatuser']
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActiveUsers)
      });

    renderDashboard();

    await waitFor(() => {
      const privateChatButton = screen.getByText('Start Private Chat');
      fireEvent.click(privateChatButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/chat', {
      state: { selectedUser: 'chatuser', chatMode: 'private' }
    });
  });

  test('displays user status correctly', async () => {
    const mockDashboardData = {
      totalUsers: 2,
      activeUsers: 1,
      users: [
        {
          id: 1,
          username: 'activeuser',
          email: 'active@example.com',
          active: true,
          lastSeen: '2023-10-23T10:00:00'
        },
        {
          id: 2,
          username: 'inactiveuser',
          email: 'inactive@example.com',
          active: false,
          lastSeen: '2023-10-22T10:00:00'
        }
      ]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData)
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  test('shows no online users message when none are online', async () => {
    const mockDashboardData = {
      totalUsers: 1,
      activeUsers: 0,
      users: []
    };

    const mockActiveUsers = {
      activeUsers: []
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActiveUsers)
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No other users currently online')).toBeInTheDocument();
    });
  });

  test('formats last seen date correctly', async () => {
    const mockDashboardData = {
      totalUsers: 1,
      activeUsers: 1,
      users: [
        {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          active: true,
          lastSeen: '2023-10-23T10:30:00'
        }
      ]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData)
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Last seen:/)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });
});
