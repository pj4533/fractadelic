import TriangleRenderer from './TriangleRenderer.js';
import QuadTreeSubdivider from './QuadTreeSubdivider.js';

// TerrainRenderer class - Handles rendering of the landscape
class TerrainRenderer {
    constructor(canvas, terrainGenerator, colorManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.terrainGenerator = terrainGenerator;
        this.colorManager = colorManager;
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Initialize sub-renderers
        this.triangleRenderer = new TriangleRenderer(this.ctx);
        this.quadTreeSubdivider = new QuadTreeSubdivider(this.terrainGenerator, this.colorManager);
    }
    
    // Render the terrain with optimized mesh
    renderTerrain(globalTime, options, detailLevel) {
        // Calculate pixel size
        const pixelWidth = this.width / (this.terrainGenerator.gridSize - 1);
        const pixelHeight = this.height / (this.terrainGenerator.gridSize - 1);
        
        // Determine appropriate level for device
        // Calculate base skip factor - smaller values = more triangles
        // Add an upper bound to detail level to prevent issues when it exceeds 1.0
        // Make detail level scale have stronger effect on skip factor for faster performance changes
        const clampedDetailLevel = Math.min(1.0, detailLevel);
        // More aggressive scaling (8x instead of 4x) allows for larger detail level impact
        // Minimum value reduced (0.3 instead of 0.5) for wider performance range
        const baseSkipFactor = Math.max(0.3, Math.floor(clampedDetailLevel * 8)) / 5;
        
        // With larger gridSize, we need slightly larger cell size for initial grid
        const cellSize = Math.max(2, Math.floor(baseSkipFactor * 4)); // Balancing detail and performance
        
        // Use the QuadTreeSubdivider to create the triangle mesh
        const { triangleBatch, triangleCount, detailAreaCount } = 
            this.quadTreeSubdivider.subdivide(
                this.terrainGenerator.gridSize, 
                cellSize, 
                baseSkipFactor, 
                pixelWidth, 
                pixelHeight, 
                globalTime,
                options
            );
        
        // Use the TriangleRenderer to draw the triangles
        this.triangleRenderer.renderTriangleBatch(triangleBatch);
        
        return { triangleCount, detailAreaCount };
    }
    
    
    // Update canvas dimensions if needed
    updateDimensions() {
        if (this.canvas.width !== this.canvas.clientWidth || 
            this.canvas.height !== this.canvas.clientHeight) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            return true;
        }
        return false;
    }
    
    // Clear the canvas
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

export default TerrainRenderer;