// PerformanceDebugger - Handles debug visualization of performance metrics
import { calculateAverage } from '../utils/MathUtils.js';
import { detectOscillation } from '../utils/PerformanceUtils.js';

class PerformanceDebugger {
    constructor(metrics) {
        this.metrics = metrics;
    }
    
    // Draw debug information overlay on the canvas
    drawDebugInfo(ctx) {
        const metrics = this.metrics;
        const data = metrics.getDebugData();
        
        // Set up text rendering
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 5, 280, 195); // Taller box for more info
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        const avgDisplayFps = data.avgFps;
        ctx.fillText(`FPS: ${Math.round(data.fps)} (avg: ${Math.round(avgDisplayFps)})`, 10, 10);
        
        // Calculate average triangle count
        const avgTriangles = data.triangleHistory.length > 0 
            ? Math.round(calculateAverage(data.triangleHistory))
            : data.triangleCount;
            
        // Color-code triangle count based on FPS distance from target
        const fpsDiff = Math.abs(data.avgFps - data.targetFps);
        
        if (fpsDiff <= 3) {
            ctx.fillStyle = '#00ff00'; // Green for close to target
        } else if (fpsDiff > 10) {
            ctx.fillStyle = '#ff0000'; // Red for far from target
        } else {
            ctx.fillStyle = '#ffcc00'; // Yellow for moderate distance
        }
        
        ctx.fillText(`Triangles: ${data.triangleCount} / Target: ${data.triangleTarget}`, 10, 25);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        // Show target FPS info - use average FPS for more stable display
        const fpsDistance = Math.abs(Math.round(data.avgFps) - data.targetFps);
        ctx.fillText(`Target FPS: ${data.targetFps} (diff: ${fpsDistance})`, 10, 40);
        
        // Add color indicators for target direction
        if (data.optimalDetailFound) {
            // We found optimal settings, highlight in gold
            ctx.fillStyle = '#ffcc00'; // Gold for optimal
        } else if (data.targetDetail < data.adaptiveDetail) {
            // Moving toward higher detail (lower value = higher detail)
            ctx.fillStyle = '#00ff00'; // Green for higher detail
        } else if (data.targetDetail > data.adaptiveDetail) {
            // Moving toward lower detail (higher value = lower detail)
            ctx.fillStyle = '#ff0000'; // Red for lower detail
        } else {
            // Stable
            ctx.fillStyle = '#ffffff'; // White - stable
        }
        
        ctx.fillText(`Detail Level: ${data.adaptiveDetail.toFixed(3)} → ${data.targetDetail.toFixed(3)}`, 10, 55);
        ctx.fillStyle = '#ffffff'; // Reset color
        
        // Show allowed change limit - useful for debugging
        ctx.fillText(`Max Change: ${data.maxAllowedDetailChange.toFixed(3)}`, 10, 70);
        
        ctx.fillText(`Detail Areas: ${data.detailAreas}`, 10, 85);
        ctx.fillText(`Render Time: ${data.renderTime.toFixed(1)}ms`, 10, 100);
        
        // Show convergence status
        if (data.optimalDetailFound) {
            ctx.fillStyle = '#00ff00'; // Green for optimal
            ctx.fillText(`Status: OPTIMAL (Stability: ${data.stabilityCount})`, 10, 115);
            ctx.fillStyle = '#ffffff'; // Reset color
        } else {
            // Show whether we're converging toward the preferred range
            const movingTowardPreferred = (
                (data.triangleCount < metrics.preferredTriangleRange.min && 
                 data.lastDirection === 'up') ||
                (data.triangleCount > metrics.preferredTriangleRange.max && 
                 data.lastDirection === 'down')
            );
            
            ctx.fillStyle = movingTowardPreferred ? '#00ff00' : '#ffffff';
            ctx.fillText(`Status: ${movingTowardPreferred ? 'CONVERGING' : 'ADAPTING'} (${data.upCount}/${data.downCount})`, 10, 115);
            ctx.fillStyle = '#ffffff'; // Reset color
        }
        
        // Display last detail change
        if (data.detailHistory && data.detailHistory.length > 0) {
            const lastChange = data.detailHistory[data.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 130);
            
            // Show oscillation detection
            if (data.detailHistory.length >= 4) {
                const isOscillating = detectOscillation(metrics);
                
                ctx.fillStyle = isOscillating ? '#ff0000' : '#00ff00';
                ctx.fillText(`Pattern: ${isOscillating ? 'Oscillating' : 'Stable'}`, 10, 145);
                ctx.fillStyle = '#ffffff'; // Reset color
                
                // Show range analysis
                ctx.fillText(`Avg Triangles: ${avgTriangles}`, 10, 160);
                
                // Add deadzone information if relevant
                if (data.deadZoneCounter > 0) {
                    ctx.fillStyle = '#ffcc00'; // Gold for deadzone
                    ctx.fillText(`Deadzone: ${data.deadZoneCounter}/${metrics.deadZoneThreshold}`, 10, 175);
                    ctx.fillStyle = '#ffffff'; // Reset color
                }
            }
        }
        
        ctx.restore();
    }
}

export default PerformanceDebugger;