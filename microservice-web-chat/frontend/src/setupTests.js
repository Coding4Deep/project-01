import '@testing-library/jest-dom';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock localStorage safely
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock window.alert
window.alert = jest.fn();

beforeEach(() => {
  fetch.mockClear();
  window.localStorage.getItem.mockClear();
  window.localStorage.setItem.mockClear();
  window.localStorage.removeItem.mockClear();
});
