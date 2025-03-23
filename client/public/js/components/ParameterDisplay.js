// ParameterDisplay class - Handles updating parameter displays and UI elements
import { PALETTE_NAMES } from '../utils/constants.js';
import { updateStatusElement } from '../utils/UIUtils.js';

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
            updateStatusElement(element, value);
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
                        const currentIndex = PALETTE_NAMES.indexOf(uiManager.controls.palette);
                        const nextIndex = (currentIndex + 1) % PALETTE_NAMES.length;
                        uiManager.updatePalette(PALETTE_NAMES[nextIndex]);
                        uiManager.keyboardManager.showKeyFeedback('P', `Palette: ${PALETTE_NAMES[nextIndex]}`);
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