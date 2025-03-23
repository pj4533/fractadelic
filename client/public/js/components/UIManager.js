// UIManager class - Handles UI interaction and keyboard controls
class UIManager {
    constructor(fractal, serverConnection) {
        this.fractal = fractal;
        this.serverConnection = serverConnection;
        
        // Controls state
        this.controls = {
            palette: 'cosmic',
            waveIntensity: 0.5,
            glowIntensity: 0.5,
            particleDensity: 0.5,
            // Throttle control to prevent spamming the server
            lastUpdate: {
                palette: 0,
                waveIntensity: 0,
                glowIntensity: 0,
                particleDensity: 0,
                seed: 0
            },
            // Minimum time between updates (milliseconds)
            throttleTime: 200,
            // Visual feedback element
            feedbackElement: null,
            // Parameter display elements
            elements: {
                palette: document.getElementById('palette-value'),
                wave: document.getElementById('wave-value'),
                glow: document.getElementById('glow-value'),
                particles: document.getElementById('particles-value')
            }
        };
        
        // Initialize displays and setup event handlers
        this.initializeDisplays();
        this.setupEventHandlers();
    }
    
    // Initialize parameter displays
    initializeDisplays() {
        this.updateParameterDisplay('palette', this.controls.palette);
        this.updateParameterDisplay('wave', this.controls.waveIntensity.toFixed(2));
        this.updateParameterDisplay('glow', this.controls.glowIntensity.toFixed(2));
        this.updateParameterDisplay('particles', this.controls.particleDensity.toFixed(2));
        
        // Add click handlers for parameters
        this.setupParameterClickHandlers();
    }
    
    // Setup keyboard and UI event handlers
    setupEventHandlers() {
        // Add keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Add resize handler
        window.addEventListener('resize', () => {
            const canvas = this.fractal.canvas;
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        });
    }
    
    // Handle keyboard input
    handleKeyDown(e) {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            // Wave flow controls (Left/Right arrows)
            case 'ArrowRight':
                this.updateWaveIntensity(0.05);
                this.showKeyFeedback('→', 'Increase wave flow');
                break;
            case 'ArrowLeft':
                this.updateWaveIntensity(-0.05);
                this.showKeyFeedback('←', 'Decrease wave flow');
                break;
                
            // Glow intensity controls (Up/Down arrows)
            case 'ArrowUp':
                this.updateGlowIntensity(0.05);
                this.showKeyFeedback('↑', 'Increase glow intensity');
                break;
            case 'ArrowDown':
                this.updateGlowIntensity(-0.05);
                this.showKeyFeedback('↓', 'Decrease glow intensity');
                break;
                
            // Particle density controls (+/-)
            case '+':
            case '=': // = key is + without shift
                this.updateParticleDensity(0.05);
                this.showKeyFeedback('+', 'Increase particle density');
                break;
            case '-':
                this.updateParticleDensity(-0.05);
                this.showKeyFeedback('-', 'Decrease particle density');
                break;
                
            // Palette changes
            case 'p': // Next palette
                const palettes = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];
                const currentIndex = palettes.indexOf(this.controls.palette);
                const nextIndex = (currentIndex + 1) % palettes.length;
                this.updatePalette(palettes[nextIndex]);
                this.showKeyFeedback('P', `Palette: ${palettes[nextIndex]}`);
                break;
        }
    }
    
    // Setup click handlers for parameter elements
    setupParameterClickHandlers() {
        // Get all parameter items
        const paramItems = document.querySelectorAll('.param-item');
        
        paramItems.forEach(item => {
            item.addEventListener('click', () => {
                const key = item.getAttribute('data-key');
                
                switch(key) {
                    case 'p':
                        // Cycle through palettes
                        const palettes = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];
                        const currentIndex = palettes.indexOf(this.controls.palette);
                        const nextIndex = (currentIndex + 1) % palettes.length;
                        this.updatePalette(palettes[nextIndex]);
                        this.showKeyFeedback('P', `Palette: ${palettes[nextIndex]}`);
                        break;
                        
                    case '←/→':
                        // Increase wave flow
                        this.updateWaveIntensity(0.05);
                        this.showKeyFeedback('→', 'Increase wave flow');
                        break;
                        
                    case '↑/↓':
                        // Increase glow intensity
                        this.updateGlowIntensity(0.05);
                        this.showKeyFeedback('↑', 'Increase glow intensity');
                        break;
                        
                    case '+/-':
                        // Increase particle density
                        this.updateParticleDensity(0.05);
                        this.showKeyFeedback('+', 'Increase particle density');
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
                        this.updateWaveIntensity(-0.05);
                        this.showKeyFeedback('←', 'Decrease wave flow');
                        break;
                        
                    case '↑/↓':
                        // Decrease glow intensity
                        this.updateGlowIntensity(-0.05);
                        this.showKeyFeedback('↓', 'Decrease glow intensity');
                        break;
                        
                    case '+/-':
                        // Decrease particle density
                        this.updateParticleDensity(-0.05);
                        this.showKeyFeedback('-', 'Decrease particle density');
                        break;
                }
            });
        });
    }
    
    // Show visual feedback for keypresses
    showKeyFeedback(key, action) {
        // Remove existing feedback if present
        if (this.controls.feedbackElement) {
            document.body.removeChild(this.controls.feedbackElement);
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'key-feedback';
        feedback.innerHTML = `<span class="key">${key}</span> ${action}`;
        document.body.appendChild(feedback);
        
        // Store reference and set timeout to remove
        this.controls.feedbackElement = feedback;
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
                if (this.controls.feedbackElement === feedback) {
                    this.controls.feedbackElement = null;
                }
            }
        }, 1500);
    }
    
    // Update parameter display with highlight effect
    updateParameterDisplay(param, value) {
        let element;
        
        switch(param) {
            case 'palette':
                element = this.controls.elements.palette;
                break;
            case 'wave':
                element = this.controls.elements.wave;
                break;
            case 'glow':
                element = this.controls.elements.glow;
                break;
            case 'particles':
                element = this.controls.elements.particles;
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
    
    // Update wave intensity
    updateWaveIntensity(delta) {
        const now = Date.now();
        if (now - this.controls.lastUpdate.waveIntensity < this.controls.throttleTime) return;
        
        // Update with constraints
        this.controls.waveIntensity = Math.max(0.1, Math.min(1.0, this.controls.waveIntensity + delta));
        this.controls.lastUpdate.waveIntensity = now;
        
        // Update locally
        this.fractal.updateOptions({ waveIntensity: this.controls.waveIntensity });
        
        // Update parameter display
        this.updateParameterDisplay('wave', this.controls.waveIntensity.toFixed(2));
        
        // Send to server
        console.log(`Sending wave intensity update to server: ${this.controls.waveIntensity}`);
        this.serverConnection.updateOption({ waveIntensity: this.controls.waveIntensity });
    }
    
    // Update glow intensity
    updateGlowIntensity(delta) {
        const now = Date.now();
        if (now - this.controls.lastUpdate.glowIntensity < this.controls.throttleTime) return;
        
        // Update with constraints
        this.controls.glowIntensity = Math.max(0.1, Math.min(1.0, this.controls.glowIntensity + delta));
        this.controls.lastUpdate.glowIntensity = now;
        
        // Update locally
        this.fractal.updateOptions({ glowIntensity: this.controls.glowIntensity });
        
        // Update parameter display
        this.updateParameterDisplay('glow', this.controls.glowIntensity.toFixed(2));
        
        // Send to server
        console.log(`Sending glow intensity update to server: ${this.controls.glowIntensity}`);
        this.serverConnection.updateOption({ glowIntensity: this.controls.glowIntensity });
    }
    
    // Update particle density
    updateParticleDensity(delta) {
        const now = Date.now();
        if (now - this.controls.lastUpdate.particleDensity < this.controls.throttleTime) return;
        
        // Update with constraints
        this.controls.particleDensity = Math.max(0.1, Math.min(1.0, this.controls.particleDensity + delta));
        this.controls.lastUpdate.particleDensity = now;
        
        // Update locally
        this.fractal.updateOptions({ particleDensity: this.controls.particleDensity });
        
        // Update parameter display
        this.updateParameterDisplay('particles', this.controls.particleDensity.toFixed(2));
        
        // Send to server
        console.log(`Sending particle density update to server: ${this.controls.particleDensity}`);
        this.serverConnection.updateOption({ particleDensity: this.controls.particleDensity });
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
        this.updateParameterDisplay('palette', paletteName);
        
        // Send to server
        console.log(`Sending palette update to server: ${paletteName}`);
        this.serverConnection.updateOption({ palette: paletteName });
    }
    
    // Update UI controls with server state
    updateFromServerState(state) {
        // Extract and default missing values for backward compatibility
        const options = {
            palette: state.palette || this.controls.palette,
            waveIntensity: state.waveIntensity ?? this.controls.waveIntensity,
            glowIntensity: state.glowIntensity ?? this.controls.glowIntensity,
            particleDensity: state.particleDensity ?? this.controls.particleDensity
        };
        
        // Update local control state
        this.controls.palette = options.palette;
        this.controls.waveIntensity = options.waveIntensity;
        this.controls.glowIntensity = options.glowIntensity;
        this.controls.particleDensity = options.particleDensity;
        
        // Update parameter display
        this.updateParameterDisplay('palette', options.palette);
        this.updateParameterDisplay('wave', options.waveIntensity.toFixed(2));
        this.updateParameterDisplay('glow', options.glowIntensity.toFixed(2));
        this.updateParameterDisplay('particles', options.particleDensity.toFixed(2));
    }
}

export default UIManager;