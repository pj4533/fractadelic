import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import ParticleSystem from './ParticleSystem.js';
import TerrainRenderer from './TerrainRenderer.js';
import PerformanceMonitor from './PerformanceMonitor.js';
import SyncManager from './SyncManager.js';
import AnimationManager from './AnimationManager.js';

// Main FractalLandscape class - orchestrates all components
class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        
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
        this.animationManager = new AnimationManager(this);
        
        // Initialize the terrain
        this.terrainGenerator.initTerrain();
        
        // Initialize particles
        this.particleSystem.initializeParticles(
            this.renderer.width,
            this.renderer.height
        );
        
        // Start continuous animation loop
        this.animationManager.startAnimation();
    }
    
    // Calculate particle count based on density parameter
    calculateParticleCount(density) {
        // Map density 0.1-1.0 to particle count 20-300
        return Math.floor(20 + (density * 280));
    }
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
        
        // Add a burst of particles
        this.particleSystem.addParticleBurst(
            x * this.renderer.width, 
            y * this.renderer.height, 
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
                    this.particleSystem.addParticleBurst(
                        x * this.renderer.width, 
                        y * this.renderer.height, 
                        0.8
                    );
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
        const { globalTime, waveOffset } = this.animationManager.getAnimationState();
        
        // Update sync manager with new state
        this.syncManager.updateAnimationState(
            animState,
            globalTime,
            waveOffset,
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
        this.particleSystem.initializeParticles(
            this.renderer.width,
            this.renderer.height
        );
    }
    
    // Render the terrain to the canvas
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Get detail level from performance monitor
        const detailLevel = this.performanceMonitor.getDetailLevel();
        
        // Get current animation state
        const { globalTime, waveOffset } = this.animationManager.getAnimationState();
        
        // Render terrain
        const { triangleCount, detailAreaCount } = this.renderer.renderTerrain(
            globalTime,
            waveOffset,
            this.options, 
            detailLevel
        );
        
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