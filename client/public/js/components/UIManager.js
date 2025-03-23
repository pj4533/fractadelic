import KeyboardManager from './KeyboardManager.js';
import ParameterDisplay from './ParameterDisplay.js';
import { ANIMATION } from '../utils/constants.js';
import { updateCanvasDimensions } from '../utils/UIUtils.js';

// UIManager class - Handles UI interaction and parameter management
class UIManager {
    constructor(fractal, serverConnection) {
        this.fractal = fractal;
        this.serverConnection = serverConnection;
        
        // Controls state
        this.controls = {
            palette: 'cosmic',
            // Throttle control to prevent spamming the server
            lastUpdate: {
                palette: 0,
                seed: 0
            },
            // Minimum time between updates (milliseconds)
            throttleTime: ANIMATION.throttleTime
        };
        
        // Initialize sub-components
        this.parameterDisplay = new ParameterDisplay();
        this.keyboardManager = new KeyboardManager(this);
        
        // Initialize displays and setup event handlers
        this.initializeDisplays();
        this.setupEventHandlers();
    }
    
    // Initialize parameter displays
    initializeDisplays() {
        this.parameterDisplay.updateAllDisplays(this.controls);
        this.parameterDisplay.setupClickHandlers(this);
    }
    
    // Setup window event handlers
    setupEventHandlers() {
        // Add resize handler for canvas
        window.addEventListener('resize', () => {
            updateCanvasDimensions(this.fractal.canvas);
        });
    }
    
    // Add a random seed point
    addRandomSeed(intensity = 0.6) {
        const now = Date.now();
        if (now - this.controls.lastUpdate.seed < this.controls.throttleTime) return;
        this.controls.lastUpdate.seed = now;
        
        // Create random position
        const x = Math.random();
        const y = Math.random();
        const value = 0.4 + Math.random() * intensity;
        
        // Add seed point locally
        this.fractal.addSeedPoint(x, y, value);
        
        // Send to server
        console.log(`Sending new seed point to server: x=${x.toFixed(2)}, y=${y.toFixed(2)}, value=${value.toFixed(2)}`);
        this.serverConnection.addSeed({ x, y, value });
    }
    
    
    // Update palette
    updatePalette(paletteName) {
        const now = Date.now();
        if (now - this.controls.lastUpdate.palette < this.controls.throttleTime) return;
        this.controls.lastUpdate.palette = now;
        
        // Update locally
        this.fractal.updateOptions({ palette: paletteName });
        this.controls.palette = paletteName;
        
        // Update parameter display
        this.parameterDisplay.updateDisplay('palette', paletteName);
        
        // Send to server
        console.log(`Sending palette update to server: ${paletteName}`);
        this.serverConnection.updateOption({ palette: paletteName });
    }
    
    // Update UI controls with server state
    updateFromServerState(state) {
        // Extract and default missing values for backward compatibility
        const options = {
            palette: state.palette || this.controls.palette
        };
        
        // Update local control state
        this.controls.palette = options.palette;
        
        // Update parameter display
        this.parameterDisplay.updateAllDisplays(this.controls);
    }
}

export default UIManager;