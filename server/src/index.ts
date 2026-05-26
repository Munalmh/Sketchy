import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameManager } from './gameEngine';
import { setupSocketHandlers } from './socketHandler';

// Load configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware configuration
app.use(cors({
  origin: '*', // Allow all origins for dev testing
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// API health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Sketchy server is running smoothly.' });
});

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all clients
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Initialize game manager and attach handlers
const gameManager = new GameManager(io);
setupSocketHandlers(io, gameManager);

// Start server listening
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Sketchy.io Server Started Successfully!`);
  console.log(`📶 Listening on port: ${PORT}`);
  console.log(`=========================================`);
});
