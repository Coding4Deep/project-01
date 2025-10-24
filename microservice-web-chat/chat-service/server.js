const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const redis = require('redis');
const { Kafka } = require('kafkajs');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatdb';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8080';

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message schema
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  room: { type: String, default: 'general' },
  isPrivate: { type: Boolean, default: false },
  recipient: { type: String, default: null }
});

const Message = mongoose.model('Message', messageSchema);

// Redis client
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Kafka setup
const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [KAFKA_BROKERS],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

let producer = null;
let consumer = null;
let kafkaConnected = false;

// Initialize Kafka with retry logic
async function initKafka() {
  try {
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'chat-group' });
    
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'chat-messages' });
    
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log('Received message from Kafka:', data);
          
          // Save to MongoDB using upsert to avoid duplicates
          await Message.findOneAndUpdate(
            { id: data.id },
            data,
            { upsert: true, new: true }
          );
          
          // Broadcast only public messages to all clients
          if (!data.isPrivate) {
            io.emit('message', data);
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
    
    kafkaConnected = true;
    console.log('Kafka connected successfully');
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    console.log('Chat service will continue without Kafka (direct messaging only)');
    kafkaConnected = false;
  }
}

// Socket.IO connection handling
const connectedUsers = new Map(); // Track connected users

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', async (username) => {
    socket.username = username;
    connectedUsers.set(username, socket.id);
    console.log(`${username} joined the chat`);
    
    // Get public message history
    const messages = await Message.find({ isPrivate: false }).sort({ timestamp: 1 }).limit(50);
    socket.emit('messageHistory', messages);
    
    // Get private message history for this user
    const privateMessages = await Message.find({
      isPrivate: true,
      $or: [{ username: username }, { recipient: username }]
    }).sort({ timestamp: 1 });
    socket.emit('privateMessageHistory', privateMessages);
    
    // Send updated user list to all clients
    const activeUsers = Array.from(connectedUsers.keys());
    io.emit('activeUsers', activeUsers);
    
    // Notify others
    socket.broadcast.emit('userJoined', username);
  });
  
  socket.on('sendMessage', async (data) => {
    const messageData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: data.username,
      message: data.message,
      timestamp: new Date(),
      room: data.room || 'general',
      isPrivate: data.isPrivate || false,
      recipient: data.recipient || null
    };
    
    try {
      // Save to MongoDB using upsert to avoid duplicates
      await Message.findOneAndUpdate(
        { id: messageData.id },
        messageData,
        { upsert: true, new: true }
      );
      
      // If Kafka is available, send to Kafka, otherwise broadcast directly
      if (kafkaConnected && producer) {
        await producer.send({
          topic: 'chat-messages',
          messages: [{ value: JSON.stringify(messageData) }]
        });
      } else {
        // Direct broadcast if Kafka is not available
        if (!messageData.isPrivate) {
          io.emit('message', messageData);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback: broadcast directly even if save fails
      if (!messageData.isPrivate) {
        io.emit('message', messageData);
      }
    }
  });
  
  socket.on('sendPrivateMessage', async (data) => {
    const messageData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: data.username,
      message: data.message,
      timestamp: new Date(),
      room: 'private',
      isPrivate: true,
      recipient: data.recipient
    };
    
    // Save to MongoDB using upsert to avoid duplicates (for offline delivery)
    await Message.findOneAndUpdate(
      { id: messageData.id },
      messageData,
      { upsert: true, new: true }
    );
    
    // Send to sender immediately
    socket.emit('privateMessage', messageData);
    
    // Send to recipient if online, otherwise store for later delivery
    const recipientSocketId = connectedUsers.get(data.recipient);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('privateMessage', messageData);
    }
    // If recipient is offline, message is already saved and will be delivered when they connect
  });

  socket.on('deleteMessage', async (messageId) => {
    try {
      const deletedMessage = await Message.findOneAndDelete({ id: messageId });
      if (deletedMessage) {
        // Broadcast deletion to all clients for public messages
        if (!deletedMessage.isPrivate) {
          io.emit('messageDeleted', messageId);
        } else {
          // For private messages, only notify the conversation participants
          socket.emit('messageDeleted', messageId);
          const otherUser = deletedMessage.username === socket.username ? 
            deletedMessage.recipient : deletedMessage.username;
          const otherSocketId = connectedUsers.get(otherUser);
          if (otherSocketId) {
            io.to(otherSocketId).emit('messageDeleted', messageId);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });
  
  socket.on('clearChat', async () => {
    try {
      await Message.deleteMany({});
      io.emit('chatCleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.username) {
      connectedUsers.delete(socket.username);
      const activeUsers = Array.from(connectedUsers.keys());
      io.emit('activeUsers', activeUsers);
      socket.broadcast.emit('userLeft', socket.username);
    }
  });
});

// REST API endpoints
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({ isPrivate: false }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/private/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { with: otherUser } = req.query;
    
    const messages = await Message.find({
      isPrivate: true,
      $or: [
        { username: username, recipient: otherUser },
        { username: otherUser, recipient: username }
      ]
    }).sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/active', async (req, res) => {
  try {
    const activeUsers = Array.from(connectedUsers.keys());
    res.json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users who have exchanged private messages with current user
app.get('/api/users/conversations/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const conversations = await Message.aggregate([
      {
        $match: {
          isPrivate: true,
          $or: [
            { username: username },
            { recipient: username }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$username', username] },
              '$recipient',
              '$username'
            ]
          },
          lastMessage: { $last: '$message' },
          lastTimestamp: { $last: '$timestamp' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $project: {
          username: '$_id',
          lastMessage: 1,
          lastTimestamp: 1,
          messageCount: 1,
          _id: 0
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await Message.findOneAndDelete({ id: req.params.id });
    io.emit('messageDeleted', req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages', async (req, res) => {
  try {
    await Message.deleteMany({});
    io.emit('chatCleared');
    res.json({ message: 'Chat cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'chat-service',
    kafka: kafkaConnected ? 'connected' : 'disconnected',
    onlineUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  try {
    // Start server first
    server.listen(PORT, () => {
      console.log(`Chat service running on port ${PORT}`);
    });
    
    // Initialize Kafka in background (non-blocking)
    initKafka().catch(error => {
      console.error('Kafka initialization failed, continuing without Kafka:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
