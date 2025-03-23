import TriangleRenderer from './TriangleRenderer.js';
import QuadTreeSubdivider from './QuadTreeSubdivider.js';
import { clamp, safeValue } from '../utils/MathUtils.js';
import { updateCanvasDimensions } from '../utils/UIUtils.js';

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
    
    // Render the terrain with optimized mesh and safety checks
    renderTerrain(globalTime, options, detailLevel) {
        // Validate inputs
        if (isNaN(globalTime) || !isFinite(globalTime)) {
            console.warn('TerrainRenderer: Invalid globalTime:', globalTime);
            globalTime = 0; // Use safe default
        }
        
        if (isNaN(detailLevel) || !isFinite(detailLevel)) {
            console.warn('TerrainRenderer: Invalid detailLevel:', detailLevel);
            detailLevel = 0.5; // Use safe default
        }
        
        // Validate canvas dimensions
        if (this.width <= 0 || this.height <= 0 || !isFinite(this.width) || !isFinite(this.height)) {
            console.warn('TerrainRenderer: Invalid canvas dimensions:', this.width, this.height);
            return { triangleCount: 0, detailAreaCount: 0 }; // Skip rendering
        }
        
        // Validate grid size to prevent division by zero
        const gridSize = this.terrainGenerator.gridSize;
        if (gridSize <= 1 || !isFinite(gridSize)) {
            console.warn('TerrainRenderer: Invalid gridSize:', gridSize);
            return { triangleCount: 0, detailAreaCount: 0 }; // Skip rendering
        }
        
        // Calculate pixel size with safety checks
        const pixelWidth = this.width / (gridSize - 1);
        const pixelHeight = this.height / (gridSize - 1);
        
        if (!isFinite(pixelWidth) || !isFinite(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) {
            console.warn('TerrainRenderer: Invalid pixel dimensions:', pixelWidth, pixelHeight);
            return { triangleCount: 0, detailAreaCount: 0 }; // Skip rendering
        }
        
        try {
            // Determine appropriate level for device
            // Calculate base skip factor - smaller values = more triangles
            // Add an upper bound to detail level to prevent issues when it exceeds 1.0
            // Make detail level scale have stronger effect on skip factor for faster performance changes
            const clampedDetailLevel = clamp(detailLevel, 0.08, 0.95); // Avoid extreme values
            
            // Use a more dramatic scaling that creates visible differences in triangle size
            // Low detail = larger triangles, high detail = smaller triangles
            // Scale between 0.2 (high detail) to 2.0 (low detail) - wider range for better visibility 
            const baseSkipFactor = 0.2 + (clampedDetailLevel * 1.8);
            
            // With larger gridSize, we need slightly larger cell size for initial grid
            // Apply safety checks but allow for larger cell sizes to create more visible differences
            // This allows the baseSkipFactor to have a more dramatic effect on triangle size
            const rawCellSize = Math.floor(baseSkipFactor * 4);
            const cellSize = safeValue(rawCellSize, 2);
            const limitedCellSize = clamp(cellSize, 2, 12); // Increased maximum
            
            // Use the QuadTreeSubdivider to create the triangle mesh with try/catch for safety
            let triangleBatch = [];
            let triangleCount = 0;
            let detailAreaCount = 0;
            
            try {
                const result = this.quadTreeSubdivider.subdivide(
                    gridSize, 
                    limitedCellSize, 
                    baseSkipFactor, 
                    pixelWidth, 
                    pixelHeight, 
                    globalTime,
                    options
                );
                
                triangleBatch = result.triangleBatch || [];
                triangleCount = result.triangleCount || 0;
                detailAreaCount = result.detailAreaCount || 0;
            } catch (error) {
                console.error('TerrainRenderer: Error in subdivision:', error);
                // Return minimal results on error
                return { triangleCount: 0, detailAreaCount: 0 };
            }
            
            // Use the TriangleRenderer to draw the triangles
            this.triangleRenderer.renderTriangleBatch(triangleBatch);
            
            return { triangleCount, detailAreaCount };
        } catch (error) {
            console.error('TerrainRenderer: Error in renderTerrain:', error);
            return { triangleCount: 0, detailAreaCount: 0 };
        }
    }
    
    // Update canvas dimensions if needed
    updateDimensions() {
        if (updateCanvasDimensions(this.canvas)) {
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