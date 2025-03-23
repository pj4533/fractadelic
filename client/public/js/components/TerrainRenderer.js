import TriangleRenderer from './TriangleRenderer.js';
import ParticleRenderer from './ParticleRenderer.js';
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
        
        // Initialize grid offset for anti-flashing
        this.gridOffset = {
            lastWaveOffset: 0,
            speedFactor: 0.05 // Slow down wave movement to reduce flashing
        };
        
        // Initialize sub-renderers
        this.triangleRenderer = new TriangleRenderer(this.ctx);
        this.particleRenderer = new ParticleRenderer(this.ctx, this.terrainGenerator);
        this.quadTreeSubdivider = new QuadTreeSubdivider(this.terrainGenerator, this.colorManager);
    }
    
    // Render the terrain with optimized mesh
    renderTerrain(globalTime, waveOffset, options, detailLevel) {
        // Calculate pixel size
        const pixelWidth = this.width / (this.terrainGenerator.gridSize - 1);
        const pixelHeight = this.height / (this.terrainGenerator.gridSize - 1);
        
        // Use anti-flashing technique: maintain stable positions between frames
        // Calculate stable wave offset by dampening changes between frames
        const currentWaveOffset = waveOffset;
        const waveDelta = currentWaveOffset - this.gridOffset.lastWaveOffset;
        
        // Only move a percentage of the full wave amount (reduces oscillation)
        const stableWaveOffset = this.gridOffset.lastWaveOffset + 
            (waveDelta * this.gridOffset.speedFactor);
        this.gridOffset.lastWaveOffset = stableWaveOffset;
        
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
                stableWaveOffset, 
                options
            );
        
        // Use the TriangleRenderer to draw the triangles
        this.triangleRenderer.renderTriangleBatch(triangleBatch);
        
        return { triangleCount, detailAreaCount };
    }
    
    // Render particles
    renderParticles(particleSystem) {
        this.particleRenderer.renderParticles(particleSystem, this.width, this.height);
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