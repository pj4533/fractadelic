// PerformanceMonitor class - Tracks and manages performance metrics
class PerformanceMonitor {
    constructor() {
        this.perfData = {
            lastFpsCheck: performance.now(),
            frameCount: 0,
            fps: 60,
            adaptiveDetail: 0.2,  // Start at medium detail to avoid oscillation
            targetDetail: 0.2,    // Start conservatively
            lastTarget: 0.2,      // Track last target for trend analysis
            minFrameTime: 9999,   // Track best frame time (ms)
            fpsHistory: [],       // Track FPS history
            detailHistory: [],    // Track detail level changes
            highDetailMode: true,
            triangleCount: 0,
            triangleTarget: 12000, // Start with moderate target for stability
            lastDetailChange: 0,   // Set to 0 to allow immediate adaptation
            renderTime: 0,
            detailAreas: 0,
            triangleHistory: [],   // Track history for stability
            upCount: 0,            // Start neutral, not biased
            downCount: 0,          // Counter for consecutive decreases
            stabilityCount: 0,     // Track periods of stability
            optimalDetailFound: false, // Flag when we've found a good stable value
            targetFps: 55,         // Target FPS for optimal experience
            lastDirection: 'none'  // Track last change direction to detect oscillation
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
                
                // Check for oscillation patterns
                const isOscillating = this.perfData.detailHistory.length >= 4 && 
                    ((this.perfData.lastDirection === 'up' && avgFps < 45) || 
                     (this.perfData.lastDirection === 'down' && avgFps > 55));
                
                // Smart adaptation logic with oscillation detection
                if (readyForChange) {
                    // If we've found optimal detail and are stable, make only tiny adjustments
                    if (this.perfData.optimalDetailFound) {
                        // We're in the sweet spot, make very small adjustments to maintain stability
                        if (avgFps < this.perfData.targetFps - 3) {
                            // Slight reduction in detail - just 10%
                            this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.1;
                            this.perfData.lastDirection = 'down';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "fine-tune-down", fps: avgFps});
                        } else if (avgFps > this.perfData.targetFps + 3 && this.perfData.triangleCount < 20000) {
                            // Slight increase in detail - just 10%
                            this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.9);
                            this.perfData.lastDirection = 'up';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "fine-tune-up", fps: avgFps});
                        } else {
                            // We're at optimal performance, increment stability counter
                            this.perfData.stabilityCount++;
                        }
                    }
                    // If we're oscillating, try to converge by making smaller moves
                    else if (isOscillating) {
                        // Take half the step we normally would to dampen oscillation
                        if (avgFps < 45) {
                            // Gentle detail reduction - 20% fewer triangles
                            this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.2;
                            this.perfData.lastDirection = 'down';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "converge-down", fps: avgFps});
                        } else if (avgFps > 55) {
                            // Gentle detail increase - 15% more triangles
                            this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.85);
                            this.perfData.lastDirection = 'up';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "converge-up", fps: avgFps});
                        }
                    }
                    // Normal adaptation mode - more balanced than before
                    else {
                        // Moderate increases for good performance
                        if (avgFps > 55 && this.perfData.triangleCount < 25000) {
                            // Detail increase - 25% more triangles (less aggressive)
                            this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.75);
                            this.perfData.upCount++;
                            this.perfData.downCount = 0;
                            this.perfData.lastDirection = 'up';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "up", fps: avgFps});
                        } 
                        // Recovery if FPS drops too low
                        else if (avgFps < 45) {
                            // Detail reduction - 40% fewer triangles (less extreme)
                            this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.4;
                            this.perfData.upCount = 0;
                            this.perfData.downCount++;
                            this.perfData.lastDirection = 'down';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "down", fps: avgFps});
                        }
                        // Small increases for decent performance
                        else if (avgFps > 50 && this.perfData.triangleCount < 18000) {
                            // Smaller detail increase - 15% more triangles
                            this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.85);
                            this.perfData.upCount++;
                            this.perfData.downCount = 0; 
                            this.perfData.lastDirection = 'up';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "up", fps: avgFps});
                        }
                        // Small reduction if performance is marginal
                        else if (avgFps < 50 && avgFps >= 45) {
                            // Small detail reduction - 20% fewer triangles
                            this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.2;
                            this.perfData.upCount = 0;
                            this.perfData.downCount++;
                            this.perfData.lastDirection = 'down';
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "down", fps: avgFps});
                        }
                        // Perfect performance zone - we found the sweet spot
                        else if (avgFps >= 50 && avgFps <= 55) {
                            // We're at optimal performance, mark as found
                            this.perfData.optimalDetailFound = true;
                            this.perfData.stabilityCount++;
                            this.perfData.lastDetailChange = now;
                            this.perfData.detailHistory.push({time: now, detail: this.perfData.adaptiveDetail, 
                                                        direction: "optimal", fps: avgFps});
                        }
                    }
                }
                
                // Keep history manageable
                if (this.perfData.detailHistory.length > 20) {
                    this.perfData.detailHistory.shift();
                }
            }
            
            // Adaptive approach toward target detail - faster at first, then slower when converging
            const detailDiff = this.perfData.targetDetail - this.perfData.adaptiveDetail;
            
            // Adjust adaptation rate based on state
            let adaptationRate = 0.5; // Default medium adaptation rate
            
            if (this.perfData.optimalDetailFound) {
                // Slow, gradual changes once we've found optimal settings
                adaptationRate = 0.3;
            } else if (this.perfData.detailHistory.length >= 4) {
                const lastTwoChanges = [
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 1],
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 2]
                ];
                
                // If last two changes were in opposite directions, we're oscillating so go slower
                if (lastTwoChanges[0].direction.includes('up') && lastTwoChanges[1].direction.includes('down') ||
                    lastTwoChanges[0].direction.includes('down') && lastTwoChanges[1].direction.includes('up')) {
                    // Detect oscillation - reduce adaptation rate
                    adaptationRate = 0.3;
                } else {
                    // Same direction changes - moving consistently so move faster
                    adaptationRate = 0.6;
                }
            }
            
            // Apply the calculated adaptation rate
            this.perfData.adaptiveDetail += detailDiff * adaptationRate;
            
            // Add stability detection - if we're close to target, mark as stable
            if (Math.abs(detailDiff) < 0.02 && !this.perfData.optimalDetailFound) {
                // We've reached a stable point - check if it's good
                const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.perfData.fpsHistory.length;
                
                if (avgFps >= 50 && avgFps <= 60) {
                    this.perfData.optimalDetailFound = true;
                    console.log(`Optimal detail level found: ${this.perfData.adaptiveDetail.toFixed(4)}`);
                }
            }
            
            console.log(`Detail adapted: ${this.perfData.adaptiveDetail.toFixed(4)}, target: ${this.perfData.targetDetail.toFixed(4)}, triangles: ${this.perfData.triangleCount}, optimal: ${this.perfData.optimalDetailFound}`);
            
            // Update triangle target more conservatively to avoid oscillation
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                          this.perfData.fpsHistory.length;
                          
            if (this.perfData.optimalDetailFound) {
                // Once optimal is found, make only small adjustments to triangle target
                if (avgFps > 57 && this.perfData.triangleCount < 20000) {
                    // Small increases when we have optimal settings but extra headroom
                    this.perfData.triangleTarget = Math.min(22000, this.perfData.triangleTarget + 500);
                } else if (avgFps < 45) {
                    // Small decreases when struggling
                    this.perfData.triangleTarget = Math.max(8000, this.perfData.triangleTarget - 1000);
                }
            } else {
                // More conservative triangle target adjustments during initial convergence
                if (this.perfData.upCount > 2 && avgFps > 55) {
                    // System handling detail well - increase target moderately
                    this.perfData.triangleTarget = Math.min(25000, this.perfData.triangleTarget + 1000);
                } else if (avgFps < 45) {
                    // System struggling - lower target moderately
                    this.perfData.triangleTarget = Math.max(8000, this.perfData.triangleTarget - 1500);
                }
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
        ctx.fillRect(5, 5, 280, 145); // Taller box for more info
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        ctx.fillText(`FPS: ${Math.round(this.perfData.fps)} / Target: ${this.perfData.targetFps}`, 10, 10);
        ctx.fillText(`Triangles: ${this.perfData.triangleCount} / Target: ${this.perfData.triangleTarget}`, 10, 25);
        
        // Add color indicators for target direction
        if (this.perfData.optimalDetailFound) {
            // We found optimal settings, highlight in gold
            ctx.fillStyle = '#ffcc00'; // Gold for optimal
        } else if (this.perfData.targetDetail < this.perfData.adaptiveDetail) {
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
        
        // Show adaptation counters and stability status
        if (this.perfData.optimalDetailFound) {
            ctx.fillText(`Status: OPTIMAL (Stability: ${this.perfData.stabilityCount})`, 10, 85);
        } else {
            ctx.fillText(`Up/Down Counts: ${this.perfData.upCount}/${this.perfData.downCount}`, 10, 85);
        }
        
        // Display last detail change
        if (this.perfData.detailHistory && this.perfData.detailHistory.length > 0) {
            const lastChange = this.perfData.detailHistory[this.perfData.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 100);
            
            // Show oscillation detection
            if (this.perfData.detailHistory.length >= 4) {
                const lastTwoChanges = [
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 1],
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 2]
                ];
                
                const isOscillating = 
                    (lastTwoChanges[0].direction.includes('up') && lastTwoChanges[1].direction.includes('down')) ||
                    (lastTwoChanges[0].direction.includes('down') && lastTwoChanges[1].direction.includes('up'));
                
                ctx.fillText(`Pattern: ${isOscillating ? 'Oscillating' : 'Stable'}`, 10, 115);
            }
        }
        
        ctx.restore();
    }
}

export default PerformanceMonitor;