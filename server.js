const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { 
    setupStateManagement, 
    setupAnimationSync, 
    setupEvolutionTimers 
} = require('./server/stateManager.js');
const { 
    handleConnection, 
    handleDisconnection 
} = require('./server/connectionManager.js');

// Create Express app
const app = express();

// Enable CORS
app.use(cors());

// Serve static files from the client/public directory
app.use(express.static(path.join(__dirname, 'client/public')));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server);

// Initialize shared state
const state = {
    roughness: 0.5,
    palette: 'cosmic',
    seedPoints: [],
    evolveSpeed: 5,
    // Animation state for synchronized visuals
    globalTime: 0,
    colorShift: 0
};

// Connected users
let connectedUsers = 0;

// Setup state management subsystems
setupStateManagement(io, state);
setupAnimationSync(io, state);
const evolutionInterval = setupEvolutionTimers(io, state);

// Socket connection handling
io.on('connection', (socket) => {
    // Handle new connection
    connectedUsers = handleConnection(socket, io, state, connectedUsers);
    
    // Handle disconnection
    socket.on('disconnect', () => {
        connectedUsers = handleDisconnection(socket, io, connectedUsers, evolutionInterval);
    });
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});