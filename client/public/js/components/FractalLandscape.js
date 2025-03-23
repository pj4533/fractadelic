import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import ParticleSystem from './ParticleSystem.js';
import TerrainRenderer from './TerrainRenderer.js';
import PerformanceMonitor from './PerformanceMonitor.js';
import SyncManager from './SyncManager.js';

// Main FractalLandscape class - orchestrates all components
class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
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
        this.renderer = new TerrainRenderer(
            this.canvas,
            this.terrainGenerator,
            this.colorManager
        );
        this.performanceMonitor = new PerformanceMonitor();
        this.syncManager = new SyncManager();
        this.syncManager.setServerSyncEnabled(this.options.useServerSync);
        
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
        const deltaTime = Math.min(timestamp - this.lastFrameTime, 33); // Cap at ~30fps to avoid large jumps
        this.lastFrameTime = timestamp;
        
        const renderStart = performance.now();
        
        // Update dimensions if needed
        this.renderer.updateDimensions();
        this.width = this.renderer.width;
        this.height = this.renderer.height;
        
        if (this.syncManager.useServerSync) {
            // In server sync mode, use the rate-based synchronization system
            const { newGlobalTime, newWaveOffset } = this.syncManager.applyServerSync(
                deltaTime, 
                this.globalTime, 
                this.waveOffset, 
                this.colorManager
            );
            
            this.globalTime = newGlobalTime;
            this.waveOffset = newWaveOffset;
        } else {
            // In local mode, use direct increments
            // Use smaller increment values for smoother transitions
            this.globalTime += deltaTime * 0.0005; // Half the original rate for smoother motion
            
            // Use smaller waveOffset increments for smoother transitions
            this.waveOffset += (deltaTime * 0.0005) * this.options.waveIntensity;
        }
        
        // Update color shift (in both modes)
        this.colorManager.updateColorShift(deltaTime * 0.5); // Even slower color shifts
        
        // Auto-evolve less frequently and with smaller values
        if (timestamp - this.lastAutoEvolutionTime > 250) { // Even lower frequency
            this.terrainGenerator.microEvolve(0.0003); // Smaller evolution amount
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Update particles
        this.particleSystem.updateParticles(deltaTime, this.width, this.height);
        
        // Render the scene
        this.render();
        
        // Update performance metrics
        this.performanceMonitor.setRenderTime(performance.now() - renderStart);
        
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
            this.syncManager.setServerSyncEnabled(options.useServerSync);
        }
    }
    
    // Update animation state from server
    updateAnimationState(animState) {
        // Update sync manager with new state
        this.syncManager.updateAnimationState(
            animState,
            this.globalTime,
            this.waveOffset,
            this.colorManager
        );
        
        // Set shared seed for particle system
        if (animState.sharedSeed !== undefined) {
            this.particleSystem.setSharedSeed(animState.sharedSeed);
        }
        
        // Perform microEvolve if signaled by server
        if (animState.microEvolve) {
            this.terrainGenerator.microEvolve(0.0003);
        }
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
        // Clear canvas
        this.renderer.clear();
        
        // Get detail level from performance monitor
        const detailLevel = this.performanceMonitor.getDetailLevel();
        
        // Render terrain
        const { triangleCount, detailAreaCount } = this.renderer.renderTerrain(
            this.globalTime,
            this.waveOffset,
            this.options, 
            detailLevel
        );
        
        // Log the triangle count for debugging
        console.log(`Frame rendered with ${triangleCount} triangles at detail level ${detailLevel}`);
        
        // Update performance metrics
        this.performanceMonitor.updateMetrics(triangleCount, detailAreaCount);
        this.performanceMonitor.updateTriangleHistory(triangleCount);
        
        // Render particles
        this.renderer.renderParticles(this.particleSystem);
        
        // Draw debug info
        this.performanceMonitor.drawDebugInfo(this.renderer.ctx);
    }
}

export { FractalLandscape };
export default FractalLandscape;