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
        roughness: 0.5,
        palette: 'cosmic',
        evolveSpeed: 5,
        seedCount: 0,
        // Throttle control to prevent spamming the server
        lastUpdate: {
            roughness: 0,
            palette: 0,
            seed: 0,
            evolveSpeed: 0
        },
        // Minimum time between updates (milliseconds)
        throttleTime: 250,
        // Visual feedback element
        feedbackElement: null,
        // Parameter display elements
        elements: {
            roughness: document.getElementById('roughness-value'),
            palette: document.getElementById('palette-value'),
            evolution: document.getElementById('evolution-value'),
            seeds: document.getElementById('seeds-value')
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
        
        // Update local fractal with server state (will trigger animation)
        fractal.updateOptions({
            roughness: state.roughness,
            palette: state.palette,
            seedPoints: state.seedPoints
        });
        
        // Update control state
        controls.roughness = state.roughness;
        controls.palette = state.palette;
        controls.seedCount = state.seedPoints.length;
        
        // Update parameter display
        updateParameterDisplay('roughness', state.roughness.toFixed(2));
        updateParameterDisplay('palette', state.palette);
        updateParameterDisplay('seeds', state.seedPoints.length);
        
        console.log(`Applied state update to fractal: roughness=${state.roughness}, palette=${state.palette}, seedPoints=${state.seedPoints.length}`);
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
    
    // Update roughness with throttling
    function updateRoughness(delta) {
        const now = Date.now();
        if (now - controls.lastUpdate.roughness < controls.throttleTime) return;
        
        // Update roughness with constraints
        controls.roughness = Math.max(0.1, Math.min(0.9, controls.roughness + delta));
        controls.lastUpdate.roughness = now;
        
        // Update locally
        fractal.updateOptions({ roughness: controls.roughness });
        
        // Update parameter display
        updateParameterDisplay('roughness', controls.roughness.toFixed(2));
        
        // Send to server
        console.log(`Sending roughness update to server: ${controls.roughness}`);
        socket.emit('updateOption', { roughness: controls.roughness });
    }
    
    // Update evolution speed with throttling
    function updateEvolveSpeed(delta) {
        const now = Date.now();
        if (now - controls.lastUpdate.evolveSpeed < controls.throttleTime) return;
        
        // Update speed with constraints
        controls.evolveSpeed = Math.max(1, Math.min(10, controls.evolveSpeed + delta));
        controls.lastUpdate.evolveSpeed = now;
        
        // Update parameter display
        updateParameterDisplay('evolution', controls.evolveSpeed);
        
        // Send to server
        console.log(`Sending evolution speed update to server: ${controls.evolveSpeed}`);
        socket.emit('setEvolveSpeed', controls.evolveSpeed);
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
        updateParameterDisplay('roughness', controls.roughness.toFixed(2));
        updateParameterDisplay('palette', controls.palette);
        updateParameterDisplay('evolution', controls.evolveSpeed);
        updateParameterDisplay('seeds', controls.seedCount);
    }
    
    // Call initialization
    initializeDisplays();
    
    // Add keyboard controls
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            // Roughness controls
            case 'ArrowUp':
                updateRoughness(0.02);
                showKeyFeedback('↑', 'Increase roughness');
                break;
            case 'ArrowDown':
                updateRoughness(-0.02);
                showKeyFeedback('↓', 'Decrease roughness');
                break;
                
            // Evolution speed
            case '+':
            case '=':
                updateEvolveSpeed(1);
                showKeyFeedback('+', 'Increase evolution speed');
                break;
            case '-':
                updateEvolveSpeed(-1);
                showKeyFeedback('-', 'Decrease evolution speed');
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
    
    // Add control help message
    const keyboardHelp = document.createElement('div');
    keyboardHelp.className = 'keyboard-help';
    keyboardHelp.innerHTML = `
        <h3>Keyboard Controls</h3>
        <ul>
            <li><strong>↑/↓</strong> - Adjust roughness</li>
            <li><strong>+/-</strong> - Adjust evolution speed</li>
            <li><strong>Space</strong> - Add random seed point</li>
            <li><strong>1/2/3</strong> - Add small/medium/large seed points</li>
            <li><strong>P</strong> - Change color palette</li>
            <li><strong>R</strong> - Add ripple effect</li>
            <li><strong>C</strong> - Add circle ripple pattern</li>
            <li><strong>L</strong> - Add line ripple pattern</li>
            <li><strong>E</strong> - Subtle evolution</li>
        </ul>
    `;
    document.body.appendChild(keyboardHelp);
    
});