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
    palette: 'earth',
    seedPoints: [],
    evolveSpeed: 5
};

// Connected users
let connectedUsers = 0;

// Evolution timer
let evolutionInterval = null;

// Start evolution interval
function startEvolutionInterval() {
    // Clear any existing interval
    if (evolutionInterval) {
        clearInterval(evolutionInterval);
    }
    
    // Calculate interval time based on speed (1-10)
    const intervalTime = 10000 / state.evolveSpeed; // 1 to 10 seconds
    
    // Set up new interval
    evolutionInterval = setInterval(() => {
        // Emit evolve event to all clients
        io.emit('evolve');
    }, intervalTime);
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('User connected');
    connectedUsers++;
    
    // Broadcast updated user count
    io.emit('userCount', connectedUsers);
    
    // Send current state to new client
    socket.on('getState', () => {
        socket.emit('state', state);
    });
    
    // Handle option updates
    socket.on('updateOption', (option) => {
        // Update state with the new option
        Object.assign(state, option);
        
        // Broadcast to all other clients
        socket.broadcast.emit('state', state);
    });
    
    // Handle new seed points
    socket.on('addSeed', (seedPoint) => {
        // Add to state
        state.seedPoints.push(seedPoint);
        
        // Broadcast to all other clients
        socket.broadcast.emit('newSeed', seedPoint);
    });
    
    // Handle evolution speed changes
    socket.on('setEvolveSpeed', (speed) => {
        state.evolveSpeed = speed;
        startEvolutionInterval();
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        connectedUsers--;
        
        // Broadcast updated user count
        io.emit('userCount', connectedUsers);
        
        // If no users left, clear the evolution interval
        if (connectedUsers === 0 && evolutionInterval) {
            clearInterval(evolutionInterval);
            evolutionInterval = null;
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