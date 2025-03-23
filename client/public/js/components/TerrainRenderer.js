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
        const baseSkipFactor = Math.max(0.5, Math.floor(detailLevel * 4)) / 5;
        
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