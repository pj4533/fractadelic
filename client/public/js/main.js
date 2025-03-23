// Import components
import { FractalLandscape } from './components/FractalLandscape.js';
import UIManager from './components/UIManager.js';
import ServerConnection from './components/ServerConnection.js';

document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('fractalCanvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Initialize fractal landscape with vibrant cosmic theme
    const fractal = new FractalLandscape(canvas, {
        roughness: 0.5,
        palette: 'cosmic'
    });
    
    // Create instance of ServerConnection first with a temp reference to fractal
    const serverConnection = new ServerConnection(fractal);
    
    // Create UI Manager and give it references to the fractal and server connection
    const uiManager = new UIManager(fractal, serverConnection);
    
    // Update server connection with the UI manager reference
    serverConnection.uiManager = uiManager;
});