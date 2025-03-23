// Main FractalLandscape class - imports modularized components
import ColorManager from './client/public/js/components/ColorManager.js';
import TerrainGenerator from './client/public/js/components/TerrainGenerator.js';

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

export default FractalLandscape;