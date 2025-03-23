// TriangleRenderer class - Handles low-level triangle rendering operations
import { averageColors } from '../utils/ColorUtils.js';

class TriangleRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    // Draw a triangle with a simpler coloring approach for better performance
    drawOptimizedTriangle(x1, y1, color1, x2, y2, color2, x3, y3, color3) {
        // Create a triangle path
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.closePath();
        
        try {
            // Use a faster coloring approach - average the colors
            const avgColor = averageColors(color1, color2, color3);
            
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
    
    // Render a batch of triangles
    renderTriangleBatch(triangleBatch) {
        // Draw all triangles in batch
        for (const tri of triangleBatch) {
            this.drawOptimizedTriangle(
                tri.x1, tri.y1, tri.color1,
                tri.x2, tri.y2, tri.color2,
                tri.x3, tri.y3, tri.color3
            );
        }
    }
}

export default TriangleRenderer;