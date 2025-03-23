document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('fractalCanvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Initialize fractal landscape
    const fractal = new FractalLandscape(canvas, {
        roughness: 0.5,
        palette: 'earth'
    });
    
    // Render initial landscape
    fractal.render();
    
    // Server status element
    const serverStatusElement = document.getElementById('server-status');
    
    // Socket.io setup for real-time collaboration
    // Socket.io will automatically connect to the server that served the page
    const socket = io();
    
    // Track active users
    let activeUsers = 1;
    const activeUsersElement = document.getElementById('activeUsers');
    
    // Connect to the server
    socket.on('connect', () => {
        console.log('Connected to server');
        serverStatusElement.textContent = 'Server status: Connected';
        serverStatusElement.className = 'server-status connected';
        
        // Get initial state
        socket.emit('getState');
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        serverStatusElement.textContent = 'Server status: Disconnected';
        serverStatusElement.className = 'server-status disconnected';
    });
    
    // Reconnection attempt
    socket.on('reconnecting', () => {
        serverStatusElement.textContent = 'Server status: Reconnecting...';
        serverStatusElement.className = 'server-status';
    });
    
    // User count updates
    socket.on('userCount', (count) => {
        activeUsers = count;
        activeUsersElement.textContent = `${activeUsers} user${activeUsers !== 1 ? 's' : ''} online`;
    });
    
    // Handle incoming state from server
    socket.on('state', (state) => {
        // Update local fractal with server state
        fractal.updateOptions({
            roughness: state.roughness,
            palette: state.palette,
            seedPoints: state.seedPoints
        });
        
        // Update UI controls to match
        document.getElementById('roughness').value = state.roughness;
        document.getElementById('colorPalette').value = state.palette;
        
        // Render updated landscape
        fractal.render();
    });
    
    // Handle incoming seed points from other users
    socket.on('newSeed', (seedPoint) => {
        fractal.addSeedPoint(seedPoint.x, seedPoint.y, seedPoint.value);
        fractal.render();
    });
    
    // Handle evolution updates from server
    socket.on('evolve', () => {
        fractal.evolve(0.01);
        fractal.render();
    });
    
    // UI control event listeners
    const roughnessSlider = document.getElementById('roughness');
    roughnessSlider.addEventListener('change', () => {
        const roughness = parseFloat(roughnessSlider.value);
        fractal.updateOptions({ roughness });
        fractal.render();
        
        // Send update to server
        socket.emit('updateOption', { roughness });
    });
    
    const colorPalette = document.getElementById('colorPalette');
    colorPalette.addEventListener('change', () => {
        const palette = colorPalette.value;
        fractal.updateOptions({ palette });
        fractal.render();
        
        // Send update to server
        socket.emit('updateOption', { palette });
    });
    
    const addSeedButton = document.getElementById('addSeed');
    addSeedButton.addEventListener('click', () => {
        // Change cursor to indicate seed placing mode
        canvas.style.cursor = 'crosshair';
        
        // One-time event listener for canvas click
        const handleCanvasClick = (e) => {
            // Get click position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / canvas.width;
            const y = (e.clientY - rect.top) / canvas.height;
            
            // Create a random height value between 0.4 and 1.0
            const value = 0.4 + Math.random() * 0.6;
            
            // Add seed point locally
            fractal.addSeedPoint(x, y, value);
            fractal.render();
            
            // Send to server
            socket.emit('addSeed', { x, y, value });
            
            // Reset cursor
            canvas.style.cursor = 'default';
            
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

    // For offline mode when server is unavailable
    setTimeout(() => {
        if (!socket.connected) {
            console.log('No server connection, using offline mode');
            // Start local evolution
            setInterval(() => {
                fractal.evolve(0.01);
                fractal.render();
            }, 2000);
        }
    }, 5000);
});