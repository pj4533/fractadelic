// AnimationManager class - Handles animation loop and timing
class AnimationManager {
    constructor(fractalLandscape) {
        this.fractalLandscape = fractalLandscape;
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        this.waveOffset = 0;
        this.animationFrameId = null;
    }
    
    // Start continuous animation loop
    startAnimation() {
        this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    // Animation loop that runs continuously
    animationLoop(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = Math.min(timestamp - this.lastFrameTime, 33); // Cap at ~30fps to avoid large jumps
        this.lastFrameTime = timestamp;
        
        const renderStart = performance.now();
        
        // Update dimensions if needed
        this.fractalLandscape.renderer.updateDimensions();
        
        // Update animation state based on server sync mode
        this.updateAnimationState(deltaTime, timestamp);
        
        // Update particles
        this.fractalLandscape.particleSystem.updateParticles(
            deltaTime, 
            this.fractalLandscape.renderer.width, 
            this.fractalLandscape.renderer.height
        );
        
        // Render the scene
        this.fractalLandscape.render();
        
        // Update performance metrics
        this.fractalLandscape.performanceMonitor.setRenderTime(performance.now() - renderStart);
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    // Update animation state based on sync mode
    updateAnimationState(deltaTime, timestamp) {
        if (this.fractalLandscape.syncManager.useServerSync) {
            // In server sync mode, use the rate-based synchronization system
            const { newGlobalTime, newWaveOffset } = this.fractalLandscape.syncManager.applyServerSync(
                deltaTime, 
                this.globalTime, 
                this.waveOffset, 
                this.fractalLandscape.colorManager
            );
            
            this.globalTime = newGlobalTime;
            this.waveOffset = newWaveOffset;
        } else {
            // In local mode, use direct increments
            // Use smaller increment values for smoother transitions
            this.globalTime += deltaTime * 0.0005; // Half the original rate for smoother motion
            
            // Use smaller waveOffset increments for smoother transitions
            this.waveOffset += (deltaTime * 0.0005) * this.fractalLandscape.options.waveIntensity;
        }
        
        // Update color shift (in both modes)
        this.fractalLandscape.colorManager.updateColorShift(deltaTime * 0.5); // Even slower color shifts
        
        // Auto-evolve less frequently and with smaller values
        if (timestamp - this.lastAutoEvolutionTime > 250) { // Even lower frequency
            this.fractalLandscape.terrainGenerator.microEvolve(0.0003); // Smaller evolution amount
            this.lastAutoEvolutionTime = timestamp;
        }
    }
    
    // Get current animation values
    getAnimationState() {
        return {
            globalTime: this.globalTime,
            waveOffset: this.waveOffset
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