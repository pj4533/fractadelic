// Main FractalLandscape class - orchestrates all components
class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Default options
        this.options = {
            roughness: 0.5,
            palette: 'cosmic',
            seedPoints: [],
            ...options
        };
        
        // Animation properties
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        
        // Initialize components
        this.colorManager = new ColorManager(this.options.palette);
        this.terrainGenerator = new TerrainGenerator(
            this.options.roughness, 
            this.options.seedPoints
        );
        
        // Initialize the terrain
        this.terrainGenerator.initTerrain();
        
        // Start continuous animation loop
        this.startContinuousAnimation();
    }
    
    // Continuously animate the landscape for flowing, vibrant visuals
    startContinuousAnimation() {
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Animation loop that runs continuously
    continuousAnimation(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update global time for color shifts
        this.globalTime += deltaTime * 0.001;
        this.colorManager.updateColorShift(deltaTime);

        // Auto-evolve the landscape very subtly
        if (timestamp - this.lastAutoEvolutionTime > 100) { // Micro-evolve every 100ms
            this.terrainGenerator.microEvolve(0.001);
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Add a seed point
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
    }
    
    // Update options with fast transition
    updateOptions(options) {
        // Update options
        this.options = { ...this.options, ...options };
        
        // Update components with new options
        if (options.palette) {
            this.colorManager.setPalette(options.palette);
        }
        
        // Only regenerate terrain if roughness changed
        if (options.roughness !== undefined) {
            this.terrainGenerator.setRoughness(options.roughness);
            this.terrainGenerator.initTerrain();
        }
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
    }
    
    // Render the terrain to the canvas
    render() {
        // Make sure canvas dimensions match the container
        if (this.canvas.width !== this.canvas.clientWidth || 
            this.canvas.height !== this.canvas.clientHeight) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate pixel size
        const pixelWidth = this.width / (this.terrainGenerator.gridSize - 1);
        const pixelHeight = this.height / (this.terrainGenerator.gridSize - 1);
        
        // Render terrain
        this.renderTerrain(pixelWidth, pixelHeight);
    }
    
    // Render terrain
    renderTerrain(pixelWidth, pixelHeight) {
        // Draw the terrain with pulsating glow
        for (let y = 0; y < this.terrainGenerator.gridSize - 1; y++) {
            for (let x = 0; x < this.terrainGenerator.gridSize - 1; x++) {
                const value = this.terrainGenerator.getValue(x, y);
                const baseColor = this.colorManager.getHeightColor(value);
                const glowColor = this.colorManager.getGlowColor(baseColor, x, y, this.globalTime);
                
                this.ctx.fillStyle = glowColor;
                
                // Draw rounded pixels for a smoother look
                const xPos = x * pixelWidth;
                const yPos = y * pixelHeight;
                
                // Use rounded rectangles for a smoother appearance
                this.ctx.beginPath();
                this.ctx.roundRect(
                    xPos, 
                    yPos, 
                    pixelWidth + 1, 
                    pixelHeight + 1,
                    2 // Corner radius
                );
                this.ctx.fill();
            }
        }
    }
}

// Color Management - handles palettes and color calculations
class ColorManager {
    constructor(paletteName) {
        // Enhanced vibrant color palettes
        this.palettes = {
            cosmic: ['#120136', '#035aa6', '#40bad5', '#60efff', '#b2fcff', '#fcff82', '#ff9c71', '#ff5050', '#d162a4', '#b000ff'],
            neon: ['#ff00cc', '#9600ff', '#4900ff', '#00b8ff', '#00fff9', '#00ffa3', '#b6ff00', '#fbff00', '#ff9100', '#ff0000'],
            candy: ['#ea00ff', '#aa00ff', '#7500ff', '#4d00ff', '#2600ff', '#00fff5', '#00ff85', '#00ff3a', '#caff00', '#f9ff00'],
            sunset: ['#0d0221', '#0f4c81', '#168aad', '#34c4e3', '#56e0e0', '#70d6ff', '#ff70a6', '#ff9770', '#ffd670', '#fffd82']
        };
        
        // Add more palettes
        this.palettes.lava = ['#000000', '#240046', '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd', '#c77dff', '#ff7c43', '#ff5a5f', '#ff9e00'];
        this.palettes.rainbow = ['#ff0000', '#ff8700', '#ffd300', '#deff0a', '#a1ff0a', '#0aff99', '#0aefff', '#147df5', '#580aff', '#be0aff'];
        
        this.currentPalette = paletteName || 'cosmic';
        this.colorShift = 0;
    }
    
    setPalette(paletteName) {
        if (this.palettes[paletteName]) {
            this.currentPalette = paletteName;
        }
    }
    
    updateColorShift(deltaTime) {
        this.colorShift = (this.colorShift + deltaTime * 0.0002) % 1;
    }
    
    // Get a color for a height value with shifting
    getHeightColor(height, animate = true) {
        const palette = this.palettes[this.currentPalette];
        
        // Apply color shifting for animation
        let shiftedHeight = height;
        if (animate) {
            // Shift the height value based on the global time
            shiftedHeight = (height + this.colorShift) % 1;
        }
        
        // Map to color index
        const colorIndex = Math.min(palette.length - 1, Math.floor(shiftedHeight * palette.length));
        return palette[colorIndex];
    }
    
    // Get color with a pulsating glow effect
    getGlowColor(color, x, y, globalTime) {
        // Extract RGB components
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        
        // Calculate a pulsating factor based on position and time
        const pulseFactor = 0.2 * Math.sin(x / 30 + y / 30 + globalTime * 2) + 1;
        
        // Apply the pulse factor
        const rNew = Math.min(255, Math.round(r * pulseFactor));
        const gNew = Math.min(255, Math.round(g * pulseFactor));
        const bNew = Math.min(255, Math.round(b * pulseFactor));
        
        // Convert back to hex
        return `#${rNew.toString(16).padStart(2, '0')}${gNew.toString(16).padStart(2, '0')}${bNew.toString(16).padStart(2, '0')}`;
    }
}

// Terrain Generation using Diamond-Square algorithm
class TerrainGenerator {
    constructor(roughness, seedPoints = []) {
        this.roughness = roughness;
        this.seedPoints = seedPoints;
        
        // Grid size - using a power of 2 plus 1 (smaller for faster rendering)
        this.gridSize = 65; // Was 129
        this.terrainMap = new Array(this.gridSize * this.gridSize).fill(0);
    }
    
    setRoughness(roughness) {
        this.roughness = roughness;
    }
    
    // Initialize terrain with random corners
    initTerrain() {
        // Clear the terrain map
        this.terrainMap.fill(0);
        
        const size = this.gridSize - 1;
        
        // Set the four corners to random values
        this.setValue(0, 0, Math.random());
        this.setValue(size, 0, Math.random());
        this.setValue(0, size, Math.random());
        this.setValue(size, size, Math.random());
        
        // Apply seed points if any
        for (const seed of this.seedPoints) {
            const { x, y, value } = seed;
            const gridX = Math.floor(x * size);
            const gridY = Math.floor(y * size);
            this.setValue(gridX, gridY, value);
        }
        
        // Run the diamond-square algorithm
        this.diamondSquare(size);
    }
    
    // Add a seed point
    addSeedPoint(x, y, value) {
        const seedPoint = { x, y, value };
        this.seedPoints.push(seedPoint);
        
        // Update the terrain with the new seed point
        const gridX = Math.floor(x * (this.gridSize - 1));
        const gridY = Math.floor(y * (this.gridSize - 1));
        this.setValue(gridX, gridY, value);
        
        // Re-run the algorithm
        this.diamondSquare(this.gridSize - 1);
    }
    
    // Micro-evolve for subtle constant movement
    microEvolve(rate) {
        // Apply very subtle evolution to random points
        for (let i = 0; i < 10; i++) {
            const index = Math.floor(Math.random() * this.terrainMap.length);
            const currentValue = this.terrainMap[index];
            const shift = (Math.random() * 2 - 1) * rate;
            this.terrainMap[index] = Math.max(0, Math.min(1, currentValue + shift));
        }
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        for (let i = 0; i < this.terrainMap.length; i++) {
            const currentValue = this.terrainMap[i];
            const shift = (Math.random() * 2 - 1) * rate;
            this.terrainMap[i] = Math.max(0, Math.min(1, currentValue + shift));
        }
    }
    
    // Diamond-Square algorithm for terrain generation
    diamondSquare(size) {
        let step = size;
        let roughness = this.roughness;
        
        while (step > 1) {
            const half = step / 2;
            
            // Diamond step
            for (let y = half; y < this.gridSize - 1; y += step) {
                for (let x = half; x < this.gridSize - 1; x += step) {
                    this.diamondStep(x, y, half, roughness);
                }
            }
            
            // Square step
            for (let y = 0; y < this.gridSize - 1; y += half) {
                for (let x = (y + half) % step; x < this.gridSize - 1; x += step) {
                    this.squareStep(x, y, half, roughness);
                }
            }
            
            // Reduce roughness each iteration
            step /= 2;
            roughness *= 0.5;
        }
    }
    
    // Diamond step of the algorithm
    diamondStep(x, y, size, roughness) {
        // Average the four corner values
        const avg = (
            this.getValue(x - size, y - size) +
            this.getValue(x + size, y - size) +
            this.getValue(x - size, y + size) +
            this.getValue(x + size, y + size)
        ) / 4;
        
        // Add random displacement
        const displacement = (Math.random() * 2 - 1) * roughness;
        this.setValue(x, y, avg + displacement);
    }
    
    // Square step of the algorithm
    squareStep(x, y, size, roughness) {
        // Count and sum valid neighbors
        let count = 0;
        let sum = 0;
        
        // Top
        if (y - size >= 0) {
            sum += this.getValue(x, y - size);
            count++;
        }
        
        // Right
        if (x + size < this.gridSize) {
            sum += this.getValue(x + size, y);
            count++;
        }
        
        // Bottom
        if (y + size < this.gridSize) {
            sum += this.getValue(x, y + size);
            count++;
        }
        
        // Left
        if (x - size >= 0) {
            sum += this.getValue(x - size, y);
            count++;
        }
        
        // Average valid neighbors
        const avg = sum / count;
        
        // Add random displacement
        const displacement = (Math.random() * 2 - 1) * roughness;
        this.setValue(x, y, avg + displacement);
    }
    
    // Helper to get value from terrain map
    getValue(x, y) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return 0;
        }
        return this.terrainMap[y * this.gridSize + x];
    }
    
    // Helper to set value in terrain map
    setValue(x, y, value) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return;
        }
        // Ensure value is between 0 and 1
        this.terrainMap[y * this.gridSize + x] = Math.max(0, Math.min(1, value));
    }
}