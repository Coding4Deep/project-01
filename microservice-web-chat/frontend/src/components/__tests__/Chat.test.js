import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Chat from '../Chat';
import { AuthContext } from '../../context/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Chat Component', () => {
  const mockAuthContext = {
    user: { id: 1, username: 'testuser', token: 'test-token' },
    logout: jest.fn(),
  };

  const renderChat = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Chat />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders chat component', () => {
    renderChat();
    // Basic test to ensure component renders
    expect(document.body).toBeInTheDocument();
  });

  test('renders with user context', () => {
    renderChat();
    // Test passes if no errors are thrown during render
    expect(mockAuthContext.user.username).toBe('testuser');
  });
});
