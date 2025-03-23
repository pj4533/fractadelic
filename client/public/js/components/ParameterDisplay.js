// ParameterDisplay class - Handles updating parameter displays and UI elements
class ParameterDisplay {
    constructor() {
        // Initialize parameter display elements
        this.elements = {
            palette: document.getElementById('palette-value'),
            wave: document.getElementById('wave-value'),
            glow: document.getElementById('glow-value'),
            particles: document.getElementById('particles-value')
        };
    }
    
    // Update parameter display with highlight effect
    updateDisplay(param, value) {
        let element;
        
        switch(param) {
            case 'palette':
                element = this.elements.palette;
                break;
            case 'wave':
                element = this.elements.wave;
                break;
            case 'glow':
                element = this.elements.glow;
                break;
            case 'particles':
                element = this.elements.particles;
                break;
            default:
                return;
        }
        
        if (element) {
            // Update value
            element.textContent = value;
            
            // Add highlight effect
            const parentItem = element.parentElement;
            parentItem.classList.add('highlight');
            
            // Remove highlight after animation
            setTimeout(() => {
                parentItem.classList.remove('highlight');
            }, 500);
        }
    }
    
    // Setup click handlers for parameter elements
    setupClickHandlers(uiManager) {
        // Get all parameter items
        const paramItems = document.querySelectorAll('.param-item');
        
        paramItems.forEach(item => {
            item.addEventListener('click', () => {
                const key = item.getAttribute('data-key');
                
                switch(key) {
                    case 'p':
                        // Cycle through palettes
                        const palettes = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];
                        const currentIndex = palettes.indexOf(uiManager.controls.palette);
                        const nextIndex = (currentIndex + 1) % palettes.length;
                        uiManager.updatePalette(palettes[nextIndex]);
                        uiManager.keyboardManager.showKeyFeedback('P', `Palette: ${palettes[nextIndex]}`);
                        break;
                        
                    case '←/→':
                        // Increase wave flow
                        uiManager.updateWaveIntensity(0.05);
                        uiManager.keyboardManager.showKeyFeedback('→', 'Increase wave flow');
                        break;
                        
                    case '↑/↓':
                        // Increase glow intensity
                        uiManager.updateGlowIntensity(0.05);
                        uiManager.keyboardManager.showKeyFeedback('↑', 'Increase glow intensity');
                        break;
                        
                    case '+/-':
                        // Increase particle density
                        uiManager.updateParticleDensity(0.05);
                        uiManager.keyboardManager.showKeyFeedback('+', 'Increase particle density');
                        break;
                }
            });
            
            // Add right-click handler for decreasing values
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent context menu
                
                const key = item.getAttribute('data-key');
                
                switch(key) {
                    case '←/→':
                        // Decrease wave flow
                        uiManager.updateWaveIntensity(-0.05);
                        uiManager.keyboardManager.showKeyFeedback('←', 'Decrease wave flow');
                        break;
                        
                    case '↑/↓':
                        // Decrease glow intensity
                        uiManager.updateGlowIntensity(-0.05);
                        uiManager.keyboardManager.showKeyFeedback('↓', 'Decrease glow intensity');
                        break;
                        
                    case '+/-':
                        // Decrease particle density
                        uiManager.updateParticleDensity(-0.05);
                        uiManager.keyboardManager.showKeyFeedback('-', 'Decrease particle density');
                        break;
                }
            });
        });
    }
    
    // Update all parameter displays with current values
    updateAllDisplays(controls) {
        this.updateDisplay('palette', controls.palette);
        this.updateDisplay('wave', controls.waveIntensity.toFixed(2));
        this.updateDisplay('glow', controls.glowIntensity.toFixed(2));
        this.updateDisplay('particles', controls.particleDensity.toFixed(2));
    }
}

export default ParameterDisplay;