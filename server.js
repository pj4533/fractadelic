const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

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

// Global state
const state = {
    roughness: 0.5,
    palette: 'cosmic',
    seedPoints: [],
    evolveSpeed: 5,
    // Animation state for synchronized visuals
    globalTime: 0,
    waveOffset: 0,
    colorShift: 0
};

// Update animation state at regular intervals
setInterval(() => {
    // Update time-based animation parameters
    state.globalTime += 0.033; // Roughly 33ms
    state.waveOffset += 0.033 * 0.5; // Base wave movement 
    state.colorShift = (state.colorShift + 0.033 * 0.0002) % 1;
    
    // Broadcast animation state to all clients every 100ms
    io.emit('animationState', {
        globalTime: state.globalTime,
        waveOffset: state.waveOffset,
        colorShift: state.colorShift
    });
}, 100); // Update 10 times per second for efficiency

// Connected users
let connectedUsers = 0;

// Evolution timer
let evolutionInterval = null;

// Start evolution interval
function startEvolutionInterval() {
    // Clear any existing interval
    if (evolutionInterval) {
        clearInterval(evolutionInterval);
        console.log('Previous evolution interval cleared');
    }
    
    // Calculate interval time based on speed (1-10)
    const intervalTime = 10000 / state.evolveSpeed; // 1 to 10 seconds
    console.log(`Setting up evolution interval: ${intervalTime}ms (speed: ${state.evolveSpeed})`);
    
    // Set up new interval
    evolutionInterval = setInterval(() => {
        // Emit evolve event to all clients
        io.emit('evolve');
        console.log(`Sent 'evolve' event to all clients (${connectedUsers} users)`);
    }, intervalTime);
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log(`User connected [id: ${socket.id}] - Total users: ${connectedUsers + 1}`);
    connectedUsers++;
    
    // Broadcast updated user count
    io.emit('userCount', connectedUsers);
    console.log(`Sent 'userCount' to all clients: ${connectedUsers}`);
    
    // Send current state to new client
    socket.on('getState', () => {
        console.log(`Received 'getState' request from client [id: ${socket.id}]`);
        socket.emit('state', state);
        console.log(`Sent 'state' to client [id: ${socket.id}]: ${JSON.stringify(state)}`);
    });
    
    // Handle option updates
    socket.on('updateOption', (option) => {
        console.log(`Received 'updateOption' from client [id: ${socket.id}]: ${JSON.stringify(option)}`);
        // Update state with the new option
        Object.assign(state, option);
        
        // Broadcast to all other clients
        socket.broadcast.emit('state', state);
        console.log(`Broadcast 'state' to all other clients: ${JSON.stringify(state)}`);
    });
    
    // Handle new seed points
    socket.on('addSeed', (seedPoint) => {
        console.log(`Received 'addSeed' from client [id: ${socket.id}]: ${JSON.stringify(seedPoint)}`);
        // Add to state
        state.seedPoints.push(seedPoint);
        
        // Broadcast to all other clients
        socket.broadcast.emit('newSeed', seedPoint);
        console.log(`Broadcast 'newSeed' to all other clients: ${JSON.stringify(seedPoint)}`);
    });
    
    // Handle evolution speed changes
    socket.on('setEvolveSpeed', (speed) => {
        console.log(`Received 'setEvolveSpeed' from client [id: ${socket.id}]: ${speed}`);
        state.evolveSpeed = speed;
        startEvolutionInterval();
        console.log(`Evolution interval updated to ${10000 / state.evolveSpeed}ms`);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected [id: ${socket.id}] - Remaining users: ${connectedUsers - 1}`);
        connectedUsers--;
        
        // Broadcast updated user count
        io.emit('userCount', connectedUsers);
        console.log(`Sent 'userCount' to all clients: ${connectedUsers}`);
        
        // If no users left, clear the evolution interval
        if (connectedUsers === 0 && evolutionInterval) {
            clearInterval(evolutionInterval);
            evolutionInterval = null;
            console.log('No users left - Evolution interval cleared');
        }
    });
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/public/index.html'));
});

// Start the evolution
startEvolutionInterval();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});