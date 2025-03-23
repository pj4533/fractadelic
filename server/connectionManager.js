// Connection management functions for the server

/**
 * Handle new client connection
 * @param {Object} socket - Socket.io socket for the client
 * @param {Object} io - Socket.io server instance
 * @param {Object} state - Shared state object
 * @param {number} connectedUsers - Current number of connected users
 * @returns {number} Updated count of connected users
 */
function handleConnection(socket, io, state, connectedUsers) {
    const newCount = connectedUsers + 1;
    console.log(`User connected [id: ${socket.id}] - Total users: ${newCount}`);
    
    // Broadcast updated user count
    io.emit('userCount', newCount);
    console.log(`Sent 'userCount' to all clients: ${newCount}`);
    
    // Set up event handlers for this client
    setupClientEventHandlers(socket, io, state);
    
    return newCount;
}

/**
 * Handle client disconnection
 * @param {Object} socket - Socket.io socket for the client
 * @param {Object} io - Socket.io server instance
 * @param {number} connectedUsers - Current number of connected users
 * @param {Object} evolutionInterval - Reference to the evolution interval
 * @returns {number} Updated count of connected users
 */
function handleDisconnection(socket, io, connectedUsers, evolutionInterval) {
    const newCount = connectedUsers - 1;
    console.log(`User disconnected [id: ${socket.id}] - Remaining users: ${newCount}`);
    
    // Broadcast updated user count
    io.emit('userCount', newCount);
    console.log(`Sent 'userCount' to all clients: ${newCount}`);
    
    // If no users left, clear the evolution interval
    if (newCount === 0 && evolutionInterval) {
        clearInterval(evolutionInterval);
        console.log('No users left - Evolution interval cleared');
    }
    
    return newCount;
}

/**
 * Set up event handlers for a client
 * @param {Object} socket - Socket.io socket for the client
 * @param {Object} io - Socket.io server instance
 * @param {Object} state - Shared state object
 * @returns {void}
 */
function setupClientEventHandlers(socket, io, state) {
    // Get current state
    socket.on('getState', () => {
        console.log(`Received 'getState' request from client [id: ${socket.id}]`);
        
        // Send full state
        socket.emit('state', state);
        console.log(`Sent 'state' to client [id: ${socket.id}]: ${JSON.stringify(state)}`);
        
        // Also send an immediate sync checkpoint to align animations
        const sharedSeed = Math.floor(state.globalTime * 1000) % 10000;
        socket.emit('animationState', {
            globalTime: state.globalTime,
            colorShift: state.colorShift,
            sharedSeed: sharedSeed,
            isSyncCheckpoint: true
        });
        console.log(`Sent initial sync checkpoint to client [id: ${socket.id}]`);
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
        
        // The interval will be restarted by the caller if needed
        console.log(`Evolution speed updated to ${speed}`);
    });
}

module.exports = {
    handleConnection,
    handleDisconnection
};