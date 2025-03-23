// Import components
import { FractalLandscape } from './components/FractalLandscape.js';
import UIManager from './components/UIManager.js';
import ServerConnection from './components/ServerConnection.js';
import { updateCanvasDimensions } from './utils/UIUtils.js';
import { DEFAULT_OPTIONS } from './utils/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('fractalCanvas');
    updateCanvasDimensions(canvas);
    
    // Initialize fractal landscape with vibrant cosmic theme
    const fractal = new FractalLandscape(canvas, {
        palette: DEFAULT_OPTIONS.palette
    });
    
    // Create instance of ServerConnection first with a temp reference to fractal
    const serverConnection = new ServerConnection(fractal);
    
    // Create UI Manager and give it references to the fractal and server connection
    const uiManager = new UIManager(fractal, serverConnection);
    
    // Update server connection with the UI manager reference
    serverConnection.uiManager = uiManager;
});