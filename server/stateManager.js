// State management functions for the server

// Define consistent timer values for better synchronization
const INTERNAL_UPDATE_INTERVAL = 16; // ms - internal state updates at 60fps
const HEARTBEAT_INTERVAL = 3000;     // ms - regular sync interval (3 seconds)
const SEED_UPDATE_INTERVAL = 1000;   // ms - random seed updates (1 second)

// Consistent movement rates for predictable client interpolation
const TIME_DELTA = 0.016;            // Global time increment per frame
const COLOR_DELTA = 0.016 * 0.0002;  // Color shift increment per frame

/**
 * Setup animation state synchronization
 * @param {Object} io - Socket.io server instance 
 * @param {Object} state - Shared state object
 * @returns {void}
 */
function setupAnimationSync(io, state) {
    // Continuous internal animation state updates (faster than broadcast)
    setInterval(() => {
        // Update time-based animation parameters at constant rates
        state.globalTime += TIME_DELTA;
        state.colorShift = (state.colorShift + COLOR_DELTA) % 1;
    }, INTERNAL_UPDATE_INTERVAL);

    // Seed updates for shared randomness - lightweight
    setInterval(() => {
        // Create shared random seed for determinism
        const sharedSeed = Math.floor(state.globalTime * 1000) % 10000;
        
        // Broadcast only seed data - no visual state changes
        io.emit('animationState', {
            sharedSeed: sharedSeed
        });
    }, SEED_UPDATE_INTERVAL);

    // Regular heartbeat sync to keep clients aligned
    let syncCounter = 0;
    setInterval(() => {
        syncCounter++;
        // Create shared random seed for determinism
        const sharedSeed = Math.floor(state.globalTime * 1000) % 10000;
        
        // Broadcast full animation state to all clients at regular intervals
        io.emit('animationState', {
            globalTime: state.globalTime,
            colorShift: state.colorShift,
            sharedSeed: sharedSeed,
            // Flag this as a sync checkpoint
            isSyncCheckpoint: true,
            // Add occasional microEvolve
            microEvolve: (syncCounter % 3 === 0)
        });
    }, HEARTBEAT_INTERVAL);
}

/**
 * Setup evolution timers
 * @param {Object} io - Socket.io server instance
 * @param {Object} state - Shared state object
 * @returns {Object} Evolution interval reference
 */
function setupEvolutionTimers(io, state) {
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
            console.log(`Sent 'evolve' event to all clients`);
        }, intervalTime);
        
        return evolutionInterval;
    }
    
    // Initialize evolution
    return startEvolutionInterval();
}

/**
 * Setup state management handlers
 * @param {Object} io - Socket.io server instance
 * @param {Object} state - Shared state object
 * @returns {void}
 */
function setupStateManagement(io, state) {
    // Socket event handlers are set up in connectionManager.js
    // This function can be used for future state management features
}

module.exports = {
    setupStateManagement,
    setupAnimationSync,
    setupEvolutionTimers
};