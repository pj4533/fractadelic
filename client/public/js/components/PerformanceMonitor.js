// PerformanceMonitor class - Tracks and manages performance metrics
import PerformanceMetrics from './PerformanceMetrics.js';
import PerformanceAdapter from './PerformanceAdapter.js';
import PerformanceDebugger from './PerformanceDebugger.js';

class PerformanceMonitor {
    constructor() {
        // Initialize components
        this.metrics = new PerformanceMetrics();
        this.adapter = new PerformanceAdapter(this.metrics);
        this.debugger = new PerformanceDebugger(this.metrics);
    }
    
    // Update FPS counter and metrics
    updateMetrics(triangleCount, detailAreaCount) {
        this.metrics.frameCount++;
        const now = performance.now();
        
        // Update triangle metrics
        this.metrics.updateTriangleMetrics(triangleCount, detailAreaCount);
        
        // Check even more frequently for faster adaptation (200ms)
        if (now - this.metrics.lastFpsCheck > 200) {
            // Calculate FPS
            const fps = this.metrics.updateFPS(now);
            console.log(`Calculated FPS: ${fps.toFixed(2)} from ${this.metrics.frameCount} frames`);
            
            // Apply adaptation logic
            this.adapter.adapt(now);
        }
    }
    
    // Get current detail level
    getDetailLevel() {
        return this.metrics.getDetailLevel();
    }
    
    // Track new render time
    setRenderTime(time) {
        this.metrics.setRenderTime(time);
    }
    
    // Draw debug information overlay on the canvas
    drawDebugInfo(ctx) {
        this.debugger.drawDebugInfo(ctx);
    }
}

export default PerformanceMonitor;