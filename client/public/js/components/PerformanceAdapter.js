// PerformanceAdapter - Handles detail level adaptation based on performance metrics
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

class PerformanceAdapter {
    constructor(metrics) {
        this.metrics = metrics;
    }
    
    // Core adaptation logic - updates metrics.adaptiveDetail based on current performance
    adapt(now) {
        const metrics = this.metrics;
        const avgFps = metrics.getAverageFPS();
        
        // Only process if we have enough history to make decisions
        if (metrics.fpsHistory.length < 2) {
            return;
        }
        
        // Update triangle history for analysis
        metrics.updateTriangleHistory(metrics.triangleCount);
        
        // Make changes much more frequently for critical adaptations (200ms)
        const timeSinceLastChange = now - metrics.lastDetailChange;
        const readyForChange = timeSinceLastChange > 200;
        
        // Enhanced adaptation logic with safeguards against extreme jumps
        if (readyForChange) {
            // Calculate detail level changes based on metrics
            const { 
                data, 
                targetDetail, 
                changeDirection, 
                changeReason 
            } = calculateDetailLevel(
                metrics,
                avgFps,
                metrics.triangleCount,
                metrics.detailAreas
            );
            
            // Update metrics with calculated results
            Object.assign(metrics, data);
            let baseTargetDetail = targetDetail;
            
            // CRITICAL: Dynamically calculate allowed change based on performance metrics
            const adaptiveAvgFps = calculateAverage(metrics.fpsHistory);
            const maxAllowedChange = calculateMaxAllowedChange(metrics, adaptiveAvgFps);
            
            // Update the current max allowed change value for reference
            metrics.maxAllowedDetailChange = maxAllowedChange;
            
            // Apply the dynamic limit
            const currentDetail = metrics.adaptiveDetail;
            let limitedTarget = baseTargetDetail;
            
            // Limit how much detail can change in one step
            if (baseTargetDetail < currentDetail - maxAllowedChange) {
                // Too big of an increase in detail (lower number = higher detail)
                limitedTarget = currentDetail - maxAllowedChange;
                metrics.targetDetail = limitedTarget;
            } else if (baseTargetDetail > currentDetail + maxAllowedChange) {
                // Too big of a decrease in detail
                limitedTarget = currentDetail + maxAllowedChange;
                metrics.targetDetail = limitedTarget;
            } else {
                metrics.targetDetail = baseTargetDetail;
            }
            
            // Apply smoothing to prevent oscillations
            // Use a weighted average of previous values
            const previousAvg = calculateAverage(metrics.previousDetailLevels);
            
            // Apply exponential smoothing
            const smoothedTarget = exponentialMovingAverage(
                metrics.targetDetail,
                previousAvg,
                metrics.smoothingFactor
            );
                                  
            // Apply stronger safety bounds to target detail to avoid edge cases
            // Ensure valid number and stay well away from potential problem values
            const validTarget = safeValue(smoothedTarget, 0.5);
            metrics.targetDetail = clamp(validTarget, 0.10, 0.95);
            
            // Update previous detail levels history for next smoothing
            metrics.previousDetailLevels.push(metrics.targetDetail);
            if (metrics.previousDetailLevels.length > 4) {
                metrics.previousDetailLevels.shift();
            }
            
            // Only record a direction change if we actually changed significantly
            if (Math.abs(metrics.targetDetail - metrics.adaptiveDetail) > metrics.stableThreshold) {
                // Record the change
                metrics.recordDetailChange(now, metrics.targetDetail, changeDirection, avgFps);
            }
        }
        
        this.adjustAdaptiveDetail();
        this.adjustTriangleTarget(avgFps);
    }
    
    // Adjust adaptiveDetail to move toward targetDetail with appropriate smoothing
    adjustAdaptiveDetail() {
        const metrics = this.metrics;
        const detailDiff = metrics.targetDetail - metrics.adaptiveDetail;
        
        // Adjust adaptation rate based on state
        let adaptationRate = 0.5; // Increased default adaptation rate for faster response
        
        // Calculate how close we are to target FPS
        const avgFps = metrics.getAverageFPS();
        const fpsDistance = Math.abs(avgFps - metrics.targetFps);
        const nearTargetFps = fpsDistance <= 5; // Stricter definition of "near target" for faster adaptation
            
        // Prioritize stability and convergence over speed, but with better handling of high FPS
        if (metrics.optimalDetailFound) {
            // Moderately slow adaptation when optimal settings are found, but not too slow
            adaptationRate = 0.2;
            
            // Check if we're in a very stable state (FPS in perfect range)
            const stableAvgFps = avgFps;
            
            // Reset optimal flag if we've drifted too far from target
            if (stableAvgFps > 55 || stableAvgFps < 25) {
                // We've drifted too far, need to reset optimization state
                metrics.optimalDetailFound = false;
                console.log("Resetting optimal detail flag due to FPS drift:", stableAvgFps);
                // Use faster adaptation to get back on track
                adaptationRate = 0.5;
            }
            else if (stableAvgFps >= 31 && stableAvgFps <= 36) {
                // In the perfect sweet spot - use moderately slow adaptation but still responsive enough
                adaptationRate = 0.1;
            }
            else if (stableAvgFps > 45) {
                // We're running faster than needed, increase adaptation rate
                adaptationRate = 0.35;
            }
        } else if (nearTargetFps) {
            // When near the target FPS, move more quickly to reach target
            adaptationRate = 0.4;
        } else if (Math.abs(detailDiff) > 0.1) {
            // For very large changes, move a bit more cautiously but still with purpose
            adaptationRate = 0.35;
        } else if (metrics.detailHistory.length >= 3) {
            // Check for oscillation patterns
            if (detectOscillation(metrics)) {
                // Detected oscillation - use slower adaptation but not too slow
                adaptationRate = 0.25;
            }
        }
        
        // Special handling for high FPS case to prevent getting stuck
        if (avgFps > 50 && Math.abs(detailDiff) < 0.02) {
            // We're at high FPS with very small detail difference - force minimum change
            adaptationRate = Math.max(adaptationRate, 0.3);
        }
        
        // Apply the calculated adaptation rate with a smooth transition
        // Use a weighted moving average approach for smoother transitions
        const newDetail = metrics.adaptiveDetail + (detailDiff * adaptationRate);
        
        // Apply extra smoothing to prevent large jumps
        // Use heavier weight on existing value to dampen oscillations
        if (Math.abs(detailDiff) > 0.1) {
            // For big jumps, use heavily weighted average with previous value
            metrics.adaptiveDetail = exponentialMovingAverage(newDetail, metrics.adaptiveDetail, 0.3);
        } else if (Math.abs(detailDiff) > 0.02) {
            // For medium jumps, apply moderate smoothing
            metrics.adaptiveDetail = exponentialMovingAverage(newDetail, metrics.adaptiveDetail, 0.5);
        } else {
            // Even for small changes, apply some smoothing
            metrics.adaptiveDetail = exponentialMovingAverage(newDetail, metrics.adaptiveDetail, 0.7);
        }
        
        // Add strong safety bounds to prevent detail level issues
        // Use more restrictive bounds (0.10-0.95) to stay well away from edge cases
        // Also ensure we have a valid number (not NaN, Infinity, etc.)
        const validDetail = safeValue(metrics.adaptiveDetail, 0.5);
        metrics.adaptiveDetail = clamp(validDetail, 0.10, 0.95);
        
        // Add stability detection - if we're close to target, mark as stable
        if (Math.abs(detailDiff) < 0.02 && !metrics.optimalDetailFound) {
            // We've reached a stable point - check if it's good
            const stablePointFps = avgFps;
            
            // Be more lenient about what we consider "optimal" to allow quicker stabilization
            if (stablePointFps >= 28 && stablePointFps <= 42) {
                metrics.optimalDetailFound = true;
                console.log(`Optimal detail level found: ${metrics.adaptiveDetail.toFixed(4)}`);
            }
        }
    }
    
    // Adjust triangle target based on performance
    adjustTriangleTarget(averageFps) {
        const metrics = this.metrics;
        
        // Calculate average triangle count from history
        const avgTriangleCount = metrics.triangleHistory.length > 0 
            ? calculateAverage(metrics.triangleHistory)
            : metrics.triangleCount;
            
        if (metrics.optimalDetailFound) {
            // Once optimal is found, make only very small adjustments
            if (averageFps > 37 && avgTriangleCount < metrics.preferredTriangleRange.max) {
                // Small increases when performance is good
                metrics.triangleTarget = Math.min(
                    metrics.maxTriangleTarget, 
                    metrics.triangleTarget + 250
                );
            } else if (averageFps < 30) {
                // Small decreases when approaching performance limits
                metrics.triangleTarget = Math.max(
                    metrics.minTriangleTarget,
                    metrics.triangleTarget - 500
                );
            }
            // If we're in the sweet spot, don't change anything
        } else {
            // While converging, prioritize moving toward preferred range
            if (avgTriangleCount < metrics.preferredTriangleRange.min) {
                // Below preferred range - increase carefully if FPS allows
                if (averageFps > 32) {
                    // Increase toward preferred range, faster when further away
                    const distance = metrics.preferredTriangleRange.min - avgTriangleCount;
                    const increaseAmount = Math.min(750, Math.max(250, distance / 15));
                    metrics.triangleTarget = Math.min(
                        metrics.preferredTriangleRange.max,
                        metrics.triangleTarget + increaseAmount
                    );
                }
            } else if (avgTriangleCount > metrics.preferredTriangleRange.max) {
                // Above preferred range - decrease carefully
                // Even if FPS is good, prefer to stay in the ideal range
                const distance = avgTriangleCount - metrics.preferredTriangleRange.max;
                const decreaseAmount = Math.min(1000, Math.max(250, distance / 10));
                metrics.triangleTarget = Math.max(
                    metrics.preferredTriangleRange.min,
                    metrics.triangleTarget - decreaseAmount
                );
            } else {
                // We're within the preferred range already!
                // Make small adjustments based on FPS
                if (averageFps > 37 && avgTriangleCount < metrics.preferredTriangleRange.max * 0.9) {
                    // Room to increase slightly within range
                    metrics.triangleTarget = Math.min(
                        metrics.preferredTriangleRange.max,
                        metrics.triangleTarget + 350
                    );
                } else if (averageFps < 32 && avgTriangleCount > metrics.preferredTriangleRange.min * 1.1) {
                    // Need to decrease slightly within range
                    metrics.triangleTarget = Math.max(
                        metrics.preferredTriangleRange.min,
                        metrics.triangleTarget - 500
                    );
                }
            }
        }
        
        // Final safety clamps to keep within absolute limits
        metrics.triangleTarget = clamp(
            metrics.triangleTarget, 
            metrics.minTriangleTarget, 
            metrics.maxTriangleTarget
        );
    }
}

export default PerformanceAdapter;