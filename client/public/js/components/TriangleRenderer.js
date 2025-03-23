// TriangleRenderer class - Handles low-level triangle rendering operations
import { averageColors } from '../utils/ColorUtils.js';

// Helper function to validate triangle coordinates
function isValidTriangleCoordinate(x, y) {
    return !isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y);
}

class TriangleRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    // Draw a triangle with a simpler coloring approach for better performance
    drawOptimizedTriangle(x1, y1, color1, x2, y2, color2, x3, y3, color3) {
        // Validate all coordinates to prevent NaN issues
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(x3) || isNaN(y3) ||
            !isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2) || !isFinite(x3) || !isFinite(y3)) {
            console.warn('Invalid triangle coordinates detected', {x1, y1, x2, y2, x3, y3});
            return; // Skip drawing invalid triangles
        }
        
        // Validate colors to ensure they're all valid hex strings
        const validColor1 = typeof color1 === 'string' && color1.startsWith('#') ? color1 : '#000000';
        const validColor2 = typeof color2 === 'string' && color2.startsWith('#') ? color2 : '#000000';
        const validColor3 = typeof color3 === 'string' && color3.startsWith('#') ? color3 : '#000000';
        
        // Check if triangle has area (non-degenerate)
        // Calculate area using cross product
        const area = Math.abs((x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2))/2);
        if (area < 0.01) {
            return; // Skip zero-area triangles
        }
        
        // Create a triangle path
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.closePath();
        
        try {
            // Use a faster coloring approach - average the colors
            const avgColor = averageColors(validColor1, validColor2, validColor3);
            
            // Fill with average color
            this.ctx.fillStyle = avgColor;
            // Add stroke with same color as fill to eliminate tiny gaps between triangles
            this.ctx.strokeStyle = avgColor;
            this.ctx.lineWidth = 1;
            this.ctx.fill();
            this.ctx.stroke();
        } catch (error) {
            // Fallback if color parsing fails
            console.warn('Error processing triangle colors:', error);
            this.ctx.fillStyle = '#000000';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    // Render a batch of triangles with additional safety checks
    renderTriangleBatch(triangleBatch) {
        // Basic validation of triangleBatch
        if (!triangleBatch || !Array.isArray(triangleBatch)) {
            console.warn('TriangleRenderer: renderTriangleBatch received invalid batch:', triangleBatch);
            return;
        }
        
        // Cap triangle count to prevent browser crash in extreme cases
        const maxTriangles = 50000;
        if (triangleBatch.length > maxTriangles) {
            console.warn(`TriangleRenderer: Excessive triangle count (${triangleBatch.length}), limiting to ${maxTriangles}`);
            triangleBatch = triangleBatch.slice(0, maxTriangles);
        }
        
        // Set maximum triangles to render per frame
        let trianglesRendered = 0;
        const maxTrianglesPerFrame = 10000;
        
        // Draw all triangles in batch
        for (const tri of triangleBatch) {
            // Skip invalid triangles
            if (!tri || typeof tri !== 'object') {
                console.warn('TriangleRenderer: Invalid triangle object in batch:', tri);
                continue;
            }
            
            // Basic triangle validation
            if (!isValidTriangleCoordinate(tri.x1, tri.y1) || 
                !isValidTriangleCoordinate(tri.x2, tri.y2) || 
                !isValidTriangleCoordinate(tri.x3, tri.y3)) {
                continue; // Skip invalid triangles without logging (handled in drawOptimizedTriangle)
            }
            
            // Render the triangle
            this.drawOptimizedTriangle(
                tri.x1, tri.y1, tri.color1,
                tri.x2, tri.y2, tri.color2,
                tri.x3, tri.y3, tri.color3
            );
            
            // Count triangles rendered
            trianglesRendered++;
            
            // If we've reached the maximum for this frame, break to prevent frame stalls
            if (trianglesRendered >= maxTrianglesPerFrame) {
                console.warn(`TriangleRenderer: Reached maximum triangles per frame (${maxTrianglesPerFrame})`);
                break;
            }
        }
    }
}

export default TriangleRenderer;