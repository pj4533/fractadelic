// PerformanceMonitor class - Tracks and manages performance metrics
class PerformanceMonitor {
    constructor() {
        this.perfData = {
            lastFpsCheck: performance.now(),
            frameCount: 0,
            fps: 60,
            adaptiveDetail: 0.15,  // Start with medium-high detail (sweet spot is often around 0.1-0.2)
            targetDetail: 0.15,    // Start at the same position
            lastTarget: 0.15,      // Track last target for trend analysis
            minFrameTime: 9999,    // Track best frame time (ms)
            fpsHistory: [],        // Track FPS history
            detailHistory: [],     // Track detail level changes
            triangleHistory: [],   // Track triangle count history for stability analysis
            highDetailMode: true,
            triangleCount: 0,
            triangleTarget: 15000, // Start with middle-ground target (avoid extremes)
            lastDetailChange: 0,   // Set to 0 to allow immediate adaptation
            renderTime: 0,
            detailAreas: 0,
            upCount: 0,            // Start neutral, not biased
            downCount: 0,          // Counter for consecutive decreases
            stabilityCount: 0,     // Track periods of stability
            optimalDetailFound: false, // Flag when we've found a good stable value
            targetFps: 55,         // Target FPS for optimal experience
            lastDirection: 'none', // Track last change direction to detect oscillation
            maxAllowedDetailChange: 0.05, // Limit maximum change in a single step
            minTriangleTarget: 10000,    // Minimum acceptable triangle count
            maxTriangleTarget: 20000,    // Maximum acceptable triangle count
            preferredTriangleRange: {min: 12000, max: 18000}, // Ideal range to stabilize within
            previousDetailLevels: [0.15, 0.15, 0.15], // Track previous levels for exponential smoothing
            smoothingFactor: 0.6   // Exponential smoothing factor (higher = less smoothing)
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
                
                // Update triangle history for analysis
                this.updateTriangleHistory(this.perfData.triangleCount);
                
                // Check if we're within the preferred triangle range
                const inPreferredRange = 
                    this.perfData.triangleCount >= this.perfData.preferredTriangleRange.min && 
                    this.perfData.triangleCount <= this.perfData.preferredTriangleRange.max;
                
                // Check for extreme values to avoid
                const atExtremeLow = this.perfData.triangleCount < this.perfData.minTriangleTarget;
                const atExtremeHigh = this.perfData.triangleCount > this.perfData.maxTriangleTarget;
                
                // Enhanced adaptation logic with safeguards against extreme jumps
                if (readyForChange) {
                    // Calculate a base target based on FPS
                    let baseTargetDetail = this.perfData.adaptiveDetail;
                    let changeDirection = "none";
                    let changeReason = "";
                    
                    // If we're at extreme values, prioritize moving away from extremes
                    if (atExtremeLow) {
                        // We're too low, increase detail regardless of FPS (unless critically low FPS)
                        if (avgFps > 35) {
                            baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.85);
                            changeDirection = "up";
                            changeReason = "extreme-low";
                        }
                    } else if (atExtremeHigh) {
                        // We're too high, decrease detail regardless of FPS (unless excellent FPS)
                        if (avgFps < 58) {
                            baseTargetDetail = this.perfData.adaptiveDetail * 1.25;
                            changeDirection = "down";
                            changeReason = "extreme-high";
                        }
                    }
                    // If we're already in a good range, make decisions based on FPS
                    else if (inPreferredRange) {
                        if (avgFps < 45) {
                            // FPS is too low, reduce detail moderately
                            baseTargetDetail = this.perfData.adaptiveDetail * 1.15;
                            changeDirection = "down";
                            changeReason = "fps-low";
                        } else if (avgFps > 58 && avgFps < 65) {
                            // FPS is good but we have headroom, increase detail slightly
                            baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.95);
                            changeDirection = "up";
                            changeReason = "fps-high";
                        } else if (avgFps >= 50 && avgFps <= 58) {
                            // Perfect FPS range - mark as optimal
                            this.perfData.optimalDetailFound = true;
                            this.perfData.stabilityCount++;
                            changeDirection = "stable";
                            changeReason = "optimal";
                            
                            // Make tiny adjustments to maintain perfect range
                            if (avgFps > 55) {
                                baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.98);
                            } else if (avgFps < 52) {
                                baseTargetDetail = this.perfData.adaptiveDetail * 1.02;
                            }
                        }
                    }
                    // Not in preferred range but not at extremes either
                    else {
                        // If we're too high in triangle count but FPS is good
                        if (this.perfData.triangleCount > this.perfData.preferredTriangleRange.max && avgFps > 55) {
                            // We have room to stay here, but prefer to move toward preferred range
                            baseTargetDetail = this.perfData.adaptiveDetail * 1.1;
                            changeDirection = "down";
                            changeReason = "preferred-range";
                        } 
                        // If we're too low in triangle count and FPS is marginal
                        else if (this.perfData.triangleCount < this.perfData.preferredTriangleRange.min && avgFps > 50) {
                            // Move toward preferred range
                            baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.9);
                            changeDirection = "up";
                            changeReason = "preferred-range";
                        }
                        // Otherwise make FPS-based decisions
                        else if (avgFps < 45) {
                            // FPS too low - reduce detail moderately
                            baseTargetDetail = this.perfData.adaptiveDetail * 1.2;
                            changeDirection = "down";
                            changeReason = "fps-too-low";
                        } else if (avgFps > 58) {
                            // FPS excellent - increase detail moderately
                            baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.85);
                            changeDirection = "up";
                            changeReason = "fps-excellent";
                        } else if (avgFps >= 45 && avgFps < 50) {
                            // FPS marginal - slight reduction
                            baseTargetDetail = this.perfData.adaptiveDetail * 1.05;
                            changeDirection = "down";
                            changeReason = "fps-marginal";
                        } else if (avgFps >= 50 && avgFps < 55) {
                            // FPS good - slight increase
                            baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.95);
                            changeDirection = "up";
                            changeReason = "fps-good";
                        }
                    }
                    
                    // CRITICAL: Limit the magnitude of change to prevent extreme jumps
                    const maxAllowedChange = this.perfData.maxAllowedDetailChange;
                    const currentDetail = this.perfData.adaptiveDetail;
                    let limitedTarget = baseTargetDetail;
                    
                    // Limit how much detail can change in one step
                    if (baseTargetDetail < currentDetail - maxAllowedChange) {
                        // Too big of an increase in detail (lower number = higher detail)
                        limitedTarget = currentDetail - maxAllowedChange;
                        changeReason += "-limited";
                    } else if (baseTargetDetail > currentDetail + maxAllowedChange) {
                        // Too big of a decrease in detail
                        limitedTarget = currentDetail + maxAllowedChange;
                        changeReason += "-limited";
                    }
                    
                    // Apply smoothing to prevent oscillations
                    // Use a weighted average of previous values
                    const previousAvg = this.perfData.previousDetailLevels.reduce((a, b) => a + b, 0) / 
                                       this.perfData.previousDetailLevels.length;
                    
                    // Apply exponential smoothing
                    const smoothingFactor = this.perfData.smoothingFactor;
                    const smoothedTarget = (smoothingFactor * limitedTarget) + 
                                          ((1 - smoothingFactor) * previousAvg);
                                          
                    // Update final target
                    this.perfData.targetDetail = smoothedTarget;
                    
                    // Update previous detail levels history for next smoothing
                    this.perfData.previousDetailLevels.push(this.perfData.targetDetail);
                    if (this.perfData.previousDetailLevels.length > 4) {
                        this.perfData.previousDetailLevels.shift();
                    }
                    
                    // Only record a direction change if we actually changed significantly
                    if (Math.abs(this.perfData.targetDetail - this.perfData.adaptiveDetail) > 0.005) {
                        this.perfData.lastDirection = changeDirection;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({
                            time: now, 
                            detail: this.perfData.targetDetail, 
                            direction: changeReason, 
                            fps: avgFps,
                            triangles: this.perfData.triangleCount
                        });
                        
                        // Track consecutive changes in the same direction
                        if (changeDirection === 'up') {
                            this.perfData.upCount++;
                            this.perfData.downCount = 0;
                        } else if (changeDirection === 'down') {
                            this.perfData.upCount = 0;
                            this.perfData.downCount++;
                        }
                    }
                }
                
                // Keep history manageable
                if (this.perfData.detailHistory.length > 20) {
                    this.perfData.detailHistory.shift();
                }
            }
            
            // Adaptive approach toward target detail - use different strategies based on context
            const detailDiff = this.perfData.targetDetail - this.perfData.adaptiveDetail;
            
            // Adjust adaptation rate based on state
            let adaptationRate = 0.4; // Default medium adaptation rate
            
            // Check if we're near the preferred triangle count range
            const nearPreferredRange = 
                this.perfData.triangleCount >= this.perfData.preferredTriangleRange.min * 0.7 && 
                this.perfData.triangleCount <= this.perfData.preferredTriangleRange.max * 1.3;
                
            // Prioritize stability and convergence over speed
            if (this.perfData.optimalDetailFound) {
                // Very slow, gradual changes once we've found optimal settings
                adaptationRate = 0.2;
            } else if (nearPreferredRange) {
                // When near the preferred range, move carefully to avoid overshooting
                adaptationRate = 0.3;
            } else if (Math.abs(detailDiff) > 0.1) {
                // For very large changes, move more cautiously to avoid extreme swings
                adaptationRate = 0.3;
            } else if (this.perfData.detailHistory.length >= 3) {
                const recentChanges = this.perfData.detailHistory.slice(-3);
                
                // Check for oscillation patterns in recent history
                let hasOscillation = false;
                for (let i = 0; i < recentChanges.length - 1; i++) {
                    if ((recentChanges[i].direction.includes('up') && recentChanges[i+1].direction.includes('down')) ||
                        (recentChanges[i].direction.includes('down') && recentChanges[i+1].direction.includes('up'))) {
                        hasOscillation = true;
                        break;
                    }
                }
                
                if (hasOscillation) {
                    // Detected oscillation - use very slow adaptation
                    adaptationRate = 0.2;
                }
            }
            
            // Apply the calculated adaptation rate with a smooth transition
            // Use a weighted moving average approach for smoother transitions
            const newDetail = this.perfData.adaptiveDetail + (detailDiff * adaptationRate);
            
            // Extra smoothing for significant changes (over 15% change in triangles)
            if (Math.abs(detailDiff) > 0.1) {
                // For big jumps, use weighted average with previous value
                this.perfData.adaptiveDetail = (newDetail * 0.6) + (this.perfData.adaptiveDetail * 0.4);
            } else {
                this.perfData.adaptiveDetail = newDetail;
            }
            
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
            
            // Track average FPS
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                          this.perfData.fpsHistory.length;
            
            // Calculate average triangle count from history
            const avgTriangleCount = this.perfData.triangleHistory.length > 0 
                ? this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length
                : this.perfData.triangleCount;
            
            // Triangle target adjustment with preference for mid-range values
            if (this.perfData.optimalDetailFound) {
                // Once optimal is found, make only very small adjustments
                if (avgFps > 57 && avgTriangleCount < this.perfData.preferredTriangleRange.max) {
                    // Small increases when performance is good
                    this.perfData.triangleTarget = Math.min(
                        this.perfData.maxTriangleTarget, 
                        this.perfData.triangleTarget + 250
                    );
                } else if (avgFps < 48) {
                    // Small decreases when approaching performance limits
                    this.perfData.triangleTarget = Math.max(
                        this.perfData.minTriangleTarget,
                        this.perfData.triangleTarget - 500
                    );
                }
                // If we're in the sweet spot, don't change anything
            } else {
                // While converging, prioritize moving toward preferred range
                if (avgTriangleCount < this.perfData.preferredTriangleRange.min) {
                    // Below preferred range - increase carefully if FPS allows
                    if (avgFps > 50) {
                        // Increase toward preferred range, faster when further away
                        const distance = this.perfData.preferredTriangleRange.min - avgTriangleCount;
                        const increaseAmount = Math.min(750, Math.max(250, distance / 15));
                        this.perfData.triangleTarget = Math.min(
                            this.perfData.preferredTriangleRange.max,
                            this.perfData.triangleTarget + increaseAmount
                        );
                    }
                } else if (avgTriangleCount > this.perfData.preferredTriangleRange.max) {
                    // Above preferred range - decrease carefully
                    // Even if FPS is good, prefer to stay in the ideal range
                    const distance = avgTriangleCount - this.perfData.preferredTriangleRange.max;
                    const decreaseAmount = Math.min(1000, Math.max(250, distance / 10));
                    this.perfData.triangleTarget = Math.max(
                        this.perfData.preferredTriangleRange.min,
                        this.perfData.triangleTarget - decreaseAmount
                    );
                } else {
                    // We're within the preferred range already!
                    // Make small adjustments based on FPS
                    if (avgFps > 55 && avgTriangleCount < this.perfData.preferredTriangleRange.max * 0.9) {
                        // Room to increase slightly within range
                        this.perfData.triangleTarget = Math.min(
                            this.perfData.preferredTriangleRange.max,
                            this.perfData.triangleTarget + 350
                        );
                    } else if (avgFps < 48 && avgTriangleCount > this.perfData.preferredTriangleRange.min * 1.1) {
                        // Need to decrease slightly within range
                        this.perfData.triangleTarget = Math.max(
                            this.perfData.preferredTriangleRange.min,
                            this.perfData.triangleTarget - 500
                        );
                    }
                }
            }
            
            // Final safety clamps to keep within absolute limits
            this.perfData.triangleTarget = Math.max(
                this.perfData.minTriangleTarget,
                Math.min(this.perfData.maxTriangleTarget, this.perfData.triangleTarget)
            );
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
        ctx.fillRect(5, 5, 280, 175); // Taller box for more info
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        ctx.fillText(`FPS: ${Math.round(this.perfData.fps)} / Target: ${this.perfData.targetFps}`, 10, 10);
        
        // Calculate average triangle count
        const avgTriangles = this.perfData.triangleHistory.length > 0 
            ? Math.round(this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length)
            : this.perfData.triangleCount;
            
        // Color-code triangle count based on preferred range
        if (this.perfData.triangleCount >= this.perfData.preferredTriangleRange.min && 
            this.perfData.triangleCount <= this.perfData.preferredTriangleRange.max) {
            ctx.fillStyle = '#00ff00'; // Green for in-range
        } else if (this.perfData.triangleCount < this.perfData.minTriangleTarget ||
                  this.perfData.triangleCount > this.perfData.maxTriangleTarget) {
            ctx.fillStyle = '#ff0000'; // Red for extreme values
        } else {
            ctx.fillStyle = '#ffcc00'; // Yellow for near-range
        }
        
        ctx.fillText(`Triangles: ${this.perfData.triangleCount} / Target: ${this.perfData.triangleTarget}`, 10, 25);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        // Show triangle range info
        ctx.fillText(`Preferred Range: ${this.perfData.preferredTriangleRange.min}-${this.perfData.preferredTriangleRange.max}`, 10, 40);
        
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
        
        ctx.fillText(`Detail Level: ${this.perfData.adaptiveDetail.toFixed(3)} → ${this.perfData.targetDetail.toFixed(3)}`, 10, 55);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        ctx.fillText(`Detail Areas: ${this.perfData.detailAreas}`, 10, 70);
        ctx.fillText(`Render Time: ${this.perfData.renderTime.toFixed(1)}ms`, 10, 85);
        
        // Show convergence status
        if (this.perfData.optimalDetailFound) {
            ctx.fillStyle = '#00ff00'; // Green for optimal
            ctx.fillText(`Status: OPTIMAL (Stability: ${this.perfData.stabilityCount})`, 10, 100);
            ctx.fillStyle = '#ffffff'; // Reset color
        } else {
            // Show whether we're converging toward the preferred range
            const movingTowardPreferred = (
                (this.perfData.triangleCount < this.perfData.preferredTriangleRange.min && 
                 this.perfData.lastDirection === 'up') ||
                (this.perfData.triangleCount > this.perfData.preferredTriangleRange.max && 
                 this.perfData.lastDirection === 'down')
            );
            
            ctx.fillStyle = movingTowardPreferred ? '#00ff00' : '#ffffff';
            ctx.fillText(`Status: ${movingTowardPreferred ? 'CONVERGING' : 'ADAPTING'} (${this.perfData.upCount}/${this.perfData.downCount})`, 10, 100);
            ctx.fillStyle = '#ffffff'; // Reset color
        }
        
        // Display last detail change
        if (this.perfData.detailHistory && this.perfData.detailHistory.length > 0) {
            const lastChange = this.perfData.detailHistory[this.perfData.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 115);
            
            // Show oscillation detection
            if (this.perfData.detailHistory.length >= 4) {
                const lastThreeChanges = [
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 1],
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 2],
                    this.perfData.detailHistory[this.perfData.detailHistory.length - 3]
                ];
                
                // Check for oscillation patterns
                let hasOscillation = false;
                for (let i = 0; i < lastThreeChanges.length - 1; i++) {
                    if ((lastThreeChanges[i].direction.includes('up') && lastThreeChanges[i+1].direction.includes('down')) ||
                        (lastThreeChanges[i].direction.includes('down') && lastThreeChanges[i+1].direction.includes('up'))) {
                        hasOscillation = true;
                        break;
                    }
                }
                
                ctx.fillStyle = hasOscillation ? '#ff0000' : '#00ff00';
                ctx.fillText(`Pattern: ${hasOscillation ? 'Oscillating' : 'Stable'}`, 10, 130);
                ctx.fillStyle = '#ffffff'; // Reset color
                
                // Show range analysis
                const avgTriCount = this.perfData.triangleHistory.length > 0 
                    ? Math.round(this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length)
                    : this.perfData.triangleCount;
                
                ctx.fillText(`Avg Triangles: ${avgTriCount}`, 10, 145);
            }
        }
        
        ctx.restore();
    }
}

export default PerformanceMonitor;