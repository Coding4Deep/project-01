import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock AuthContext
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

test('renders app without crashing', () => {
  render(<App />);
  // Just check if the app renders without throwing
  expect(document.body).toBeInTheDocument();
});
