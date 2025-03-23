// PerformanceMonitor class - Tracks and manages performance metrics
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
            triangleTarget: 15000, // Start with middle-ground target (avoid extremes)
            lastDetailChange: 0,   // Set to 0 to allow immediate adaptation
            renderTime: 0,
            detailAreas: 0,
            upCount: 0,            // Start neutral, not biased
            downCount: 0,          // Counter for consecutive decreases
            stabilityCount: 0,     // Track periods of stability
            optimalDetailFound: false, // Flag when we've found a good stable value
            targetFps: 35,         // Target FPS for optimal experience
            lastDirection: 'none', // Track last change direction to detect oscillation
            maxAllowedDetailChange: 0.25, // Starting value for maximum allowed change - will adapt based on convergence
            initialMaxAllowedDetailChange: 0.35, // Increased for faster convergence
            minAllowedDetailChange: 0.04, // Increased minimum change for faster adaptation
            minTriangleTarget: 6000,     // Lower minimum acceptable triangle count
            maxTriangleTarget: 16000,    // Lower maximum acceptable triangle count
            preferredTriangleRange: {min: 8000, max: 14000}, // Lower ideal range to stabilize within
            previousDetailLevels: [0.25, 0.25, 0.25], // Track previous levels for exponential smoothing
            smoothingFactor: 0.6,  // Increased to make adaptations more responsive (higher value = less smoothing)
            stableThreshold: 0.005, // Threshold for considering a change significant
            oscillationBuffer: [], // Track recent direction changes to detect oscillation patterns
            deadZoneCounter: 0,    // Count frames spent in the dead zone (no changes)
            deadZoneThreshold: 10  // Number of frames to stay in dead zone before allowing changes
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
                const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.perfData.fpsHistory.length;
                
                // Make changes much more frequently for critical adaptations (200ms)
                const timeSinceLastChange = now - this.perfData.lastDetailChange;
                const readyForChange = timeSinceLastChange > 200;
                
                // Check for oscillation patterns
                const isOscillating = this.perfData.detailHistory.length >= 4 && 
                    ((this.perfData.lastDirection === 'up' && avgFps < 45) || 
                     (this.perfData.lastDirection === 'down' && avgFps > 55));
                
                // Update triangle history for analysis
                this.updateTriangleHistory(this.perfData.triangleCount);
                
                // Calculate if we're near optimal FPS instead of using fixed triangle range
                const currentAvgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                                     this.perfData.fpsHistory.length;
                const inOptimalFpsRange = currentAvgFps >= this.perfData.targetFps - 5 && currentAvgFps <= this.perfData.targetFps + 5;
                
                // Check for extreme values to avoid
                const atExtremeLow = this.perfData.triangleCount < this.perfData.minTriangleTarget;
                const atExtremeHigh = this.perfData.triangleCount > this.perfData.maxTriangleTarget;
                
                // Enhanced adaptation logic with safeguards against extreme jumps
                if (readyForChange) {
                    // Calculate a base target based on FPS
                    let baseTargetDetail = this.perfData.adaptiveDetail;
                    let changeDirection = "none";
                    let changeReason = "";
                    
                    // Detect oscillation pattern
                    let isOscillating = false;
                    if (this.perfData.detailHistory.length >= 4) {
                        // Get the last few changes
                        const recentChanges = this.perfData.detailHistory.slice(-4);
                        // Look for up-down-up or down-up-down patterns
                        for (let i = 0; i < recentChanges.length - 2; i++) {
                            if ((recentChanges[i].direction.includes('up') && 
                                 recentChanges[i+1].direction.includes('down') && 
                                 recentChanges[i+2].direction.includes('up')) ||
                                (recentChanges[i].direction.includes('down') && 
                                 recentChanges[i+1].direction.includes('up') && 
                                 recentChanges[i+2].direction.includes('down'))) {
                                isOscillating = true;
                                break;
                            }
                        }
                    }
                    
                    // If we're oscillating and already in a good range, apply a "dead zone" to break the cycle
                    if (isOscillating && inOptimalFpsRange) {
                        this.perfData.deadZoneCounter++;
                        
                        // If we've been in dead zone long enough, we can exit
                        if (this.perfData.deadZoneCounter >= this.perfData.deadZoneThreshold) {
                            // Reset counter but proceed with normal adjustments
                            this.perfData.deadZoneCounter = 0;
                        } else {
                            // Skip making any adjustments to break the oscillation cycle
                            // Set target to current value to prevent change
                            baseTargetDetail = this.perfData.adaptiveDetail;
                            changeDirection = "stable";
                            changeReason = "deadzone";
                        }
                    } else {
                        // Not in dead zone, reset counter
                        this.perfData.deadZoneCounter = 0;
                    
                        // If we're at extreme values, prioritize moving away from extremes
                        if (atExtremeLow) {
                            // We're too low, increase detail regardless of FPS (unless critically low FPS)
                            if (avgFps > 35) {
                                baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.85);
                                changeDirection = "up";
                                changeReason = "extreme-low";
                            }
                        } else if (atExtremeHigh) {
                            // We're too high, decrease detail much more aggressively
                            if (avgFps < 58) {
                                baseTargetDetail = this.perfData.adaptiveDetail * 1.6;
                                changeDirection = "down";
                                changeReason = "extreme-high";
                            }
                        }
                        // If we're already in a good FPS range, make refinement decisions
                        else if (inOptimalFpsRange) {
                            if (currentAvgFps < 30) {
                                // FPS is too low, reduce detail much more aggressively
                                baseTargetDetail = this.perfData.adaptiveDetail * 1.35;
                                changeDirection = "down";
                                changeReason = "fps-low";
                            } else if (currentAvgFps > 38 && currentAvgFps < 45) {
                                // FPS is good but we have headroom, increase detail slightly
                                baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.95);
                                changeDirection = "up";
                                changeReason = "fps-high";
                            } else if (currentAvgFps >= 30 && currentAvgFps <= 38) {
                                // Perfect FPS range - mark as optimal
                                this.perfData.optimalDetailFound = true;
                                this.perfData.stabilityCount++;
                                changeDirection = "stable";
                                changeReason = "optimal";
                                
                                // When in optimal range, make more aggressive adjustments
                                if (currentAvgFps > 36) {
                                    // More significant adjustment when FPS is getting too high
                                    baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.98);
                                } else if (currentAvgFps < 31) {
                                    // More significant adjustment when FPS is getting too low
                                    baseTargetDetail = this.perfData.adaptiveDetail * 1.02;
                                } else {
                                    // In the perfect sweet spot (31-36 FPS) - make very small adjustment
                                    if (currentAvgFps > 34) {
                                        baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.998);
                                    } else if (currentAvgFps < 33) {
                                        baseTargetDetail = this.perfData.adaptiveDetail * 1.002;
                                    } else {
                                        baseTargetDetail = this.perfData.adaptiveDetail;
                                    }
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
                                // FPS too low - reduce detail much more aggressively
                                baseTargetDetail = this.perfData.adaptiveDetail * 1.4;
                                changeDirection = "down";
                                changeReason = "fps-too-low";
                            } else if (avgFps > 58) {
                                // FPS excellent - increase detail moderately
                                baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.85);
                                changeDirection = "up";
                                changeReason = "fps-excellent";
                            } else if (avgFps >= 45 && avgFps < 50) {
                                // FPS marginal - more significant reduction
                                baseTargetDetail = this.perfData.adaptiveDetail * 1.25;
                                changeDirection = "down";
                                changeReason = "fps-marginal";
                            } else if (avgFps >= 50 && avgFps < 55) {
                                // FPS good - slight increase
                                baseTargetDetail = Math.max(0.08, this.perfData.adaptiveDetail * 0.95);
                                changeDirection = "up";
                                changeReason = "fps-good";
                            }
                        }
                    }
                    
                    // CRITICAL: Dynamically calculate allowed change based on performance metrics
                    // Calculate how far we are from optimal FPS
                    const adaptiveAvgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                                         this.perfData.fpsHistory.length;
                    
                    // Calculate distance from target FPS as a ratio (0-1)
                    const fpsDistance = Math.abs(adaptiveAvgFps - this.perfData.targetFps) / this.perfData.targetFps;
                    
                    // Scale max allowed change based on FPS performance and convergence state
                    let maxAllowedChange;
                    
                    if (this.perfData.optimalDetailFound) {
                        // Very small changes allowed once optimal is found
                        maxAllowedChange = this.perfData.minAllowedDetailChange;
                    } else {
                        // Calculate how stable our FPS has been (stability = less change needed)
                        let stabilityFactor = 0;
                        if (this.perfData.fpsHistory.length >= 3) {
                            const recent = this.perfData.fpsHistory.slice(-3);
                            const fpsVariance = Math.max(...recent) - Math.min(...recent);
                            // Lower variance = higher stability (0-1)
                            stabilityFactor = Math.min(1, Math.max(0, 1 - (fpsVariance / 15)));
                        }
                        
                        // Calculate a base scaling factor from FPS distance (further = more change)
                        // Use an extremely aggressive non-linear curve to make much larger changes for FPS differences
                        const distanceFactor = Math.min(1, Math.pow(fpsDistance * 3.0, 1.9));
                        
                        // Combine factors, weighting stability more as we get more samples
                        const finalFactor = this.perfData.fpsHistory.length >= 3 
                            ? (distanceFactor * 0.7) + (0.3 * (1 - stabilityFactor))  
                            : distanceFactor;
                            
                        // Scale between min and max allowed change
                        maxAllowedChange = this.perfData.minAllowedDetailChange + 
                            (this.perfData.initialMaxAllowedDetailChange - this.perfData.minAllowedDetailChange) * finalFactor;
                    }
                    
                    // Update the current max allowed change value for reference
                    // If average FPS is much lower than target (below 20), allow even larger changes
                    if (adaptiveAvgFps < 20) {
                        // Allow much larger jumps when FPS is critically low
                        maxAllowedChange = Math.max(maxAllowedChange, 0.5);
                    }
                    this.perfData.maxAllowedDetailChange = maxAllowedChange;
                    
                    // Now apply the dynamic limit
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
                                          
                    // Update final target with safety bounds
                    this.perfData.targetDetail = Math.min(1.0, Math.max(0.08, smoothedTarget));
                    
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
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                          this.perfData.fpsHistory.length;
            const fpsDistance = Math.abs(avgFps - this.perfData.targetFps);
            const nearTargetFps = fpsDistance <= 5; // Stricter definition of "near target" for faster adaptation
                
            // Prioritize stability and convergence over speed
            if (this.perfData.optimalDetailFound) {
                // Moderately slow adaptation when optimal settings are found, but not too slow
                adaptationRate = 0.2;
                
                // Check if we're in a very stable state (FPS in perfect range)
                const stableAvgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                                    this.perfData.fpsHistory.length;
                              
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
                    // Detected oscillation - use slower adaptation but not too slow
                    adaptationRate = 0.25;
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
            
            // Add safety bounds to prevent detail level from exceeding 1.0
            this.perfData.adaptiveDetail = Math.min(1.0, Math.max(0.08, this.perfData.adaptiveDetail));
            
            // Add stability detection - if we're close to target, mark as stable
            if (Math.abs(detailDiff) < 0.02 && !this.perfData.optimalDetailFound) {
                // We've reached a stable point - check if it's good
                const stablePointFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                                      this.perfData.fpsHistory.length;
                
                // Be more lenient about what we consider "optimal" to allow quicker stabilization
                if (stablePointFps >= 28 && stablePointFps <= 42) {
                    this.perfData.optimalDetailFound = true;
                    console.log(`Optimal detail level found: ${this.perfData.adaptiveDetail.toFixed(4)}`);
                }
            }
            
            console.log(`Detail adapted: ${this.perfData.adaptiveDetail.toFixed(4)}, target: ${this.perfData.targetDetail.toFixed(4)}, triangles: ${this.perfData.triangleCount}, optimal: ${this.perfData.optimalDetailFound}`);
            
            // Track average FPS
            const averageFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                              this.perfData.fpsHistory.length;
            
            // Calculate average triangle count from history
            const avgTriangleCount = this.perfData.triangleHistory.length > 0 
                ? this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length
                : this.perfData.triangleCount;
            
            // Triangle target adjustment with preference for mid-range values
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
        ctx.fillRect(5, 5, 280, 195); // Taller box for more info
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        const avgDisplayFps = this.perfData.fpsHistory.length > 0 
            ? Math.round(this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / this.perfData.fpsHistory.length)
            : Math.round(this.perfData.fps);
        ctx.fillText(`FPS: ${Math.round(this.perfData.fps)} (avg: ${avgDisplayFps})`, 10, 10);
        
        // Calculate average triangle count
        const avgTriangles = this.perfData.triangleHistory.length > 0 
            ? Math.round(this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length)
            : this.perfData.triangleCount;
            
        // Color-code triangle count based on FPS distance from target
        const uiFps = this.perfData.fpsHistory.length > 0 
            ? this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / this.perfData.fpsHistory.length
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
            ? this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / this.perfData.fpsHistory.length
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
                ctx.fillText(`Pattern: ${hasOscillation ? 'Oscillating' : 'Stable'}`, 10, 145);
                ctx.fillStyle = '#ffffff'; // Reset color
                
                // Show range analysis
                const avgTriCount = this.perfData.triangleHistory.length > 0 
                    ? Math.round(this.perfData.triangleHistory.reduce((a, b) => a + b, 0) / this.perfData.triangleHistory.length)
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