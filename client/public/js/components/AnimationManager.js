// AnimationManager class - Handles animation loop and timing
import { updateCyclicValue } from '../utils/AnimationUtils.js';
import { ANIMATION } from '../utils/constants.js';

class AnimationManager {
    constructor(fractalLandscape) {
        this.fractalLandscape = fractalLandscape;
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        this.animationFrameId = null;
    }
    
    // Start continuous animation loop
    startAnimation() {
        this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    // Animation loop that runs continuously
    animationLoop(timestamp) {
        // Initialize lastFrameTime and handle first frame case
        if (!this.lastFrameTime) {
            this.lastFrameTime = timestamp;
            this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
            return; // Skip first frame to establish baseline
        }
        
        // Calculate deltaTime with strict bounds to prevent large jumps
        // This is critical for stable animation and avoids edge cases
        let deltaTime = timestamp - this.lastFrameTime;
        
        // Handle browser tab inactive/background case
        if (deltaTime > 100) {
            console.warn(`Long frame time detected: ${deltaTime}ms, capping to 33ms`);
            deltaTime = 33; // Cap to ~30fps equivalent
        } else if (deltaTime <= 0) {
            // Handle negative or zero delta (shouldn't happen but can with timer issues)
            console.warn(`Invalid delta time: ${deltaTime}ms, using 16ms instead`);
            deltaTime = 16; // Use ~60fps equivalent
        }
        
        // Update last frame time marker
        this.lastFrameTime = timestamp;
        
        // Track render performance
        const renderStart = performance.now();
        
        // Update dimensions if needed
        this.fractalLandscape.renderer.updateDimensions();
        
        try {
            // Update animation state based on server sync mode
            this.updateAnimationState(deltaTime, timestamp);
            
            // Render the scene
            this.fractalLandscape.render();
        } catch (err) {
            console.error('Error in animation loop:', err);
            // Continue animation even after error to avoid freezing
        }
        
        // Update performance metrics
        this.fractalLandscape.performanceMonitor.setRenderTime(performance.now() - renderStart);
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    // Update animation state based on sync mode
    updateAnimationState(deltaTime, timestamp) {
        if (this.fractalLandscape.syncManager.useServerSync) {
            // In server sync mode, use the rate-based synchronization system
            const { newGlobalTime } = this.fractalLandscape.syncManager.applyServerSync(
                deltaTime, 
                this.globalTime, 
                this.fractalLandscape.colorManager
            );
            
            this.globalTime = newGlobalTime;
        } else {
            // In local mode, use direct increments
            // Use smaller increment values for smoother transitions
            this.globalTime += deltaTime * ANIMATION.globalTimeRate;
        }
        
        // Update color shift for animation
        this.fractalLandscape.colorManager.updateColorShift(deltaTime * 0.5);
        
        // Auto-evolve less frequently and with smaller values
        if (timestamp - this.lastAutoEvolutionTime > 250) { // Even lower frequency
            this.fractalLandscape.terrainGenerator.microEvolve(ANIMATION.evolutionRate);
            this.lastAutoEvolutionTime = timestamp;
        }
    }
    
    // Get current animation values
    getAnimationState() {
        return {
            globalTime: this.globalTime
        };
    }
    
    // Stop animation
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

export default AnimationManager;