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
    
    // Evolution timer
    let evolutionInterval = null;
    let evolveSpeed = 5;
    
    // Start evolution
    function startEvolution() {
        // Clear any existing interval
        if (evolutionInterval) {
            clearInterval(evolutionInterval);
        }
        
        // Set interval based on speed
        const intervalTime = 10000 / evolveSpeed; // 1 to 10 seconds
        evolutionInterval = setInterval(() => {
            fractal.evolve(0.01);
            fractal.render();
        }, intervalTime);
    }
    
    // Start evolution
    startEvolution();
    
    // UI control event listeners
    const roughnessSlider = document.getElementById('roughness');
    roughnessSlider.addEventListener('change', () => {
        const roughness = parseFloat(roughnessSlider.value);
        fractal.updateOptions({ roughness });
        fractal.render();
    });
    
    const colorPalette = document.getElementById('colorPalette');
    colorPalette.addEventListener('change', () => {
        const palette = colorPalette.value;
        fractal.updateOptions({ palette });
        fractal.render();
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
            
            // Reset cursor
            canvas.style.cursor = 'default';
            
            // Remove this event listener
            canvas.removeEventListener('click', handleCanvasClick);
        };
        
        canvas.addEventListener('click', handleCanvasClick);
    });
    
    const evolveSpeedSlider = document.getElementById('evolveSpeed');
    evolveSpeedSlider.addEventListener('change', () => {
        evolveSpeed = parseInt(evolveSpeedSlider.value);
        startEvolution();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        fractal.render();
    });
});