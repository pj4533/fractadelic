import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import ParticleSystem from './ParticleSystem.js';

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
            particleDensity: 0.5,    // 0.1 to 1.0 - controls number of particles
            glowIntensity: 0.5,      // 0.1 to 1.0 - controls glow effect
            waveIntensity: 0.5,      // 0.1 to 1.0 - controls wave-like movement
            useServerSync: true,     // Whether to use server-synchronized animation
            ...options
        };
        
        // Animation properties
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        this.waveOffset = 0;
        this.useServerSync = this.options.useServerSync;
        
        // Initialize components
        this.colorManager = new ColorManager(this.options.palette);
        this.terrainGenerator = new TerrainGenerator(
            this.options.roughness, 
            this.options.seedPoints
        );
        this.particleSystem = new ParticleSystem(
            this.terrainGenerator,
            this.colorManager,
            this.calculateParticleCount(this.options.particleDensity)
        );
        
        // Initialize the terrain
        this.terrainGenerator.initTerrain();
        
        // Initialize particles
        this.particleSystem.initializeParticles(this.width, this.height);
        
        // Start continuous animation loop
        this.startContinuousAnimation();
    }
    
    // Calculate particle count based on density parameter
    calculateParticleCount(density) {
        // Map density 0.1-1.0 to particle count 20-300
        return Math.floor(20 + (density * 280));
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
        
        // Only update animation state locally if not using server sync
        if (!this.useServerSync) {
            // Update global time for color shifts
            this.globalTime += deltaTime * 0.001;
            this.colorManager.updateColorShift(deltaTime);
            
            // Update wave effect
            this.waveOffset += deltaTime * 0.001 * this.options.waveIntensity;
            
            // Auto-evolve the landscape very subtly (only in local mode)
            if (timestamp - this.lastAutoEvolutionTime > 100) {
                this.terrainGenerator.microEvolve(0.001);
                this.lastAutoEvolutionTime = timestamp;
            }
        }
        // In server sync mode, we don't do any time-based updates locally
        // All updates come from the server's animationState events
        
        // Update particles
        this.particleSystem.updateParticles(deltaTime, this.width, this.height);
        
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
        
        
        // Add a burst of particles
        this.particleSystem.addParticleBurst(
            x * this.width, 
            y * this.height, 
            value
        );
    }
    
    // Update options with fast transition
    updateOptions(options) {
        // Update options
        this.options = { ...this.options, ...options };
        
        // Update components with new options
        if (options.palette) {
            this.colorManager.setPalette(options.palette);
        }
        
        // Update particle density
        if (options.particleDensity !== undefined) {
            this.particleSystem.maxParticles = this.calculateParticleCount(options.particleDensity);
            
            // Create particle explosion effect when increasing density
            if (this.particleSystem.particles.length < this.particleSystem.maxParticles) {
                for (let i = 0; i < 5; i++) {
                    const x = Math.random();
                    const y = Math.random();
                    this.particleSystem.addParticleBurst(x * this.width, y * this.height, 0.8);
                }
            }
        }
        
        // Only regenerate terrain if roughness changed
        if (options.roughness !== undefined) {
            this.terrainGenerator.setRoughness(options.roughness);
            this.terrainGenerator.initTerrain();
            
        }
        
        // Update server sync preference
        if (options.useServerSync !== undefined) {
            this.useServerSync = options.useServerSync;
        }
    }
    
    // Update animation state from server
    updateAnimationState(animState) {
        if (!this.useServerSync) return;
        
        // Update animation state from server
        this.globalTime = animState.globalTime;
        this.waveOffset = animState.waveOffset * this.options.waveIntensity;
        
        // Update color shift in the color manager
        if (animState.colorShift !== undefined) {
            this.colorManager.colorShift = animState.colorShift;
        }
        
        // Perform microEvolve if signaled by server
        if (animState.microEvolve) {
            this.terrainGenerator.microEvolve(0.001);
        }
        
        // Store the shared random seed for deterministic random operations
        if (animState.sharedSeed !== undefined) {
            this.sharedSeed = animState.sharedSeed;
            // Set seed for particle system
            this.particleSystem.setSharedSeed(this.sharedSeed);
        }
    }
    
    // Get deterministic random value using shared seed
    getSharedRandom() {
        // Simple deterministic pseudo-random using shared seed
        this.sharedSeed = (this.sharedSeed * 9301 + 49297) % 233280;
        return this.sharedSeed / 233280;
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
        
        
        // Renew particles to match new terrain
        this.particleSystem.initializeParticles(this.width, this.height);
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
        
        
        // Render particles
        this.renderParticles();
    }
    
    // Render terrain using triangular mesh with gradient shading
    renderTerrain(pixelWidth, pixelHeight) {
        // Draw the terrain as a continuous triangular mesh with gradient shading
        for (let y = 0; y < this.terrainGenerator.gridSize - 1; y++) {
            for (let x = 0; x < this.terrainGenerator.gridSize - 1; x++) {
                // Get the four corners of the current grid cell
                const points = [
                    { x, y },                 // Top-left
                    { x: x + 1, y },          // Top-right
                    { x: x + 1, y: y + 1 },   // Bottom-right
                    { x, y: y + 1 }           // Bottom-left
                ];
                
                // Calculate wave-affected positions and values for each corner
                const corners = points.map(p => {
                    const waveEffect = this.options.waveIntensity * Math.sin(p.x / 5 + p.y / 5 + this.waveOffset * 3) * 10;
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = this.options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, this.globalTime, glowIntensity
                    );
                    
                    // Apply wave distortion to positions
                    const xPos = p.x * pixelWidth + (waveEffect * Math.sin(p.y / 10 + this.waveOffset));
                    const yPos = p.y * pixelHeight + (waveEffect * Math.cos(p.x / 10 + this.waveOffset));
                    
                    return {
                        xPos,
                        yPos,
                        value,
                        color: glowColor
                    };
                });
                
                // Draw first triangle (top-left, top-right, bottom-left)
                this.drawGradientTriangle(
                    corners[0].xPos, corners[0].yPos, corners[0].color,
                    corners[1].xPos, corners[1].yPos, corners[1].color,
                    corners[3].xPos, corners[3].yPos, corners[3].color
                );
                
                // Draw second triangle (bottom-left, top-right, bottom-right)
                this.drawGradientTriangle(
                    corners[3].xPos, corners[3].yPos, corners[3].color,
                    corners[1].xPos, corners[1].yPos, corners[1].color,
                    corners[2].xPos, corners[2].yPos, corners[2].color
                );
            }
        }
    }
    
    // Draw a triangle with gradient colors at each vertex
    drawGradientTriangle(x1, y1, color1, x2, y2, color2, x3, y3, color3) {
        // Save context state
        this.ctx.save();
        
        // Create a triangle path
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.closePath();
        
        // Create a gradient from the three points
        // We'll use a simplified approach with the midpoint as gradient center
        const centerX = (x1 + x2 + x3) / 3;
        const centerY = (y1 + y2 + y3) / 3;
        
        // Calculate distances to create proportional gradient
        const d1 = Math.hypot(x1 - centerX, y1 - centerY);
        const d2 = Math.hypot(x2 - centerX, y2 - centerY);
        const d3 = Math.hypot(x3 - centerX, y3 - centerY);
        const maxDist = Math.max(d1, d2, d3) * 1.2; // Slightly larger for better blending
        
        // Create radial gradient
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxDist
        );
        
        // Add color stops based on normalized distances
        gradient.addColorStop(d1 / maxDist, color1);
        gradient.addColorStop(d2 / maxDist, color2);
        gradient.addColorStop(d3 / maxDist, color3);
        
        // Fill with gradient
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Restore context
        this.ctx.restore();
    }
    
    
    // Render particles
    renderParticles() {
        for (const p of this.particleSystem.particles) {
            // Calculate opacity based on age
            const ageOpacity = 1 - (p.age / p.lifetime);
            
            // Get grid position and height
            const gridX = Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1));
            const gridY = Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color from the particle system
            const particleColor = this.particleSystem.getParticleColor(
                p, height, ageOpacity
            );
            
            // Draw glowing particle
            const radius = p.burstParticle ? 
                p.size * (1 - p.age / p.lifetime) * 3 : 
                p.size;
                
            this.ctx.save();
            
            // Draw glow
            const gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, radius * 2
            );
            gradient.addColorStop(0, particleColor);
            gradient.addColorStop(1, `${particleColor.substring(0,7)}00`); // Transparent
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw particle core
            this.ctx.fillStyle = particleColor;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
}

export { FractalLandscape };
export default FractalLandscape;