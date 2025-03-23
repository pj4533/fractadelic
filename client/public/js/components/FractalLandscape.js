import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import ParticleSystem from './ParticleSystem.js';
import RippleEffect from './RippleEffect.js';

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
        this.rippleEffect = new RippleEffect(
            this.width,
            this.height,
            this.colorManager
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
        }
        
        // Auto-evolve the landscape very subtly
        if (timestamp - this.lastAutoEvolutionTime > 100) { // Micro-evolve every 100ms
            this.terrainGenerator.microEvolve(0.001);
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Update particles
        this.particleSystem.updateParticles(deltaTime, this.width, this.height);
        
        // Update ripples
        this.rippleEffect.updateRipples(deltaTime);
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
        
        // Add a ripple effect at the seed point
        this.rippleEffect.addRipple(x, y, value);
        
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
            
            // Add a few ripples for visual interest
            for (let i = 0; i < 3; i++) {
                const x = Math.random();
                const y = Math.random();
                const value = 0.5 + Math.random() * 0.5;
                this.rippleEffect.addRipple(x, y, value);
            }
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
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
        
        // Add random ripples for visual effect
        for (let i = 0; i < 5; i++) {
            const x = Math.random();
            const y = Math.random();
            const value = Math.random();
            this.rippleEffect.addRipple(x, y, value);
        }
        
        // Renew particles to match new terrain
        this.particleSystem.initializeParticles(this.width, this.height);
    }
    
    // Add a ripple effect at the specified location
    addRipple(x, y, value) {
        this.rippleEffect.addRipple(x, y, value);
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
        
        // Render ripples
        this.renderRipples();
        
        // Render particles
        this.renderParticles();
    }
    
    // Render terrain
    renderTerrain(pixelWidth, pixelHeight) {
        // Draw the terrain with pulsating glow and wave effect
        for (let y = 0; y < this.terrainGenerator.gridSize - 1; y++) {
            for (let x = 0; x < this.terrainGenerator.gridSize - 1; x++) {
                // Apply wave distortion
                const waveEffect = this.options.waveIntensity * Math.sin(x / 5 + y / 5 + this.waveOffset * 3) * 10;
                
                // Get terrain value with potential wave distortion
                const value = this.terrainGenerator.getValue(x, y);
                
                // Get base colors
                const baseColor = this.colorManager.getHeightColor(value);
                
                // Apply glow with intensity
                const glowIntensity = this.options.glowIntensity || 0.5;
                const glowColor = this.colorManager.getGlowColor(
                    baseColor, 
                    x, y, 
                    this.globalTime, 
                    glowIntensity
                );
                
                this.ctx.fillStyle = glowColor;
                
                // Draw rounded pixels for a smoother look
                // Apply wave effect to position
                const xPos = x * pixelWidth + (waveEffect * Math.sin(y / 10 + this.waveOffset));
                const yPos = y * pixelHeight + (waveEffect * Math.cos(x / 10 + this.waveOffset));
                
                // Use rounded rectangles for a smoother appearance
                this.ctx.beginPath();
                this.ctx.roundRect(
                    xPos, 
                    yPos, 
                    pixelWidth + 1, 
                    pixelHeight + 1,
                    1 + glowIntensity * 3 // Corner radius affected by glow
                );
                this.ctx.fill();
            }
        }
    }
    
    // Render ripples
    renderRipples() {
        for (const ripple of this.rippleEffect.ripples) {
            this.ctx.strokeStyle = `${ripple.color}${Math.round(ripple.opacity * 255).toString(16).padStart(2,'0')}`;
            this.ctx.lineWidth = ripple.thickness;
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
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