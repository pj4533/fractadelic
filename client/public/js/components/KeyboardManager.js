// KeyboardManager class - Handles keyboard input and visual feedback
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
                const palettes = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];
                const currentIndex = palettes.indexOf(this.uiManager.controls.palette);
                const nextIndex = (currentIndex + 1) % palettes.length;
                this.uiManager.updatePalette(palettes[nextIndex]);
                this.showKeyFeedback('P', `Palette: ${palettes[nextIndex]}`);
                break;
        }
    }
    
    // Show visual feedback for keypresses
    showKeyFeedback(key, action) {
        // Remove existing feedback if present
        if (this.feedbackElement) {
            document.body.removeChild(this.feedbackElement);
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'key-feedback';
        feedback.innerHTML = `<span class="key">${key}</span> ${action}`;
        document.body.appendChild(feedback);
        
        // Store reference and set timeout to remove
        this.feedbackElement = feedback;
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
                if (this.feedbackElement === feedback) {
                    this.feedbackElement = null;
                }
            }
        }, 1500);
    }
}

export default KeyboardManager;