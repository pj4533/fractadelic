// Performance monitoring and optimization utilities
import { clamp, safeValue, calculateAverage, exponentialMovingAverage } from './MathUtils.js';
import { PERFORMANCE } from './constants.js';

/**
 * Calculates detail level based on FPS and current performance metrics
 * @param {Object} perfData - Performance data object
 * @param {number} avgFps - Current average FPS
 * @param {number} triangleCount - Current triangle count
 * @param {number} detailAreaCount - Current detail area count
 * @returns {Object} Updated performance data and calculated detail level
 */
export const calculateDetailLevel = (perfData, avgFps, triangleCount, detailAreaCount) => {
    // Safety cloning
    const data = { ...perfData };
    
    // Figure out if we're oscillating
    const isOscillating = detectOscillation(data);
    
    // Calculate detail change based on FPS
    let targetDetail = data.adaptiveDetail;
    let changeDirection = "none";
    let changeReason = "";
    
    // Check if we're in the optimal FPS range
    const inOptimalFpsRange = avgFps >= PERFORMANCE.targetFps - 5 && avgFps <= PERFORMANCE.targetFps + 5;
    
    // Check for extreme values
    const atExtremeLow = triangleCount < PERFORMANCE.minTriangleTarget;
    const atExtremeHigh = triangleCount > PERFORMANCE.maxTriangleTarget;
    
    // Apply dead zone more aggressively - even when not in optimal FPS range, if oscillating
    if (isOscillating) {
        data.deadZoneCounter++;
        
        // If we've been in dead zone long enough, we can exit
        if (data.deadZoneCounter >= data.deadZoneThreshold) {
            // Reset counter but proceed with normal adjustments
            data.deadZoneCounter = 0;
        } else {
            // Skip making any adjustments to break the oscillation cycle
            // Set target to current value to prevent change
            targetDetail = data.adaptiveDetail;
            changeDirection = "stable";
            changeReason = "deadzone";
            return { data, targetDetail, changeDirection, changeReason };
        }
    } else {
        // Not in dead zone, reset counter
        data.deadZoneCounter = 0;
    
        // If we're at extreme values, prioritize moving away from extremes
        if (atExtremeLow) {
            // We're too low, increase detail regardless of FPS (unless critically low FPS)
            if (avgFps > 35) {
                targetDetail = Math.max(0.08, data.adaptiveDetail * 0.85);
                changeDirection = "up";
                changeReason = "extreme-low";
            }
        } else if (atExtremeHigh) {
            // We're too high, decrease detail moderately (less aggressive to prevent overshoot)
            if (avgFps < 58) {
                targetDetail = data.adaptiveDetail * 1.3;
                changeDirection = "down";
                changeReason = "extreme-high";
            }
        }
        // If we're already in a good FPS range, make refinement decisions
        else if (inOptimalFpsRange) {
            if (avgFps < 30) {
                // FPS is too low, reduce detail moderately
                targetDetail = data.adaptiveDetail * 1.25;
                changeDirection = "down";
                changeReason = "fps-low";
            } else if (avgFps > 38 && avgFps < 45) {
                // FPS is good but we have headroom, increase detail slightly
                targetDetail = Math.max(0.08, data.adaptiveDetail * 0.95);
                changeDirection = "up";
                changeReason = "fps-high";
            } else if (avgFps >= 30 && avgFps <= 38) {
                // Perfect FPS range - mark as optimal
                data.optimalDetailFound = true;
                data.stabilityCount++;
                changeDirection = "stable";
                changeReason = "optimal";
                
                // When in optimal range, make more aggressive adjustments
                if (avgFps > 36) {
                    // More significant adjustment when FPS is getting too high
                    targetDetail = Math.max(0.08, data.adaptiveDetail * 0.98);
                } else if (avgFps < 31) {
                    // More significant adjustment when FPS is getting too low
                    targetDetail = data.adaptiveDetail * 1.02;
                } else {
                    // In the perfect sweet spot (31-36 FPS) - make very small adjustment
                    if (avgFps > 34) {
                        targetDetail = Math.max(0.08, data.adaptiveDetail * 0.998);
                    } else if (avgFps < 33) {
                        targetDetail = data.adaptiveDetail * 1.002;
                    } else {
                        targetDetail = data.adaptiveDetail;
                    }
                }
            }
        }
        // Not in preferred range but not at extremes either
        else {
            // If we're too high in triangle count but FPS is good
            if (triangleCount > PERFORMANCE.preferredTriangleRange.max && avgFps > 55) {
                // We have room to stay here, but prefer to move toward preferred range
                targetDetail = data.adaptiveDetail * 1.1;
                changeDirection = "down";
                changeReason = "preferred-range";
            } 
            // If we're too low in triangle count and FPS is marginal
            else if (triangleCount < PERFORMANCE.preferredTriangleRange.min && avgFps > 50) {
                // Move toward preferred range
                targetDetail = Math.max(0.08, data.adaptiveDetail * 0.9);
                changeDirection = "up";
                changeReason = "preferred-range";
            }
            // Otherwise make FPS-based decisions
            else if (avgFps < 45) {
                // FPS too low - reduce detail moderately
                targetDetail = data.adaptiveDetail * 1.2;
                changeDirection = "down";
                changeReason = "fps-too-low";
            } else if (avgFps > 58) {
                // FPS excellent - increase detail moderately
                targetDetail = Math.max(0.08, data.adaptiveDetail * 0.85);
                changeDirection = "up";
                changeReason = "fps-excellent";
            } else if (avgFps >= 45 && avgFps < 50) {
                // FPS marginal - moderate reduction
                targetDetail = data.adaptiveDetail * 1.15;
                changeDirection = "down";
                changeReason = "fps-marginal";
            } else if (avgFps >= 50 && avgFps < 55) {
                // FPS good - slight increase
                targetDetail = Math.max(0.08, data.adaptiveDetail * 0.95);
                changeDirection = "up";
                changeReason = "fps-good";
            }
        }
    }
    
    return { data, targetDetail, changeDirection, changeReason };
};

/**
 * Detects oscillation patterns in detail level changes
 * @param {Object} perfData - Performance data object
 * @returns {boolean} True if oscillating
 */
export const detectOscillation = (perfData) => {
    // Check if current detail level is at the extremes of our scale
    const isAtExtreme = perfData.adaptiveDetail <= 0.15 || perfData.adaptiveDetail >= 0.90;
    
    // Always consider oscillating if we're at extreme values to prevent edge bouncing
    if (isAtExtreme) {
        return true;
    }
    
    // Normal oscillation pattern detection
    if (perfData.detailHistory.length >= 3) {
        // Get the last few changes
        const recentChanges = perfData.detailHistory.slice(-3);
        
        // Look for any alternating direction changes, more sensitive detection
        for (let i = 0; i < recentChanges.length - 1; i++) {
            if ((recentChanges[i].direction.includes('up') && 
                 recentChanges[i+1].direction.includes('down')) ||
                (recentChanges[i].direction.includes('down') && 
                 recentChanges[i+1].direction.includes('up'))) {
                return true;
            }
        }
        
        // Also detect large jumps in detail level as oscillation
        if (recentChanges.length >= 2) {
            const lastChange = Math.abs(recentChanges[recentChanges.length-1].detail - 
                                      recentChanges[recentChanges.length-2].detail);
            if (lastChange > 0.10) {
                return true;
            }
        }
    }
    
    return false;
};

/**
 * Calculates dynamic maximum allowed change based on performance state
 * @param {Object} perfData - Performance data object
 * @param {number} avgFps - Current average FPS
 * @returns {number} Maximum allowed detail change
 */
export const calculateMaxAllowedChange = (perfData, avgFps) => {
    // Calculate distance from target FPS as a ratio
    const fpsDistance = Math.abs(avgFps - PERFORMANCE.targetFps) / PERFORMANCE.targetFps;
    
    // Calculate based on convergence state
    if (perfData.optimalDetailFound) {
        // Very small changes allowed once optimal is found
        return perfData.minAllowedDetailChange;
    }
    
    // Calculate stability factor
    let stabilityFactor = 0;
    if (perfData.fpsHistory.length >= 3) {
        const recent = perfData.fpsHistory.slice(-3);
        const fpsVariance = Math.max(...recent) - Math.min(...recent);
        // Lower variance = higher stability (0-1)
        stabilityFactor = clamp(1 - (fpsVariance / 15), 0, 1);
    }
    
    // Calculate a base scaling factor from FPS distance (further = more change)
    // Use an extremely aggressive non-linear curve to make much larger changes for FPS differences
    const distanceFactor = clamp(Math.pow(fpsDistance * 3.0, 1.9), 0, 1);
    
    // Combine factors, weighting stability more as we get more samples
    const finalFactor = perfData.fpsHistory.length >= 3 
        ? (distanceFactor * 0.7) + (0.3 * (1 - stabilityFactor))  
        : distanceFactor;
        
    // Scale between min and max allowed change
    let maxAllowedChange = perfData.minAllowedDetailChange + 
        (perfData.initialMaxAllowedDetailChange - perfData.minAllowedDetailChange) * finalFactor;
        
    // If average FPS is much lower than target (below 20), allow even larger changes
    if (avgFps < 20) {
        // Allow much larger jumps when FPS is critically low
        maxAllowedChange = Math.max(maxAllowedChange, 0.5);
    }
    
    return maxAllowedChange;
};