// PerformanceMonitor class - Tracks and manages performance metrics
class PerformanceMonitor {
    constructor() {
        this.perfData = {
            lastFpsCheck: performance.now(),
            frameCount: 0,
            fps: 60,
            adaptiveDetail: 0.08, // Start at even higher detail (lower = more detail)
            targetDetail: 0.05,   // Target detail level - aim high immediately
            lastTarget: 0.08,     // Track last target for trend analysis
            minFrameTime: 9999,   // Track best frame time (ms)
            fpsHistory: [],       // Track FPS history
            detailHistory: [],    // Track detail level changes
            highDetailMode: true,
            triangleCount: 0,
            triangleTarget: 20000, // Start with even higher target for better quality
            lastDetailChange: 0,   // Set to 0 to allow immediate adaptation
            renderTime: 0,
            detailAreas: 0,
            triangleHistory: [],   // Track history for stability
            upCount: 1,            // Start with a positive bias for detail increases
            downCount: 0           // Counter for consecutive decreases
        };
    }
    
    // Update FPS counter and metrics
    updateMetrics(triangleCount, detailAreaCount) {
        this.perfData.frameCount++;
        const now = performance.now();
        
        this.perfData.triangleCount = triangleCount;
        this.perfData.detailAreas = detailAreaCount;
        
        // Even faster adaptations (check every 250ms instead of 500ms)
        if (now - this.perfData.lastFpsCheck > 250) {
            // Calculate FPS
            const fps = this.perfData.frameCount * 1000 / (now - this.perfData.lastFpsCheck);
            console.log(`Calculated FPS: ${fps.toFixed(2)} from ${this.perfData.frameCount} frames`);
            this.perfData.fps = fps;
            this.perfData.frameCount = 0;
            this.perfData.lastFpsCheck = now;
            
            // Update FPS history
            this.perfData.fpsHistory.push(fps);
            if (this.perfData.fpsHistory.length > 6) { // Reduced history for faster response
                this.perfData.fpsHistory.shift();
            }
            
            // Adjust detail with shorter FPS history
            if (this.perfData.fpsHistory.length >= 2) { // Reduced required history
                const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.perfData.fpsHistory.length;
                
                // Wait less time between major detail changes (500ms instead of 2000ms)
                const timeSinceLastChange = now - this.perfData.lastDetailChange;
                const readyForChange = timeSinceLastChange > 500;
                
                // Even more aggressive adaptation logic
                if (readyForChange) {
                    // Extremely aggressive increases for good performance
                    if (avgFps > 55 && this.perfData.triangleCount < 25000) {
                        // Dramatic detail increase - 40% more triangles
                        this.perfData.targetDetail = Math.max(0.03, this.perfData.adaptiveDetail * 0.6); // Min 0.03 for higher max detail
                        this.perfData.upCount += 2; // Count faster
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "up+++", fps: avgFps});
                    } 
                    // Very quick recovery if FPS drops too low
                    else if (avgFps < 45) {
                        // Emergency detail reduction - 70% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 2.0; // More aggressive reduction
                        this.perfData.upCount = 0;
                        this.perfData.downCount += 2;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "emergency", fps: avgFps});
                    }
                    // Strong increases for decent performance
                    else if (avgFps > 50 && this.perfData.triangleCount < 20000) {
                        // Strong detail increase - 30% more triangles
                        this.perfData.targetDetail = Math.max(0.04, this.perfData.adaptiveDetail * 0.7);
                        this.perfData.upCount++;
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                      direction: "up++", fps: avgFps});
                    }
                    // Moderate reduction if performance is marginal
                    else if (avgFps < 50 && avgFps >= 45) {
                        // More significant detail reduction - 30% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.3;
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
            
            // Much faster approach toward target detail for quicker transitions
            const detailDiff = this.perfData.targetDetail - this.perfData.adaptiveDetail;
            // Very aggressive adaptation - 80% toward target instead of 50%
            this.perfData.adaptiveDetail += detailDiff * 0.8;
            
            console.log(`Detail adapted: ${this.perfData.adaptiveDetail.toFixed(4)}, target: ${this.perfData.targetDetail.toFixed(4)}, triangles: ${this.perfData.triangleCount}`);
            
            // Set lower bound dynamically based on history
            // Push much harder for high detail when performance allows
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                          this.perfData.fpsHistory.length;
            if (this.perfData.upCount > 2 && avgFps > 55) { // Easier to qualify
                // System has shown it can handle high detail - push much further with a higher limit
                this.perfData.triangleTarget = Math.min(30000, this.perfData.triangleTarget + 2000);
            } else if (avgFps < 40) {
                // System is struggling - drastically lower the target
                this.perfData.triangleTarget = Math.max(8000, this.perfData.triangleTarget - 3000);
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