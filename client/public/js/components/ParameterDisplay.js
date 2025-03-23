// ParameterDisplay class - Handles updating parameter displays and UI elements
class ParameterDisplay {
    constructor() {
        // Initialize parameter display elements
        this.elements = {
            palette: document.getElementById('palette-value')
        };
    }
    
    // Update parameter display with highlight effect
    updateDisplay(param, value) {
        let element;
        
        switch(param) {
            case 'palette':
                element = this.elements.palette;
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
                }
            });
            
            // Add right-click handler for context menu
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent context menu
            });
        });
    }
    
    // Update all parameter displays with current values
    updateAllDisplays(controls) {
        this.updateDisplay('palette', controls.palette);
    }
}

export default ParameterDisplay;