// ServerConnection class - Handles WebSocket communication with server
import { updateStatusElement } from '../utils/UIUtils.js';

class ServerConnection {
    constructor(fractal, uiManager) {
        this.fractal = fractal;
        this.uiManager = uiManager;
        this.socket = null;
        this.connected = false;
        this.activeUsers = 1;
        
        // Get UI status elements
        this.serverStatusElement = document.getElementById('server-status');
        this.activeUsersElement = document.getElementById('activeUsers');
        
        // Initialize the socket connection
        this.connect();
    }
    
    // Initialize socket.io connection
    connect() {
        // Create Socket.io connection - connects to the server that served the page
        this.socket = io();
        
        // Set up event handlers
        this.setupEventHandlers();
    }
    
    // Setup socket event handlers
    setupEventHandlers() {
        // Connection established
        this.socket.on('connect', () => {
            console.log(`Connected to server [id: ${this.socket.id}]`);
            updateStatusElement(this.serverStatusElement, 'Server status: Connected');
            this.serverStatusElement.className = 'server-status connected';
            this.connected = true;
            
            // Get initial state
            console.log('Sending getState request to server');
            this.socket.emit('getState');
        });
        
        // Disconnect handler
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server - reason:', this.socket.disconnected ? 'client disconnect' : 'server disconnect');
            updateStatusElement(this.serverStatusElement, 'Server status: Disconnected', false);
            this.serverStatusElement.className = 'server-status disconnected';
            this.connected = false;
        });
        
        // Reconnection attempt
        this.socket.on('reconnecting', (attemptNumber) => {
            console.log(`Attempting to reconnect to server (attempt ${attemptNumber})`);
            updateStatusElement(this.serverStatusElement, 'Server status: Reconnecting...', false);
            this.serverStatusElement.className = 'server-status';
        });
        
        // User count updates
        this.socket.on('userCount', (count) => {
            console.log(`Received userCount update: ${count} users online`);
            this.activeUsers = count;
            updateStatusElement(this.activeUsersElement, `${this.activeUsers} user${this.activeUsers !== 1 ? 's' : ''} online`, false);
        });
        
        // Handle incoming state from server
        this.socket.on('state', (state) => {
            console.log(`Received state update:`, state);
            
            // Update fractal with server state
            this.fractal.updateOptions({
                palette: state.palette,
                seedPoints: state.seedPoints,
            });
            
            // Update UI controls
            if (this.uiManager) {
                this.uiManager.updateFromServerState(state);
            }
            
            console.log(`Applied state update to fractal with new visual parameters`);
        });
        
        // Handle incoming seed points from other users
        this.socket.on('newSeed', (seedPoint) => {
            console.log(`Received new seed point from another user:`, seedPoint);
            this.fractal.addSeedPoint(seedPoint.x, seedPoint.y, seedPoint.value);
        });
        
        // Handle evolution updates from server
        this.socket.on('evolve', () => {
            console.log('Received evolution trigger from server');
            this.fractal.evolve(0.01);
        });
        
        // Handle animation state updates from server
        this.socket.on('animationState', (animState) => {
            // Update the fractal landscape with synchronized animation state
            this.fractal.updateAnimationState(animState);
        });
        
        // Set up disconnect handler
        window.addEventListener('beforeunload', () => {
            console.log('Page unloading - disconnecting from server');
            this.socket.disconnect();
        });
        
        // For offline mode when server is unavailable
        setTimeout(() => {
            if (!this.socket.connected) {
                console.log('No server connection, using offline mode');
                // Start local evolution
                setInterval(() => {
                    this.fractal.evolve(0.01);
                }, 2000);
            }
        }, 5000);
    }
    
    // Send a seed point to the server
    addSeed(seedPoint) {
        if (this.connected) {
            this.socket.emit('addSeed', seedPoint);
        }
    }
    
    // Update an option on the server
    updateOption(option) {
        if (this.connected) {
            this.socket.emit('updateOption', option);
        }
    }
    
    // Disconnect from the server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default ServerConnection;