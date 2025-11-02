import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import partnershipsRoutes from './routes/partnerships.js';
import resourcesRoutes from './routes/resources.js';
import focusRoutes from './routes/focus.js';
import pointsRoutes from './routes/points.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO setup for WebRTC signaling with PROFESSIONAL QUALITY settings
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.CLIENT_URL || "http://localhost:8080",
      /\.onrender\.com$/  // Allow all Render subdomains
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // CRITICAL: Increase max message size for high-quality video/audio streams
  maxHttpBufferSize: 1e8, // 100 MB for HD video chunks
  pingTimeout: 60000, // 60 seconds for stable connections
  pingInterval: 25000, // 25 seconds between pings
  upgradeTimeout: 30000, // 30 seconds for connection upgrade
  // Enable transport compression for better bandwidth usage
  perMessageDeflate: {
    threshold: 1024 // Only compress messages > 1KB
  },
  // Transports: WebSocket preferred for real-time audio/video
  transports: ['websocket', 'polling'],
  allowUpgrades: true
});

// Store active rooms and participants
const rooms = new Map();
const userSockets = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // Join a study room
  socket.on('join-room', ({ roomCode, userName, userId }) => {
    console.log(`📥 User ${userName} joining room: ${roomCode}`);
    
    socket.join(roomCode);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        participants: [],
        createdAt: new Date(),
        messages: []
      });
    }
    
    const room = rooms.get(roomCode);
    const participant = {
      socketId: socket.id,
      userId,
      userName,
      videoEnabled: true,
      audioEnabled: true,
      screenSharing: false,
      joinedAt: new Date()
    };
    
    room.participants.push(participant);
    userSockets.set(socket.id, { roomCode, userId, userName });
    
    // Notify existing users about new participant
    socket.to(roomCode).emit('user-joined', {
      userId,
      userName,
      socketId: socket.id
    });
    
    // Send current participants to the new user
    const otherParticipants = room.participants
      .filter(p => p.socketId !== socket.id)
      .map(p => ({
        userId: p.userId,
        userName: p.userName,
        socketId: p.socketId,
        videoEnabled: p.videoEnabled,
        audioEnabled: p.audioEnabled,
        screenSharing: p.screenSharing
      }));
    
    socket.emit('room-joined', {
      roomCode,
      participants: otherParticipants,
      participantCount: room.participants.length
    });
    
    // Broadcast updated participant count
    io.to(roomCode).emit('participant-count', room.participants.length);
    
    console.log(`✅ Room ${roomCode} now has ${room.participants.length} participants`);
  });

  // WebRTC signaling: Offer
  socket.on('webrtc-offer', ({ roomCode, targetSocketId, offer }) => {
    console.log(`📤 Sending PROFESSIONAL QUALITY offer from ${socket.id} to ${targetSocketId}`);
    console.log(`🎥 Offer includes: ${offer.sdp.includes('opus') ? 'Opus audio ✓' : 'Unknown audio'}, ${offer.sdp.includes('VP9') ? 'VP9 video ✓' : 'Unknown video'}`);
    
    const userData = userSockets.get(socket.id);
    io.to(targetSocketId).emit('webrtc-offer', {
      offer,
      senderSocketId: socket.id,
      senderUserName: userData?.userName || 'Unknown User'
    });
  });

  // WebRTC signaling: Answer
  socket.on('webrtc-answer', ({ roomCode, targetSocketId, answer }) => {
    console.log(`📤 Sending PROFESSIONAL QUALITY answer from ${socket.id} to ${targetSocketId}`);
    console.log(`🎥 Answer includes: ${answer.sdp.includes('opus') ? 'Opus audio ✓' : 'Unknown audio'}, ${answer.sdp.includes('VP9') ? 'VP9 video ✓' : 'Unknown video'}`);
    
    const userData = userSockets.get(socket.id);
    io.to(targetSocketId).emit('webrtc-answer', {
      answer,
      senderSocketId: socket.id,
      senderUserName: userData?.userName || 'Unknown User'
    });
  });

  // WebRTC signaling: ICE Candidate
  socket.on('ice-candidate', ({ roomCode, targetSocketId, candidate }) => {
    console.log(`🧊 Forwarding ICE candidate from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id
    });
  });

  // Quality monitoring (WhatsApp/Zoom-style adaptive quality)
  socket.on('quality-stats', ({ roomCode, stats }) => {
    // Forward quality stats to other participants for adaptive bitrate
    socket.to(roomCode).emit('partner-quality-stats', {
      socketId: socket.id,
      stats
    });
    
    // Log quality issues for monitoring
    if (stats.packetsLost > 10 || stats.jitter > 100) {
      console.log(`⚠️ Quality issue detected for ${socket.id}: ${stats.packetsLost} packets lost, ${stats.jitter}ms jitter`);
    }
  });

  // Bandwidth notification (helps peers adapt quality)
  socket.on('bandwidth-update', ({ roomCode, bandwidth }) => {
    console.log(`📊 Bandwidth update from ${socket.id}: ${bandwidth} kbps`);
    socket.to(roomCode).emit('partner-bandwidth', {
      socketId: socket.id,
      bandwidth
    });
  });

  // Media state changes
  socket.on('toggle-video', ({ roomCode, videoEnabled }) => {
    const userData = userSockets.get(socket.id);
    if (userData && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.videoEnabled = videoEnabled;
        socket.to(roomCode).emit('user-video-toggled', {
          socketId: socket.id,
          videoEnabled
        });
      }
    }
  });

  socket.on('toggle-audio', ({ roomCode, audioEnabled }) => {
    const userData = userSockets.get(socket.id);
    if (userData && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.audioEnabled = audioEnabled;
        socket.to(roomCode).emit('user-audio-toggled', {
          socketId: socket.id,
          audioEnabled
        });
      }
    }
  });

  socket.on('toggle-screen-share', ({ roomCode, screenSharing }) => {
    const userData = userSockets.get(socket.id);
    if (userData && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.screenSharing = screenSharing;
        socket.to(roomCode).emit('user-screen-share-toggled', {
          socketId: socket.id,
          screenSharing
        });
      }
    }
  });

  // Chat messages
  socket.on('send-message', ({ roomCode, message, userName }) => {
    if (rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const chatMessage = {
        id: Date.now().toString(),
        userId: userSockets.get(socket.id)?.userId,
        userName,
        message,
        timestamp: new Date()
      };
      room.messages.push(chatMessage);
      
      io.to(roomCode).emit('new-message', chatMessage);
    }
  });

  // Focus session events
  socket.on('focus-session-start', ({ roomCode, userName, sessionType, duration }) => {
    console.log(`⏱️ ${userName} started ${sessionType} session (${duration}s)`);
    socket.to(roomCode).emit('partner-focus-start', {
      userName,
      sessionType,
      duration,
      timestamp: new Date()
    });
  });

  socket.on('focus-session-complete', ({ roomCode, userName, sessionType, duration }) => {
    console.log(`✅ ${userName} completed ${sessionType} session (${duration}s)`);
    io.to(roomCode).emit('partner-focus-complete', {
      userName,
      sessionType,
      duration,
      timestamp: new Date()
    });
  });

  socket.on('focus-session-pause', ({ roomCode, userName }) => {
    socket.to(roomCode).emit('partner-focus-pause', { userName });
  });

  socket.on('focus-session-resume', ({ roomCode, userName }) => {
    socket.to(roomCode).emit('partner-focus-resume', { userName });
  });

  // Live timer updates
  socket.on('timer-update', ({ roomCode, userName, mode, timeLeft, totalDuration, isActive, timestamp }) => {
    console.log(`⏱️ Timer update from ${userName} in room ${roomCode}: ${mode} mode, ${timeLeft}s left, ${isActive ? 'active' : 'paused'}`);
    
    // Broadcast timer state to all other participants in the room
    socket.to(roomCode).emit('partner-timer-update', {
      socketId: socket.id,
      userName,
      mode,
      timeLeft,
      totalDuration,
      isActive,
      timestamp
    });
    
    console.log(`📡 Broadcasted timer update to room ${roomCode}`);
  });

  // Task events
  socket.on('task-completed', ({ roomCode, userName, taskTitle }) => {
    console.log(`✓ ${userName} completed task: ${taskTitle}`);
    socket.to(roomCode).emit('partner-task-complete', {
      userName,
      taskTitle,
      timestamp: new Date()
    });
  });

  socket.on('task-created', ({ roomCode, userName, taskTitle }) => {
    socket.to(roomCode).emit('partner-task-created', {
      userName,
      taskTitle,
      timestamp: new Date()
    });
  });

  // Leave room
  socket.on('leave-room', ({ roomCode }) => {
    handleUserLeaving(socket, roomCode);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    const userData = userSockets.get(socket.id);
    if (userData) {
      handleUserLeaving(socket, userData.roomCode);
    }
  });
});

// Helper function to handle user leaving
function handleUserLeaving(socket, roomCode) {
  if (!roomCode || !rooms.has(roomCode)) return;
  
  const room = rooms.get(roomCode);
  const userData = userSockets.get(socket.id);
  
  // Remove participant from room
  room.participants = room.participants.filter(p => p.socketId !== socket.id);
  
  // Notify others
  socket.to(roomCode).emit('user-left', {
    socketId: socket.id,
    userId: userData?.userId,
    userName: userData?.userName
  });
  
  // Update participant count
  io.to(roomCode).emit('participant-count', room.participants.length);
  
  // Clean up empty rooms
  if (room.participants.length === 0) {
    rooms.delete(roomCode);
    console.log(`🗑️  Room ${roomCode} deleted (empty)`);
  } else {
    console.log(`📤 User left room ${roomCode}. ${room.participants.length} participants remaining`);
  }
  
  userSockets.delete(socket.id);
  socket.leave(roomCode);
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.CLIENT_URL || "http://localhost:8080",
    /\.onrender\.com$/  // Allow all Render subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build (for production)
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/partnerships', partnershipsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/points', pointsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tandem Track Mate API is running' });
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or socket.io
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🎥 Video signaling server ready`);
});
