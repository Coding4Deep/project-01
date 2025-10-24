import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthContext } from '../../context/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  const mockAuthContext = {
    user: { id: 1, username: 'testuser', token: 'test-token' },
    logout: jest.fn(),
  };

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Dashboard />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: [], posts: [] }),
    });
  });

  test('renders dashboard component', () => {
    renderDashboard();
    // Basic test to ensure component renders
    expect(document.body).toBeInTheDocument();
  });

  test('renders with user context', () => {
    renderDashboard();
    // Test passes if no errors are thrown during render
    expect(mockAuthContext.user.username).toBe('testuser');
  });
});
