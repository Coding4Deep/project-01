const request = require('supertest');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

// Mock dependencies
jest.mock('mongoose');
jest.mock('redis');
jest.mock('kafkajs');

describe('Chat Service', () => {
  let app, server, io, clientSocket, serverSocket;
  let mockRedisClient, mockMessage;

  beforeAll((done) => {
    // Setup Express app
    app = express();
    server = http.createServer(app);
    io = new Server(server);
    
    // Mock Redis
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      disconnect: jest.fn()
    };
    redis.createClient = jest.fn().mockReturnValue(mockRedisClient);

    // Mock MongoDB
    mockMessage = {
      save: jest.fn().mockResolvedValue(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue(),
      findByIdAndDelete: jest.fn().mockResolvedValue({ username: 'testuser' })
    };
    mongoose.connect = jest.fn().mockResolvedValue();
    mongoose.model = jest.fn().mockReturnValue(mockMessage);

    server.listen(() => {
      const port = server.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Socket.IO Connection', () => {
    test('should connect successfully', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('should handle user join', (done) => {
      clientSocket.emit('join', 'testuser');
      
      setTimeout(() => {
        expect(serverSocket.username).toBe('testuser');
        done();
      }, 100);
    });

    test('should emit active users on join', (done) => {
      clientSocket.on('activeUsers', (users) => {
        expect(Array.isArray(users)).toBe(true);
        done();
      });
      
      clientSocket.emit('join', 'testuser');
    });
  });

  describe('Message Handling', () => {
    test('should handle public messages', (done) => {
      const messageData = {
        username: 'testuser',
        message: 'Hello world',
        room: 'general'
      };

      clientSocket.on('message', (data) => {
        expect(data.username).toBe('testuser');
        expect(data.message).toBe('Hello world');
        expect(data.room).toBe('general');
        done();
      });

      clientSocket.emit('message', messageData);
    });

    test('should handle private messages', (done) => {
      const messageData = {
        username: 'testuser',
        message: 'Private message',
        recipient: 'otheruser',
        isPrivate: true
      };

      clientSocket.on('privateMessage', (data) => {
        expect(data.username).toBe('testuser');
        expect(data.message).toBe('Private message');
        expect(data.isPrivate).toBe(true);
        done();
      });

      clientSocket.emit('privateMessage', messageData);
    });

    test('should validate message data', (done) => {
      const invalidMessage = {
        username: '',
        message: '',
        room: 'general'
      };

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('validation');
        done();
      });

      clientSocket.emit('message', invalidMessage);
    });
  });

  describe('Message Persistence', () => {
    test('should save messages to MongoDB', async () => {
      const messageData = {
        id: 'test123',
        username: 'testuser',
        message: 'Test message',
        room: 'general'
      };

      clientSocket.emit('message', messageData);

      setTimeout(() => {
        expect(mockMessage.findOneAndUpdate).toHaveBeenCalledWith(
          { id: 'test123' },
          expect.objectContaining(messageData),
          { upsert: true, new: true }
        );
      }, 100);
    });

    test('should handle MongoDB errors gracefully', async () => {
      mockMessage.findOneAndUpdate.mockRejectedValueOnce(new Error('DB Error'));
      
      const messageData = {
        username: 'testuser',
        message: 'Test message',
        room: 'general'
      };

      // Should not crash the service
      clientSocket.emit('message', messageData);
      
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
      }, 100);
    });
  });

  describe('API Endpoints', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('service', 'chat-service');
    });

    test('GET /api/messages should return message history', async () => {
      mockMessage.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            { username: 'user1', message: 'Hello', timestamp: new Date() }
          ])
        })
      });

      const response = await request(app).get('/api/messages');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/users/active should return active users', async () => {
      const response = await request(app).get('/api/users/active');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeUsers');
      expect(Array.isArray(response.body.activeUsers)).toBe(true);
    });

    test('DELETE /api/messages/:id should delete message', async () => {
      const response = await request(app)
        .delete('/api/messages/test123')
        .set('Authorization', 'Bearer mock-token');
      
      expect(response.status).toBe(200);
      expect(mockMessage.findByIdAndDelete).toHaveBeenCalledWith('test123');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid message format', (done) => {
      clientSocket.emit('message', 'invalid-format');
      
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    test('should handle disconnection gracefully', (done) => {
      clientSocket.emit('join', 'testuser');
      
      setTimeout(() => {
        clientSocket.disconnect();
        
        setTimeout(() => {
          expect(serverSocket.disconnected).toBe(true);
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Security', () => {
    test('should sanitize message content', (done) => {
      const maliciousMessage = {
        username: 'testuser',
        message: '<script>alert("xss")</script>',
        room: 'general'
      };

      clientSocket.on('message', (data) => {
        expect(data.message).not.toContain('<script>');
        done();
      });

      clientSocket.emit('message', maliciousMessage);
    });

    test('should validate username format', (done) => {
      const invalidUsername = '../../../etc/passwd';
      
      clientSocket.emit('join', invalidUsername);
      
      setTimeout(() => {
        expect(serverSocket.username).not.toBe(invalidUsername);
        done();
      }, 100);
    });
  });
});
