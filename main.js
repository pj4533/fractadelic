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
    
    // Render initial landscape
    fractal.render();
    
    // Socket.io setup for real-time collaboration
    const socket = io('https://fractadelic-server.glitch.me');
    
    // Track active users
    let activeUsers = 1;
    const activeUsersElement = document.getElementById('activeUsers');
    
    // Connect to the server
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Get initial state
        socket.emit('getState');
    });
    
    // User count updates
    socket.on('userCount', (count) => {
        activeUsers = count;
        activeUsersElement.textContent = `${activeUsers} user${activeUsers !== 1 ? 's' : ''} online`;
    });
    
    // Handle incoming state from server
    socket.on('state', (state) => {
        // Update UI controls to match
        document.getElementById('roughness').value = state.roughness;
        document.getElementById('colorPalette').value = state.palette;
        
        // Update local fractal with server state (will trigger animation)
        fractal.updateOptions({
            roughness: state.roughness,
            palette: state.palette,
            seedPoints: state.seedPoints
        });
    });
    
    // Handle incoming seed points from other users
    socket.on('newSeed', (seedPoint) => {
        fractal.addSeedPoint(seedPoint.x, seedPoint.y, seedPoint.value);
    });
    
    // Handle evolution updates from server
    socket.on('evolve', () => {
        fractal.evolve(0.01);
    });
    
    // UI control event listeners with real-time updates
    const roughnessSlider = document.getElementById('roughness');
    roughnessSlider.addEventListener('input', () => {
        const roughness = parseFloat(roughnessSlider.value);
        fractal.updateOptions({ roughness });
    });
    
    // Only send to server when done changing (for bandwidth efficiency)
    roughnessSlider.addEventListener('change', () => {
        const roughness = parseFloat(roughnessSlider.value);
        socket.emit('updateOption', { roughness });
    });
    
    const colorPalette = document.getElementById('colorPalette');
    colorPalette.addEventListener('change', () => {
        const palette = colorPalette.value;
        fractal.updateOptions({ palette });
        
        // Add some ripples for visual effect on palette change
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = Math.random();
                const y = Math.random();
                const value = 0.5 + Math.random() * 0.5;
                fractal.addRipple(x, y, value);
            }, i * 100);
        }
        
        // Send update to server
        socket.emit('updateOption', { palette });
    });
    
    const addSeedButton = document.getElementById('addSeed');
    addSeedButton.addEventListener('click', () => {
        // Change cursor to indicate seed placing mode with glow effect
        canvas.style.cursor = 'crosshair';
        canvas.classList.add('seed-mode');
        
        // Add a visual hint
        const hint = document.createElement('div');
        hint.className = 'seed-hint';
        hint.textContent = 'Click anywhere to add a seed point';
        document.body.appendChild(hint);
        
        // One-time event listener for canvas click
        const handleCanvasClick = (e) => {
            // Get click position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / canvas.width;
            const y = (e.clientY - rect.top) / canvas.height;
            
            // Create a random height value between 0.4 and 1.0
            const value = 0.4 + Math.random() * 0.6;
            
            // Add seed point locally with particle burst and ripple effect
            fractal.addSeedPoint(x, y, value);
            
            // Add extra ripples around the seed point for emphasis
            setTimeout(() => {
                fractal.addRipple(x, y, value * 0.8);
            }, 100);
            
            // Send to server
            socket.emit('addSeed', { x, y, value });
            
            // Reset cursor and remove hint
            canvas.style.cursor = 'default';
            canvas.classList.remove('seed-mode');
            document.body.removeChild(hint);
            
            // Remove this event listener
            canvas.removeEventListener('click', handleCanvasClick);
        };
        
        canvas.addEventListener('click', handleCanvasClick);
    });
    
    const evolveSpeedSlider = document.getElementById('evolveSpeed');
    evolveSpeedSlider.addEventListener('change', () => {
        // Send evolution speed to server
        socket.emit('setEvolveSpeed', parseInt(evolveSpeedSlider.value));
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        fractal.render();
    });
    
    // Disconnect handler
    window.addEventListener('beforeunload', () => {
        socket.disconnect();
    });
});