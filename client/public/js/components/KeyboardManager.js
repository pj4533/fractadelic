// KeyboardManager class - Handles keyboard input and visual feedback
import { PALETTE_NAMES } from '../utils/constants.js';
import { showKeyFeedback } from '../utils/UIUtils.js';

class KeyboardManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.feedbackElement = null;
        this.setupEventHandlers();
    }
    
    // Setup keyboard event handlers
    setupEventHandlers() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    // Handle keyboard input
    handleKeyDown(e) {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            // Palette changes
            case 'p': // Next palette
                const currentIndex = PALETTE_NAMES.indexOf(this.uiManager.controls.palette);
                const nextIndex = (currentIndex + 1) % PALETTE_NAMES.length;
                this.uiManager.updatePalette(PALETTE_NAMES[nextIndex]);
                this.showKeyFeedback('P', `Palette: ${PALETTE_NAMES[nextIndex]}`);
                break;
        }
    }
    
    // Show visual feedback for keypresses
    showKeyFeedback(key, action) {
        this.feedbackElement = showKeyFeedback(key, action);
    }
}

export default KeyboardManager;