import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Chat from '../Chat';
import { AuthContext } from '../../context/AuthContext';
import io from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Chat Component', () => {
  let mockSocket;
  let mockAuthContext;

  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
      connected: true
    };

    io.mockReturnValue(mockSocket);

    mockAuthContext = {
      username: 'testuser',
      logout: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderChat = () => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Chat />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders chat component with public chat by default', () => {
    renderChat();
    
    expect(screen.getByText('Public Chat')).toBeInTheDocument();
    expect(screen.getByText('Chat Options')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  test('connects to socket on mount', () => {
    renderChat();
    
    expect(io).toHaveBeenCalledWith('http://localhost:3001');
    expect(mockSocket.emit).toHaveBeenCalledWith('join', 'testuser');
  });

  test('displays active users in sidebar', async () => {
    renderChat();
    
    // Simulate receiving active users
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    onActiveUsers(['user1', 'user2']);

    await waitFor(() => {
      expect(screen.getByText('Active Users (2)')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  test('switches to private chat when user is selected', async () => {
    renderChat();
    
    // Simulate receiving active users
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    onActiveUsers(['user1']);

    await waitFor(() => {
      const userButton = screen.getByText('user1');
      fireEvent.click(userButton);
    });

    expect(screen.getByText('Private Chat with user1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message user1...')).toBeInTheDocument();
  });

  test('sends public message', async () => {
    renderChat();
    
    const messageInput = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(messageInput, { target: { value: 'Hello everyone!' } });
    fireEvent.click(sendButton);

    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      username: 'testuser',
      message: 'Hello everyone!'
    });
  });

  test('sends private message', async () => {
    renderChat();
    
    // Switch to private chat
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    onActiveUsers(['user1']);

    await waitFor(() => {
      const userButton = screen.getByText('user1');
      fireEvent.click(userButton);
    });

    const messageInput = screen.getByPlaceholderText('Message user1...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(messageInput, { target: { value: 'Private hello!' } });
    fireEvent.click(sendButton);

    expect(mockSocket.emit).toHaveBeenCalledWith('sendPrivateMessage', {
      username: 'testuser',
      message: 'Private hello!',
      recipient: 'user1'
    });
  });

  test('displays public messages', async () => {
    renderChat();
    
    // Simulate receiving message history
    const onMessageHistory = mockSocket.on.mock.calls.find(call => call[0] === 'messageHistory')[1];
    onMessageHistory([
      {
        id: '1',
        username: 'user1',
        message: 'Hello world!',
        timestamp: new Date().toISOString()
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText('user1:')).toBeInTheDocument();
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });
  });

  test('displays private messages', async () => {
    renderChat();
    
    // Switch to private chat first
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    onActiveUsers(['user1']);

    await waitFor(() => {
      const userButton = screen.getByText('user1');
      fireEvent.click(userButton);
    });

    // Simulate receiving private message history
    const onPrivateMessageHistory = mockSocket.on.mock.calls.find(call => call[0] === 'privateMessageHistory')[1];
    onPrivateMessageHistory([
      {
        id: '1',
        username: 'user1',
        message: 'Private hello!',
        timestamp: new Date().toISOString(),
        recipient: 'testuser'
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText('user1:')).toBeInTheDocument();
      expect(screen.getByText('Private hello!')).toBeInTheDocument();
    });
  });

  test('switches back to public chat', async () => {
    renderChat();
    
    // First switch to private chat
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    onActiveUsers(['user1']);

    await waitFor(() => {
      const userButton = screen.getByText('user1');
      fireEvent.click(userButton);
    });

    // Then switch back to public
    const publicChatButton = screen.getByText('Public Chat');
    fireEvent.click(publicChatButton);

    expect(screen.getByText('Public Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  test('navigates to dashboard', () => {
    renderChat();
    
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('handles logout', async () => {
    renderChat();
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockAuthContext.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('disables send button when not connected', () => {
    mockSocket.connected = false;
    renderChat();
    
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  test('shows connection status', () => {
    renderChat();
    
    // Simulate connection
    const onConnect = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    onConnect();

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  test('handles message deletion in public chat', async () => {
    renderChat();
    
    // Simulate receiving own message
    const onMessageHistory = mockSocket.on.mock.calls.find(call => call[0] === 'messageHistory')[1];
    onMessageHistory([
      {
        id: '1',
        username: 'testuser',
        message: 'My message',
        timestamp: new Date().toISOString()
      }
    ]);

    await waitFor(() => {
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('deleteMessage', '1');
  });

  test('clears chat in public mode', () => {
    renderChat();
    
    const clearButton = screen.getByText('Clear Chat');
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    fireEvent.click(clearButton);

    expect(mockSocket.emit).toHaveBeenCalledWith('clearChat');
  });

  test('shows message count for users with private messages', async () => {
    renderChat();
    
    // Simulate receiving active users and private messages
    const onActiveUsers = mockSocket.on.mock.calls.find(call => call[0] === 'activeUsers')[1];
    const onPrivateMessageHistory = mockSocket.on.mock.calls.find(call => call[0] === 'privateMessageHistory')[1];
    
    onActiveUsers(['user1']);
    onPrivateMessageHistory([
      {
        id: '1',
        username: 'user1',
        message: 'Hello',
        timestamp: new Date().toISOString(),
        recipient: 'testuser'
      },
      {
        id: '2',
        username: 'testuser',
        message: 'Hi back',
        timestamp: new Date().toISOString(),
        recipient: 'user1'
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });
});
