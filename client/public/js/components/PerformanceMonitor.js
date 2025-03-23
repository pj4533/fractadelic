// PerformanceMonitor class - Tracks and manages performance metrics
import { 
    calculateDetailLevel, 
    detectOscillation, 
    calculateMaxAllowedChange 
} from '../utils/PerformanceUtils.js';
import { 
    clamp, 
    safeValue, 
    calculateAverage, 
    exponentialMovingAverage 
} from '../utils/MathUtils.js';
import { PERFORMANCE } from '../utils/constants.js';

class PerformanceMonitor {
    constructor() {
        this.perfData = {
            lastFpsCheck: performance.now(),
            frameCount: 0,
            fps: 60,
            adaptiveDetail: 0.25,  // Start with lower detail level for better initial performance
            targetDetail: 0.25,    // Start at the same position
            lastTarget: 0.25,      // Track last target for trend analysis
            minFrameTime: 9999,    // Track best frame time (ms)
            fpsHistory: [],        // Track FPS history
            detailHistory: [],     // Track detail level changes
            triangleHistory: [],   // Track triangle count history for stability analysis
            highDetailMode: true,
            triangleCount: 0,
            triangleTarget: 15000, // Start with middle-ground target
            lastDetailChange: 0,   // Set to 0 to allow immediate adaptation
            renderTime: 0,
            detailAreas: 0,
            upCount: 0,            // Start neutral, not biased
            downCount: 0,          // Counter for consecutive decreases
            stabilityCount: 0,     // Track periods of stability
            optimalDetailFound: false, // Flag when we've found a good stable value
            targetFps: PERFORMANCE.targetFps,
            lastDirection: 'none', // Track last change direction to detect oscillation
            maxAllowedDetailChange: 0.25, // Starting value for maximum allowed change
            initialMaxAllowedDetailChange: 0.35, // Increased for faster convergence
            minAllowedDetailChange: 0.04, // Increased minimum change for faster adaptation
            minTriangleTarget: PERFORMANCE.minTriangleTarget,
            maxTriangleTarget: PERFORMANCE.maxTriangleTarget,
            preferredTriangleRange: PERFORMANCE.preferredTriangleRange,
            previousDetailLevels: [0.25, 0.25, 0.25], // Track previous levels for exponential smoothing
            smoothingFactor: 0.4,  // Reduced to increase smoothing and prevent oscillation
            stableThreshold: 0.005, // Threshold for considering a change significant
            oscillationBuffer: [], // Track recent direction changes to detect oscillation patterns
            deadZoneCounter: 0,    // Count frames spent in the dead zone (no changes)
            deadZoneThreshold: 15  // Increased frames to stay in dead zone to better break oscillation
        };
    }
    
    // Update FPS counter and metrics
    updateMetrics(triangleCount, detailAreaCount) {
        this.perfData.frameCount++;
        const now = performance.now();
        
        this.perfData.triangleCount = triangleCount;
        this.perfData.detailAreas = detailAreaCount;
        
        // Check even more frequently for faster adaptation (200ms)
        if (now - this.perfData.lastFpsCheck > 200) {
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
                const avgFps = calculateAverage(this.perfData.fpsHistory);
                
                // Make changes much more frequently for critical adaptations (200ms)
                const timeSinceLastChange = now - this.perfData.lastDetailChange;
                const readyForChange = timeSinceLastChange > 200;
                
                // Update triangle history for analysis
                this.updateTriangleHistory(this.perfData.triangleCount);
                
                // Enhanced adaptation logic with safeguards against extreme jumps
                if (readyForChange) {
                    // Calculate detail level changes based on metrics
                    const { 
                        data, 
                        targetDetail, 
                        changeDirection, 
                        changeReason 
                    } = calculateDetailLevel(
                        this.perfData,
                        avgFps,
                        this.perfData.triangleCount,
                        this.perfData.detailAreas
                    );
                    
                    // Update performance data with calculated results
                    this.perfData = data;
                    let baseTargetDetail = targetDetail;
                    
                    // CRITICAL: Dynamically calculate allowed change based on performance metrics
                    const adaptiveAvgFps = calculateAverage(this.perfData.fpsHistory);
                    const maxAllowedChange = calculateMaxAllowedChange(this.perfData, adaptiveAvgFps);
                    
                    // Update the current max allowed change value for reference
                    this.perfData.maxAllowedDetailChange = maxAllowedChange;
                    
                    // Now apply the dynamic limit
                    const currentDetail = this.perfData.adaptiveDetail;
                    let limitedTarget = baseTargetDetail;
                    
                    // Limit how much detail can change in one step
                    if (baseTargetDetail < currentDetail - maxAllowedChange) {
                        // Too big of an increase in detail (lower number = higher detail)
                        limitedTarget = currentDetail - maxAllowedChange;
                        this.perfData.targetDetail = limitedTarget;
                    } else if (baseTargetDetail > currentDetail + maxAllowedChange) {
                        // Too big of a decrease in detail
                        limitedTarget = currentDetail + maxAllowedChange;
                        this.perfData.targetDetail = limitedTarget;
                    } else {
                        this.perfData.targetDetail = baseTargetDetail;
                    }
                    
                    // Apply smoothing to prevent oscillations
                    // Use a weighted average of previous values
                    const previousAvg = calculateAverage(this.perfData.previousDetailLevels);
                    
                    // Apply exponential smoothing
                    const smoothedTarget = exponentialMovingAverage(
                        this.perfData.targetDetail,
                        previousAvg,
                        this.perfData.smoothingFactor
                    );
                                          
                    // Apply stronger safety bounds to target detail to avoid edge cases
                    // Ensure valid number and stay well away from potential problem values
                    const validTarget = safeValue(smoothedTarget, 0.5);
                    this.perfData.targetDetail = clamp(validTarget, 0.10, 0.95);
                    
                    // Update previous detail levels history for next smoothing
                    this.perfData.previousDetailLevels.push(this.perfData.targetDetail);
                    if (this.perfData.previousDetailLevels.length > 4) {
                        this.perfData.previousDetailLevels.shift();
                    }
                    
                    // Only record a direction change if we actually changed significantly
                    if (Math.abs(this.perfData.targetDetail - this.perfData.adaptiveDetail) > this.perfData.stableThreshold) {
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
            let adaptationRate = 0.5; // Increased default adaptation rate for faster response
            
            // Calculate how close we are to target FPS
            const avgFps = calculateAverage(this.perfData.fpsHistory);
            const fpsDistance = Math.abs(avgFps - this.perfData.targetFps);
            const nearTargetFps = fpsDistance <= 5; // Stricter definition of "near target" for faster adaptation
                
            // Prioritize stability and convergence over speed
            if (this.perfData.optimalDetailFound) {
                // Moderately slow adaptation when optimal settings are found, but not too slow
                adaptationRate = 0.2;
                
                // Check if we're in a very stable state (FPS in perfect range)
                const stableAvgFps = calculateAverage(this.perfData.fpsHistory);
                              
                if (stableAvgFps >= 31 && stableAvgFps <= 36) {
                    // In the perfect sweet spot - use moderately slow adaptation but still responsive enough
                    adaptationRate = 0.1;
                }
            } else if (nearTargetFps) {
                // When near the target FPS, move more quickly to reach target
                adaptationRate = 0.4;
            } else if (Math.abs(detailDiff) > 0.1) {
                // For very large changes, move a bit more cautiously but still with purpose
                adaptationRate = 0.35;
            } else if (this.perfData.detailHistory.length >= 3) {
                // Check for oscillation patterns
                if (detectOscillation(this.perfData)) {
                    // Detected oscillation - use slower adaptation but not too slow
                    adaptationRate = 0.25;
                }
            }
            
            // Apply the calculated adaptation rate with a smooth transition
            // Use a weighted moving average approach for smoother transitions
            const newDetail = this.perfData.adaptiveDetail + (detailDiff * adaptationRate);
            
            // Apply extra smoothing to prevent large jumps
            // Use heavier weight on existing value to dampen oscillations
            if (Math.abs(detailDiff) > 0.1) {
                // For big jumps, use heavily weighted average with previous value
                this.perfData.adaptiveDetail = exponentialMovingAverage(newDetail, this.perfData.adaptiveDetail, 0.3);
            } else if (Math.abs(detailDiff) > 0.02) {
                // For medium jumps, apply moderate smoothing
                this.perfData.adaptiveDetail = exponentialMovingAverage(newDetail, this.perfData.adaptiveDetail, 0.5);
            } else {
                // Even for small changes, apply some smoothing
                this.perfData.adaptiveDetail = exponentialMovingAverage(newDetail, this.perfData.adaptiveDetail, 0.7);
            }
            
            // Add strong safety bounds to prevent detail level issues
            // Use more restrictive bounds (0.10-0.95) to stay well away from edge cases
            // Also ensure we have a valid number (not NaN, Infinity, etc.)
            const validDetail = safeValue(this.perfData.adaptiveDetail, 0.5);
            this.perfData.adaptiveDetail = clamp(validDetail, 0.10, 0.95);
            
            // Add stability detection - if we're close to target, mark as stable
            if (Math.abs(detailDiff) < 0.02 && !this.perfData.optimalDetailFound) {
                // We've reached a stable point - check if it's good
                const stablePointFps = calculateAverage(this.perfData.fpsHistory);
                
                // Be more lenient about what we consider "optimal" to allow quicker stabilization
                if (stablePointFps >= 28 && stablePointFps <= 42) {
                    this.perfData.optimalDetailFound = true;
                    console.log(`Optimal detail level found: ${this.perfData.adaptiveDetail.toFixed(4)}`);
                }
            }
            
            console.log(`Detail adapted: ${this.perfData.adaptiveDetail.toFixed(4)}, target: ${this.perfData.targetDetail.toFixed(4)}, triangles: ${this.perfData.triangleCount}, optimal: ${this.perfData.optimalDetailFound}`);
            
            // Track average FPS
            const averageFps = calculateAverage(this.perfData.fpsHistory);
            
            // Calculate average triangle count from history
            const avgTriangleCount = this.perfData.triangleHistory.length > 0 
                ? calculateAverage(this.perfData.triangleHistory)
                : this.perfData.triangleCount;
            
            // Triangle target adjustment with preference for mid-range values
            this.adjustTriangleTarget(averageFps, avgTriangleCount);
        }
    }
    
    // Adjust triangle target based on performance
    adjustTriangleTarget(averageFps, avgTriangleCount) {
        if (this.perfData.optimalDetailFound) {
            // Once optimal is found, make only very small adjustments
            if (averageFps > 37 && avgTriangleCount < this.perfData.preferredTriangleRange.max) {
                // Small increases when performance is good
                this.perfData.triangleTarget = Math.min(
                    this.perfData.maxTriangleTarget, 
                    this.perfData.triangleTarget + 250
                );
            } else if (averageFps < 30) {
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
                if (averageFps > 32) {
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
                if (averageFps > 37 && avgTriangleCount < this.perfData.preferredTriangleRange.max * 0.9) {
                    // Room to increase slightly within range
                    this.perfData.triangleTarget = Math.min(
                        this.perfData.preferredTriangleRange.max,
                        this.perfData.triangleTarget + 350
                    );
                } else if (averageFps < 32 && avgTriangleCount > this.perfData.preferredTriangleRange.min * 1.1) {
                    // Need to decrease slightly within range
                    this.perfData.triangleTarget = Math.max(
                        this.perfData.preferredTriangleRange.min,
                        this.perfData.triangleTarget - 500
                    );
                }
            }
        }
        
        // Final safety clamps to keep within absolute limits
        this.perfData.triangleTarget = clamp(
            this.perfData.triangleTarget, 
            this.perfData.minTriangleTarget, 
            this.perfData.maxTriangleTarget
        );
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
        ctx.fillRect(5, 5, 280, 195); // Taller box for more info
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        const avgDisplayFps = this.perfData.fpsHistory.length > 0 
            ? Math.round(calculateAverage(this.perfData.fpsHistory))
            : Math.round(this.perfData.fps);
        ctx.fillText(`FPS: ${Math.round(this.perfData.fps)} (avg: ${avgDisplayFps})`, 10, 10);
        
        // Calculate average triangle count
        const avgTriangles = this.perfData.triangleHistory.length > 0 
            ? Math.round(calculateAverage(this.perfData.triangleHistory))
            : this.perfData.triangleCount;
            
        // Color-code triangle count based on FPS distance from target
        const uiFps = this.perfData.fpsHistory.length > 0 
            ? calculateAverage(this.perfData.fpsHistory)
            : this.perfData.fps;
        const fpsDiff = Math.abs(uiFps - this.perfData.targetFps);
        
        if (fpsDiff <= 3) {
            ctx.fillStyle = '#00ff00'; // Green for close to target
        } else if (fpsDiff > 10) {
            ctx.fillStyle = '#ff0000'; // Red for far from target
        } else {
            ctx.fillStyle = '#ffcc00'; // Yellow for moderate distance
        }
        
        ctx.fillText(`Triangles: ${this.perfData.triangleCount} / Target: ${this.perfData.triangleTarget}`, 10, 25);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        // Show target FPS info - use average FPS for more stable display
        const avgUIFps = this.perfData.fpsHistory.length > 0 
            ? calculateAverage(this.perfData.fpsHistory)
            : this.perfData.fps;
        const fpsDistance = Math.abs(Math.round(avgUIFps) - this.perfData.targetFps);
        ctx.fillText(`Target FPS: ${this.perfData.targetFps} (diff: ${fpsDistance})`, 10, 40);
        
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
        
        // Show allowed change limit - useful for debugging
        ctx.fillText(`Max Change: ${this.perfData.maxAllowedDetailChange.toFixed(3)}`, 10, 70);
        
        ctx.fillText(`Detail Areas: ${this.perfData.detailAreas}`, 10, 85);
        ctx.fillText(`Render Time: ${this.perfData.renderTime.toFixed(1)}ms`, 10, 100);
        
        // Show convergence status
        if (this.perfData.optimalDetailFound) {
            ctx.fillStyle = '#00ff00'; // Green for optimal
            ctx.fillText(`Status: OPTIMAL (Stability: ${this.perfData.stabilityCount})`, 10, 115);
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
            ctx.fillText(`Status: ${movingTowardPreferred ? 'CONVERGING' : 'ADAPTING'} (${this.perfData.upCount}/${this.perfData.downCount})`, 10, 115);
            ctx.fillStyle = '#ffffff'; // Reset color
        }
        
        // Display last detail change
        if (this.perfData.detailHistory && this.perfData.detailHistory.length > 0) {
            const lastChange = this.perfData.detailHistory[this.perfData.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 130);
            
            // Show oscillation detection
            if (this.perfData.detailHistory.length >= 4) {
                const isOscillating = detectOscillation(this.perfData);
                
                ctx.fillStyle = isOscillating ? '#ff0000' : '#00ff00';
                ctx.fillText(`Pattern: ${isOscillating ? 'Oscillating' : 'Stable'}`, 10, 145);
                ctx.fillStyle = '#ffffff'; // Reset color
                
                // Show range analysis
                const avgTriCount = this.perfData.triangleHistory.length > 0 
                    ? Math.round(calculateAverage(this.perfData.triangleHistory))
                    : this.perfData.triangleCount;
                
                ctx.fillText(`Avg Triangles: ${avgTriCount}`, 10, 160);
                
                // Add deadzone information if relevant
                if (this.perfData.deadZoneCounter > 0) {
                    ctx.fillStyle = '#ffcc00'; // Gold for deadzone
                    ctx.fillText(`Deadzone: ${this.perfData.deadZoneCounter}/${this.perfData.deadZoneThreshold}`, 10, 175);
                    ctx.fillStyle = '#ffffff'; // Reset color
                }
            }
        }
        
        ctx.restore();
    }
}

export default PerformanceMonitor;