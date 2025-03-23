// PerformanceMonitor class - Tracks and manages performance metrics
class PerformanceMonitor {
    constructor() {
        this.perfData = {
            lastFpsCheck: performance.now(),
            frameCount: 0,
            fps: 60,
            adaptiveDetail: 0.1, // Start at high detail (lower = more detail)
            targetDetail: 0.1,   // Target detail level
            lastTarget: 0.1,     // Track last target for trend analysis
            minFrameTime: 9999,  // Track best frame time (ms)
            fpsHistory: [],      // Track FPS history
            detailHistory: [],   // Track detail level changes
            highDetailMode: true,
            triangleCount: 0,
            triangleTarget: 15000, // Higher target triangle count for better quality
            lastDetailChange: performance.now(),
            renderTime: 0,
            detailAreas: 0,
            triangleHistory: [],  // Track history for stability
            upCount: 0,          // Counter for consecutive increases
            downCount: 0         // Counter for consecutive decreases
        };
    }
    
    // Update FPS counter and metrics
    updateMetrics(triangleCount, detailAreaCount) {
        this.perfData.frameCount++;
        const now = performance.now();
        
        this.perfData.triangleCount = triangleCount;
        this.perfData.detailAreas = detailAreaCount;
        
        // Faster adaptations (check every 500ms instead of 1000ms)
        if (now - this.perfData.lastFpsCheck > 500) {
            // Calculate FPS
            const fps = this.perfData.frameCount * 1000 / (now - this.perfData.lastFpsCheck);
            console.log(`Calculated FPS: ${fps.toFixed(2)} from ${this.perfData.frameCount} frames`);
            this.perfData.fps = fps;
            this.perfData.frameCount = 0;
            this.perfData.lastFpsCheck = now;
            
            // Update FPS history
            this.perfData.fpsHistory.push(fps);
            if (this.perfData.fpsHistory.length > 10) {
                this.perfData.fpsHistory.shift();
            }
            
            // Only adjust detail if we have stable FPS history
            if (this.perfData.fpsHistory.length >= 3) {
                const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.perfData.fpsHistory.length;
                
                // Wait at least 2 seconds between major detail changes to assess impact
                const timeSinceLastChange = now - this.perfData.lastDetailChange;
                const readyForChange = timeSinceLastChange > 2000;
                
                // Dynamic adaptation logic - MUCH more aggressive
                if (readyForChange) {
                    // Very aggressive increases for good performance
                    if (avgFps > 58 && this.perfData.triangleCount < 20000) {
                        // Significant detail increase - 20% more triangles
                        this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.8); // Min 0.05 to limit max detail
                        this.perfData.upCount++;
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "up", fps: avgFps});
                    } 
                    // Quick recovery if FPS drops too low
                    else if (avgFps < 45) {
                        // Emergency detail reduction - 50% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.5;
                        this.perfData.upCount = 0;
                        this.perfData.downCount++;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "emergency", fps: avgFps});
                    }
                    // Moderate increases for good performance
                    else if (avgFps > 55 && this.perfData.triangleCount < 18000) {
                        // Moderate detail increase - 10% more triangles
                        this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.9); // Min 0.05 to limit max detail
                        this.perfData.upCount++;
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                      direction: "up", fps: avgFps});
                    }
                    // Gradual reduction if performance is marginal
                    else if (avgFps < 50 && avgFps >= 45) {
                        // Gentle detail reduction - 10% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.1;
                        this.perfData.upCount = 0;
                        this.perfData.downCount++;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                      direction: "down", fps: avgFps});
                    }
                }
                
                // Keep history manageable
                if (this.perfData.detailHistory.length > 20) {
                    this.perfData.detailHistory.shift();
                }
            }
            
            // Gradually approach target detail to avoid sudden changes
            const detailDiff = this.perfData.targetDetail - this.perfData.adaptiveDetail;
            // Faster adaptation - 50% toward target instead of 30%
            this.perfData.adaptiveDetail += detailDiff * 0.5;
            
            console.log(`Detail adapted: ${this.perfData.adaptiveDetail.toFixed(4)}, target: ${this.perfData.targetDetail.toFixed(4)}, triangles: ${this.perfData.triangleCount}`);
            
            // Set lower bound dynamically based on history
            // Allow incredibly high detail if system proves it can handle it
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                          this.perfData.fpsHistory.length;
            if (this.perfData.upCount > 3 && avgFps > 58) {
                // System has shown it can handle high detail - push further but with higher limit
                this.perfData.triangleTarget = Math.min(25000, this.perfData.triangleTarget + 1000);
            }
        }
    }
    
    // Get current detail level
    getDetailLevel() {
        return this.perfData.adaptiveDetail;
    }
    
    // Track new render time
    setRenderTime(time) {
        this.perfData.renderTime = time;
    }
    
    // Update triangle history for tracking
    updateTriangleHistory(count) {
        this.perfData.triangleHistory.push(count);
        if (this.perfData.triangleHistory.length > 10) {
            this.perfData.triangleHistory.shift();
        }
    }
    
    // Draw debug information overlay on the canvas
    drawDebugInfo(ctx) {
        // Set up text rendering
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 5, 280, 115);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        ctx.fillText(`FPS: ${Math.round(this.perfData.fps)}`, 10, 10);
        ctx.fillText(`Triangles: ${this.perfData.triangleCount} / Target: ${this.perfData.triangleTarget}`, 10, 25);
        
        // Add color indicators for target direction
        if (this.perfData.targetDetail < this.perfData.adaptiveDetail) {
            // Moving toward higher detail (lower value = higher detail)
            ctx.fillStyle = '#00ff00'; // Green for higher detail
        } else if (this.perfData.targetDetail > this.perfData.adaptiveDetail) {
            // Moving toward lower detail (higher value = lower detail)
            ctx.fillStyle = '#ff0000'; // Red for lower detail
        } else {
            // Stable
            ctx.fillStyle = '#ffffff'; // White - stable
        }
        
        ctx.fillText(`Detail Level: ${this.perfData.adaptiveDetail.toFixed(3)} → ${this.perfData.targetDetail.toFixed(3)}`, 10, 40);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        ctx.fillText(`Detail Areas: ${this.perfData.detailAreas}`, 10, 55);
        ctx.fillText(`Render Time: ${this.perfData.renderTime.toFixed(1)}ms`, 10, 70);
        
        // Show adaptation counters
        ctx.fillText(`Up/Down Counts: ${this.perfData.upCount}/${this.perfData.downCount}`, 10, 85);
        
        // Display last detail change
        if (this.perfData.detailHistory && this.perfData.detailHistory.length > 0) {
            const lastChange = this.perfData.detailHistory[this.perfData.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 100);
        }
        
        ctx.restore();
    }
}

export default PerformanceMonitor;