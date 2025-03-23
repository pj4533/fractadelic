import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import TerrainRenderer from './TerrainRenderer.js';
import PerformanceMonitor from './PerformanceMonitor.js';
import SyncManager from './SyncManager.js';
import AnimationManager from './AnimationManager.js';
import { DEFAULT_OPTIONS } from '../utils/constants.js';

// Main FractalLandscape class - orchestrates all components
class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        
        // Default options
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        };
        
        // Initialize components
        this.colorManager = new ColorManager(this.options.palette);
        this.terrainGenerator = new TerrainGenerator(
            this.options.roughness, 
            this.options.seedPoints
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
        
        // Start continuous animation loop
        this.animationManager.startAnimation();
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
        
        // Update server sync preference
        if (options.useServerSync !== undefined) {
            this.syncManager.setServerSyncEnabled(options.useServerSync);
        }
    }
    
    // Update animation state from server
    updateAnimationState(animState) {
        const { globalTime } = this.animationManager.getAnimationState();
        
        // Update sync manager with new state
        this.syncManager.updateAnimationState(
            animState,
            globalTime,
            this.colorManager
        );
        
        // Perform microEvolve if signaled by server
        if (animState.microEvolve) {
            this.terrainGenerator.microEvolve(0.0003);
        }
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
    }
    
    // Render the terrain to the canvas
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Get detail level from performance monitor
        const detailLevel = this.performanceMonitor.getDetailLevel();
        
        // Get current animation state
        const { globalTime } = this.animationManager.getAnimationState();
        
        // Render terrain
        const { triangleCount, detailAreaCount } = this.renderer.renderTerrain(
            globalTime,
            this.options, 
            detailLevel
        );
        
        // Update performance metrics
        this.performanceMonitor.updateMetrics(triangleCount, detailAreaCount);
        
        // Draw debug info
        this.performanceMonitor.drawDebugInfo(this.renderer.ctx);
    }
}

export { FractalLandscape };
export default FractalLandscape;