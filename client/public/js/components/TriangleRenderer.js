// TriangleRenderer class - Handles low-level triangle rendering operations
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
            // Validate colors first - ensure valid hex format
            if (!color1 || !color1.startsWith('#') || color1.length < 7) color1 = '#000000';
            if (!color2 || !color2.startsWith('#') || color2.length < 7) color2 = '#000000';
            if (!color3 || !color3.startsWith('#') || color3.length < 7) color3 = '#000000';
            
            // Use a faster coloring approach - average the colors
            // Parse colors in batch for better performance
            const r1 = parseInt(color1.slice(1, 3), 16);
            const g1 = parseInt(color1.slice(3, 5), 16);
            const b1 = parseInt(color1.slice(5, 7), 16);
            
            const r2 = parseInt(color2.slice(1, 3), 16);
            const g2 = parseInt(color2.slice(3, 5), 16);
            const b2 = parseInt(color2.slice(5, 7), 16);
            
            const r3 = parseInt(color3.slice(1, 3), 16);
            const g3 = parseInt(color3.slice(3, 5), 16);
            const b3 = parseInt(color3.slice(5, 7), 16);
            
            // Check for NaN values
            if (isNaN(r1) || isNaN(g1) || isNaN(b1) || 
                isNaN(r2) || isNaN(g2) || isNaN(b2) || 
                isNaN(r3) || isNaN(g3) || isNaN(b3)) {
                throw new Error('Invalid color values');
            }
        
            // Calculate strict average color with safety checks
            // Apply stricter rounding to prevent potential NaN/invalid values
            const avgR = Math.min(255, Math.max(0, Math.round((r1 + r2 + r3) / 3))); 
            const avgG = Math.min(255, Math.max(0, Math.round((g1 + g2 + g3) / 3))); 
            const avgB = Math.min(255, Math.max(0, Math.round((b1 + b2 + b3) / 3)));
            
            // Convert to hex color using template string for better performance
            const avgColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
            
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