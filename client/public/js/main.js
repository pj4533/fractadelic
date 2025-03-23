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
    
    // Server status element
    const serverStatusElement = document.getElementById('server-status');
    
    // Socket.io setup for real-time collaboration
    // Socket.io will automatically connect to the server that served the page
    const socket = io();
    
    // Track active users
    let activeUsers = 1;
    const activeUsersElement = document.getElementById('activeUsers');
    
    // Controls state
    const controls = {
        palette: 'cosmic',
        waveIntensity: 0.5,
        glowIntensity: 0.5,
        particleDensity: 0.5,
        // Throttle control to prevent spamming the server
        lastUpdate: {
            palette: 0,
            waveIntensity: 0,
            glowIntensity: 0,
            particleDensity: 0
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
            particles: document.getElementById('particles-value'),
            roughness: null,  // These are older parameters that might not exist in the UI
            evolution: null,
            seeds: null
        }
    };
    
    // Connect to the server
    socket.on('connect', () => {
        console.log(`Connected to server [id: ${socket.id}]`);
        serverStatusElement.textContent = 'Server status: Connected';
        serverStatusElement.className = 'server-status connected';
        
        // Get initial state
        console.log('Sending getState request to server');
        socket.emit('getState');
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
        console.log('Disconnected from server - reason:', socket.disconnected ? 'client disconnect' : 'server disconnect');
        serverStatusElement.textContent = 'Server status: Disconnected';
        serverStatusElement.className = 'server-status disconnected';
    });
    
    // Reconnection attempt
    socket.on('reconnecting', (attemptNumber) => {
        console.log(`Attempting to reconnect to server (attempt ${attemptNumber})`);
        serverStatusElement.textContent = 'Server status: Reconnecting...';
        serverStatusElement.className = 'server-status';
    });
    
    // User count updates
    socket.on('userCount', (count) => {
        console.log(`Received userCount update: ${count} users online`);
        activeUsers = count;
        activeUsersElement.textContent = `${activeUsers} user${activeUsers !== 1 ? 's' : ''} online`;
    });
    
    // Handle incoming state from server
    socket.on('state', (state) => {
        console.log(`Received state update:`, state);
        
        // Extract and default missing values for backward compatibility
        const options = {
            palette: state.palette,
            seedPoints: state.seedPoints,
            waveIntensity: state.waveIntensity ?? controls.waveIntensity,
            glowIntensity: state.glowIntensity ?? controls.glowIntensity,
            particleDensity: state.particleDensity ?? controls.particleDensity
        };
        
        // Update local fractal with server state (will trigger animation)
        fractal.updateOptions(options);
        
        // Update control state
        controls.palette = options.palette;
        controls.waveIntensity = options.waveIntensity;
        controls.glowIntensity = options.glowIntensity;
        controls.particleDensity = options.particleDensity;
        
        // Update parameter display
        updateParameterDisplay('palette', options.palette);
        updateParameterDisplay('wave', options.waveIntensity.toFixed(2));
        updateParameterDisplay('glow', options.glowIntensity.toFixed(2));
        updateParameterDisplay('particles', options.particleDensity.toFixed(2));
        
        console.log(`Applied state update to fractal with new visual parameters`);
    });
    
    // Handle incoming seed points from other users
    socket.on('newSeed', (seedPoint) => {
        console.log(`Received new seed point from another user:`, seedPoint);
        fractal.addSeedPoint(seedPoint.x, seedPoint.y, seedPoint.value);
        controls.seedCount++;
        updateParameterDisplay('seeds', controls.seedCount);
    });
    
    // Handle evolution updates from server
    socket.on('evolve', () => {
        console.log('Received evolution trigger from server');
        fractal.evolve(0.01);
    });
    
    // Show visual feedback for keypresses
    function showKeyFeedback(key, action) {
        // Remove existing feedback if present
        if (controls.feedbackElement) {
            document.body.removeChild(controls.feedbackElement);
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'key-feedback';
        feedback.innerHTML = `<span class="key">${key}</span> ${action}`;
        document.body.appendChild(feedback);
        
        // Store reference and set timeout to remove
        controls.feedbackElement = feedback;
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
                if (controls.feedbackElement === feedback) {
                    controls.feedbackElement = null;
                }
            }
        }, 1500);
    }
    
    // Function to update parameter display with highlight effect
    function updateParameterDisplay(param, value) {
        let element;
        
        switch(param) {
            case 'roughness':
                element = controls.elements.roughness;
                break;
            case 'palette':
                element = controls.elements.palette;
                break;
            case 'evolution':
                element = controls.elements.evolution;
                break;
            case 'seeds':
                element = controls.elements.seeds;
                break;
            case 'wave':
                element = controls.elements.wave;
                break;
            case 'glow':
                element = controls.elements.glow;
                break;
            case 'particles':
                element = controls.elements.particles;
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
    function addRandomSeed(intensity = 0.6) {
        const now = Date.now();
        if (now - controls.lastUpdate.seed < controls.throttleTime) return;
        controls.lastUpdate.seed = now;
        
        // Create random position
        const x = Math.random();
        const y = Math.random();
        const value = 0.4 + Math.random() * intensity;
        
        // Add seed point locally
        fractal.addSeedPoint(x, y, value);
        
        // Add ripple effect
        setTimeout(() => {
            fractal.addRipple(x, y, value * 0.8);
        }, 100);
        
        // Increment seed count and update display
        controls.seedCount++;
        updateParameterDisplay('seeds', controls.seedCount);
        
        // Send to server
        console.log(`Sending new seed point to server: x=${x.toFixed(2)}, y=${y.toFixed(2)}, value=${value.toFixed(2)}`);
        socket.emit('addSeed', { x, y, value });
    }
    
    // Add a ripple effect
    function addRipple(intensity = 0.6) {
        const x = Math.random();
        const y = Math.random();
        const value = 0.4 + Math.random() * intensity;
        
        fractal.addRipple(x, y, value);
    }
    
    // Add multiple ripples in a pattern
    function addRipplePattern(pattern = 'circle', count = 5) {
        const centerX = Math.random();
        const centerY = Math.random();
        
        for (let i = 0; i < count; i++) {
            let x, y;
            
            if (pattern === 'circle') {
                const angle = (i / count) * Math.PI * 2;
                const distance = 0.1 + Math.random() * 0.1;
                x = centerX + Math.cos(angle) * distance;
                y = centerY + Math.sin(angle) * distance;
            } else if (pattern === 'line') {
                const angle = Math.random() * Math.PI * 2;
                const distance = (i / count) * 0.3;
                x = centerX + Math.cos(angle) * distance;
                y = centerY + Math.sin(angle) * distance;
            } else {
                x = Math.random();
                y = Math.random();
            }
            
            // Keep within bounds
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            const value = 0.4 + Math.random() * 0.6;
            setTimeout(() => {
                fractal.addRipple(x, y, value);
            }, i * 80);
        }
    }
    
    // Update wave intensity
    function updateWaveIntensity(delta) {
        const now = Date.now();
        if (now - controls.lastUpdate.waveIntensity < controls.throttleTime) return;
        
        // Update with constraints
        controls.waveIntensity = Math.max(0.1, Math.min(1.0, controls.waveIntensity + delta));
        controls.lastUpdate.waveIntensity = now;
        
        // Update locally
        fractal.updateOptions({ waveIntensity: controls.waveIntensity });
        
        // Update parameter display
        updateParameterDisplay('wave', controls.waveIntensity.toFixed(2));
        
        // Send to server
        console.log(`Sending wave intensity update to server: ${controls.waveIntensity}`);
        socket.emit('updateOption', { waveIntensity: controls.waveIntensity });
    }
    
    // Update glow intensity
    function updateGlowIntensity(delta) {
        const now = Date.now();
        if (now - controls.lastUpdate.glowIntensity < controls.throttleTime) return;
        
        // Update with constraints
        controls.glowIntensity = Math.max(0.1, Math.min(1.0, controls.glowIntensity + delta));
        controls.lastUpdate.glowIntensity = now;
        
        // Update locally
        fractal.updateOptions({ glowIntensity: controls.glowIntensity });
        
        // Update parameter display
        updateParameterDisplay('glow', controls.glowIntensity.toFixed(2));
        
        // Send to server
        console.log(`Sending glow intensity update to server: ${controls.glowIntensity}`);
        socket.emit('updateOption', { glowIntensity: controls.glowIntensity });
    }
    
    // Update particle density
    function updateParticleDensity(delta) {
        const now = Date.now();
        if (now - controls.lastUpdate.particleDensity < controls.throttleTime) return;
        
        // Update with constraints
        controls.particleDensity = Math.max(0.1, Math.min(1.0, controls.particleDensity + delta));
        controls.lastUpdate.particleDensity = now;
        
        // Update locally
        fractal.updateOptions({ particleDensity: controls.particleDensity });
        
        // Update parameter display
        updateParameterDisplay('particles', controls.particleDensity.toFixed(2));
        
        // Send to server
        console.log(`Sending particle density update to server: ${controls.particleDensity}`);
        socket.emit('updateOption', { particleDensity: controls.particleDensity });
    }
    
    // Update palette
    function updatePalette(paletteName) {
        const now = Date.now();
        if (now - controls.lastUpdate.palette < controls.throttleTime) return;
        controls.lastUpdate.palette = now;
        
        // Update locally
        fractal.updateOptions({ palette: paletteName });
        controls.palette = paletteName;
        
        // Update parameter display
        updateParameterDisplay('palette', paletteName);
        
        // Add some ripples for visual effect on palette change
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = Math.random();
                const y = Math.random();
                const value = 0.5 + Math.random() * 0.5;
                fractal.addRipple(x, y, value);
            }, i * 100);
        }
        
        // Send to server
        console.log(`Sending palette update to server: ${paletteName}`);
        socket.emit('updateOption', { palette: paletteName });
    }
    
    // Add subtle evolution effect
    function triggerSubtleEvolution() {
        fractal.evolve(0.005); // Very subtle local evolution
    }
    
    // Initialize parameter displays
    function initializeDisplays() {
        updateParameterDisplay('palette', controls.palette);
        updateParameterDisplay('wave', controls.waveIntensity.toFixed(2));
        updateParameterDisplay('glow', controls.glowIntensity.toFixed(2));
        updateParameterDisplay('particles', controls.particleDensity.toFixed(2));
    }
    
    // Call initialization
    initializeDisplays();
    
    // Add keyboard controls
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            // Wave flow controls (Left/Right arrows)
            case 'ArrowRight':
                updateWaveIntensity(0.05);
                showKeyFeedback('→', 'Increase wave flow');
                break;
            case 'ArrowLeft':
                updateWaveIntensity(-0.05);
                showKeyFeedback('←', 'Decrease wave flow');
                break;
                
            // Glow intensity controls (Up/Down arrows)
            case 'ArrowUp':
                updateGlowIntensity(0.05);
                showKeyFeedback('↑', 'Increase glow intensity');
                break;
            case 'ArrowDown':
                updateGlowIntensity(-0.05);
                showKeyFeedback('↓', 'Decrease glow intensity');
                break;
                
            // Particle density controls (+/-)
            case '+':
            case '=': // = key is + without shift
                updateParticleDensity(0.05);
                showKeyFeedback('+', 'Increase particle density');
                break;
            case '-':
                updateParticleDensity(-0.05);
                showKeyFeedback('-', 'Decrease particle density');
                break;
                
            // Seed points with different intensities
            case ' ': // Space
                addRandomSeed(0.6);
                showKeyFeedback('Space', 'Add random seed point');
                break;
            case '1':
                addRandomSeed(0.3);
                showKeyFeedback('1', 'Add small seed point');
                break;
            case '2':
                addRandomSeed(0.6);
                showKeyFeedback('2', 'Add medium seed point');
                break;
            case '3':
                addRandomSeed(0.9);
                showKeyFeedback('3', 'Add large seed point');
                break;
                
            // Visual effects
            case 'r': // Ripple
                addRipple();
                showKeyFeedback('R', 'Add ripple effect');
                break;
            case 'c': // Circle pattern
                addRipplePattern('circle');
                showKeyFeedback('C', 'Add circle ripple pattern');
                break;
            case 'l': // Line pattern
                addRipplePattern('line');
                showKeyFeedback('L', 'Add line ripple pattern');
                break;
            case 'e': // Evolve
                triggerSubtleEvolution();
                showKeyFeedback('E', 'Subtle evolution');
                break;
                
            // Palette changes
            case 'p': // Next palette
                const palettes = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];
                const currentIndex = palettes.indexOf(controls.palette);
                const nextIndex = (currentIndex + 1) % palettes.length;
                updatePalette(palettes[nextIndex]);
                showKeyFeedback('P', `Palette: ${palettes[nextIndex]}`);
                break;
                
            // No default case needed
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    });
    
    // Disconnect handler
    window.addEventListener('beforeunload', () => {
        console.log('Page unloading - disconnecting from server');
        socket.disconnect();
    });

    // For offline mode when server is unavailable
    setTimeout(() => {
        if (!socket.connected) {
            console.log('No server connection, using offline mode');
            // Start local evolution
            setInterval(() => {
                fractal.evolve(0.01);
            }, 2000);
        }
    }, 5000);
    
    // Setup controls toggle
    const controlToggle = document.getElementById('control-toggle');
    const keyboardHelp = document.createElement('div');
    keyboardHelp.className = 'keyboard-help';
    keyboardHelp.innerHTML = `
        <h3>Keyboard Controls</h3>
        <ul>
            <li><strong>←/→</strong> - Decrease/increase wave flow</li>
            <li><strong>↑/↓</strong> - Increase/decrease glow intensity</li>
            <li><strong>+/-</strong> - Increase/decrease particle density</li>
            <li><strong>P</strong> - Change color palette</li>
            <li><strong>Space</strong> - Add random seed point</li>
            <li><strong>1/2/3</strong> - Add small/medium/large seed points</li>
            <li><strong>R</strong> - Add ripple effect</li>
            <li><strong>C</strong> - Add circle ripple pattern</li>
            <li><strong>L</strong> - Add line ripple pattern</li>
            <li><strong>E</strong> - Subtle evolution</li>
        </ul>
    `;
    
    // Add keyboard help as hidden initially
    keyboardHelp.style.display = 'none';
    document.body.appendChild(keyboardHelp);
    
    // Toggle keyboard help visibility
    let helpVisible = false;
    controlToggle.addEventListener('click', () => {
        helpVisible = !helpVisible;
        keyboardHelp.style.display = helpVisible ? 'block' : 'none';
        
        // Animate the control button
        controlToggle.classList.add('active');
        setTimeout(() => {
            controlToggle.classList.remove('active');
        }, 300);
    });
    
});