// PerformanceMetrics - Stores and manages performance data
import { PERFORMANCE } from '../utils/constants.js';
import { clamp, safeValue, calculateAverage } from '../utils/MathUtils.js';

class PerformanceMetrics {
    constructor() {
        // Core metrics
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsCheck = performance.now();
        this.renderTime = 0;
        
        // Detail level parameters
        this.adaptiveDetail = 0.25;  // Start with lower detail level for better initial performance
        this.targetDetail = 0.25;    // Start at the same position
        this.lastTarget = 0.25;      // Track last target for trend analysis
        this.minFrameTime = 9999;    // Track best frame time (ms)
        
        // History tracking
        this.fpsHistory = [];        // Track FPS history
        this.detailHistory = [];     // Track detail level changes
        this.triangleHistory = [];   // Track triangle count history for stability analysis
        this.previousDetailLevels = [0.25, 0.25, 0.25]; // Track previous levels for exponential smoothing
        
        // Triangle metrics
        this.triangleCount = 0;
        this.triangleTarget = 15000; // Start with middle-ground target
        this.detailAreas = 0;
        
        // State tracking
        this.lastDetailChange = 0;
        this.highDetailMode = true;
        this.upCount = 0;            // Counter for consecutive increases
        this.downCount = 0;          // Counter for consecutive decreases
        this.stabilityCount = 0;     // Track periods of stability
        this.optimalDetailFound = false; // Flag when we've found a good stable value
        this.lastDirection = 'none'; // Track last change direction to detect oscillation
        
        // Configuration values
        this.targetFps = PERFORMANCE.targetFps;
        this.maxAllowedDetailChange = 0.25; // Starting value for maximum allowed change
        this.initialMaxAllowedDetailChange = 0.35; // Increased for faster convergence
        this.minAllowedDetailChange = 0.04; // Increased minimum change for faster adaptation
        this.minTriangleTarget = PERFORMANCE.minTriangleTarget;
        this.maxTriangleTarget = PERFORMANCE.maxTriangleTarget;
        this.preferredTriangleRange = PERFORMANCE.preferredTriangleRange;
        this.smoothingFactor = 0.4;  // Reduced to increase smoothing and prevent oscillation
        this.stableThreshold = 0.005; // Threshold for considering a change significant
        
        // Oscillation detection
        this.oscillationBuffer = []; // Track recent direction changes to detect oscillation patterns
        this.deadZoneCounter = 0;    // Count frames spent in the dead zone (no changes)
        this.deadZoneThreshold = 15  // Increased frames to stay in dead zone to better break oscillation
    }
    
    // Update triangle count and detail areas
    updateTriangleMetrics(triangleCount, detailAreaCount) {
        this.triangleCount = triangleCount;
        this.detailAreas = detailAreaCount;
    }
    
    // Update FPS counter
    updateFPS(now) {
        // Calculate FPS
        const fps = this.frameCount * 1000 / (now - this.lastFpsCheck);
        this.fps = fps;
        this.frameCount = 0;
        this.lastFpsCheck = now;
        
        // Update FPS history
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 6) { // Reduced history for faster response
            this.fpsHistory.shift();
        }
        
        return fps;
    }
    
    // Get average FPS from history
    getAverageFPS() {
        return this.fpsHistory.length > 0 
            ? calculateAverage(this.fpsHistory)
            : this.fps;
    }
    
    // Get current detail level
    getDetailLevel() {
        return this.adaptiveDetail;
    }
    
    // Update triangle history for tracking
    updateTriangleHistory(count) {
        this.triangleHistory.push(count);
        if (this.triangleHistory.length > 10) {
            this.triangleHistory.shift();
        }
    }
    
    // Record detail level change
    recordDetailChange(now, target, direction, avgFps) {
        this.targetDetail = target;
        this.lastDetailChange = now;
        this.lastDirection = direction;
        
        // Record history
        this.detailHistory.push({
            time: now, 
            detail: target, 
            direction: direction, 
            fps: avgFps,
            triangles: this.triangleCount
        });
        
        // Limit history size
        if (this.detailHistory.length > 20) {
            this.detailHistory.shift();
        }
        
        // Track consecutive changes in the same direction
        if (direction === 'up') {
            this.upCount++;
            this.downCount = 0;
        } else if (direction === 'down') {
            this.upCount = 0;
            this.downCount++;
        }
    }
    
    // Record new render time
    setRenderTime(time) {
        this.renderTime = time;
    }
    
    // Get data for debugging
    getDebugData() {
        return {
            fps: this.fps,
            avgFps: this.getAverageFPS(),
            triangleCount: this.triangleCount,
            triangleTarget: this.triangleTarget,
            adaptiveDetail: this.adaptiveDetail,
            targetDetail: this.targetDetail,
            maxAllowedDetailChange: this.maxAllowedDetailChange,
            detailAreas: this.detailAreas,
            renderTime: this.renderTime,
            optimalDetailFound: this.optimalDetailFound,
            stabilityCount: this.stabilityCount,
            lastDirection: this.lastDirection,
            upCount: this.upCount,
            downCount: this.downCount,
            deadZoneCounter: this.deadZoneCounter,
            lastDetailChange: this.lastDetailChange,
            targetFps: this.targetFps,
            detailHistory: this.detailHistory,
            triangleHistory: this.triangleHistory
        };
    }
}

export default PerformanceMetrics;