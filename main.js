import FractalLandscape from './fractal.js';
import ServerConnection from './client/public/js/components/ServerConnection.js';
import UIManager from './client/public/js/components/UIManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('fractalCanvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Initialize fractal landscape
    const fractal = new FractalLandscape(canvas, {
        roughness: 0.5,
        palette: 'cosmic'
    });
    
    // Render initial landscape
    fractal.render();
    
    // Initialize server connection and UI manager
    const serverConnection = new ServerConnection(fractal);
    const uiManager = new UIManager(fractal, serverConnection);
    
    // Setup connection reference (circular reference, but controlled)
    serverConnection.uiManager = uiManager;
    
    // Handle keyboard shortcuts (already handled by KeyboardManager in UIManager)
    
    // Handle window resize (already handled by UIManager)
    
    // Disconnect handler (already handled by ServerConnection)
});