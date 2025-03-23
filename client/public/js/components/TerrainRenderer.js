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
        
        // Pre-allocate array for batch rendering
        this.triangleBatch = [];
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
        
        // Track triangle counts and detail areas
        let triangleCount = 0;
        let detailAreaCount = 0;
        
        // Reset triangle batch
        this.triangleBatch.length = 0;
        
        // Determine appropriate level for device
        // Calculate base skip factor - smaller values = more triangles
        const baseSkipFactor = Math.max(0.5, Math.floor(detailLevel * 4)) / 5;
        
        // With larger gridSize, we need slightly larger cell size for initial grid
        const cellSize = Math.max(2, Math.floor(baseSkipFactor * 4)); // Balancing detail and performance
        
        // Define a subdivision function to create more detailed areas
        const createSubdividedGrid = (startX, startY, size, detailFactor) => {
            // Base case - create triangles for this cell
            // Use absolute minimum size to force maximum subdivision
            if (size <= 1 || detailFactor >= 5) { // Increased threshold to allow even more subdivision
                // Create a quad (2 triangles) for this cell
                const points = [
                    { x: startX, y: startY },
                    { x: startX + size, y: startY },
                    { x: startX + size, y: startY + size },
                    { x: startX, y: startY + size }
                ];
                
                // Get wave effect for this cell - use stable offset to prevent flashing
                const cellWaveEffect = options.waveIntensity * 
                    Math.sin((startX + startY) / 5 + stableWaveOffset * 3) * 2;
                
                // Get corner data
                const corners = points.map(p => {
                    // Get terrain value for this position
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, globalTime, glowIntensity
                    );
                    
                    // Apply wave effect - use stable offset to prevent flashing
                    const waveX = cellWaveEffect * Math.sin(p.y / 10 + stableWaveOffset);
                    const waveY = cellWaveEffect * Math.cos(p.x / 10 + stableWaveOffset);
                    const xPos = p.x * pixelWidth + waveX;
                    const yPos = p.y * pixelHeight + waveY;
                    
                    return { xPos, yPos, value, color: glowColor };
                });
                
                // Create triangles for this quad
                // First triangle (top-left, top-right, bottom-left)
                this.triangleBatch.push({
                    x1: corners[0].xPos, y1: corners[0].yPos, color1: corners[0].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[3].xPos, y3: corners[3].yPos, color3: corners[3].color,
                    height: (corners[0].value + corners[1].value + corners[3].value) / 3
                });
                
                // Second triangle (bottom-left, top-right, bottom-right)
                this.triangleBatch.push({
                    x1: corners[3].xPos, y1: corners[3].yPos, color1: corners[3].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[2].xPos, y3: corners[2].yPos, color3: corners[2].color,
                    height: (corners[3].value + corners[1].value + corners[2].value) / 3
                });
                
                triangleCount += 2;
                return;
            }
            
            // Always subdivide more for better detail
            const halfSize = size / 2;
            const centerX = startX + halfSize;
            const centerY = startY + halfSize;
            const centerHeight = this.terrainGenerator.getValue(centerX, centerY);
            
            // Check corner heights
            const nwHeight = this.terrainGenerator.getValue(startX, startY);
            const neHeight = this.terrainGenerator.getValue(startX + size, startY);
            const seHeight = this.terrainGenerator.getValue(startX + size, startY + size);
            const swHeight = this.terrainGenerator.getValue(startX, startY + size);
            
            // Calculate height variance in this cell
            const maxHeight = Math.max(nwHeight, neHeight, seHeight, swHeight);
            const minHeight = Math.min(nwHeight, neHeight, seHeight, swHeight);
            const heightDiff = maxHeight - minHeight;
            
            // More moderate thresholds to balance detail with the larger grid
            const isDetailArea = centerHeight > 0.35 || // Moderate threshold for peaks 
                              heightDiff > 0.03 ||   // Moderate threshold for variance
                              size > 3;              // Force subdivision for larger cells
            
            if (isDetailArea) { // Always subdivide if it's a detail area
                detailAreaCount++;
                // Subdivide further for detail areas
                const newSize = halfSize;
                const newDetail = detailFactor / 2;
                
                // Recursively subdivide into 4 quads
                createSubdividedGrid(startX, startY, newSize, newDetail);
                createSubdividedGrid(startX + newSize, startY, newSize, newDetail);
                createSubdividedGrid(startX, startY + newSize, newSize, newDetail);
                createSubdividedGrid(startX + newSize, startY + newSize, newSize, newDetail);
            } else {
                // Just create triangles for this cell (similar to base case)
                const points = [
                    { x: startX, y: startY },
                    { x: startX + size, y: startY },
                    { x: startX + size, y: startY + size },
                    { x: startX, y: startY + size }
                ];
                
                // Get wave effect for this cell - use stable offset to prevent flashing
                const cellWaveEffect = options.waveIntensity * 
                    Math.sin((startX + startY) / 5 + stableWaveOffset * 3) * 2;
                
                // Get corner data
                const corners = points.map(p => {
                    // Get terrain value for this position
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, globalTime, glowIntensity
                    );
                    
                    // Apply wave effect - use stable offset to prevent flashing
                    const waveX = cellWaveEffect * Math.sin(p.y / 10 + stableWaveOffset);
                    const waveY = cellWaveEffect * Math.cos(p.x / 10 + stableWaveOffset);
                    const xPos = p.x * pixelWidth + waveX;
                    const yPos = p.y * pixelHeight + waveY;
                    
                    return { xPos, yPos, value, color: glowColor };
                });
                
                // Create triangles for this quad
                // First triangle (top-left, top-right, bottom-left)
                this.triangleBatch.push({
                    x1: corners[0].xPos, y1: corners[0].yPos, color1: corners[0].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[3].xPos, y3: corners[3].yPos, color3: corners[3].color,
                    height: (corners[0].value + corners[1].value + corners[3].value) / 3
                });
                
                // Second triangle (bottom-left, top-right, bottom-right)
                this.triangleBatch.push({
                    x1: corners[3].xPos, y1: corners[3].yPos, color1: corners[3].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[2].xPos, y3: corners[2].yPos, color3: corners[2].color,
                    height: (corners[3].value + corners[1].value + corners[2].value) / 3
                });
                
                triangleCount += 2;
            }
        };
        
        // Effective grid size from terrain generator
        const effectiveGridSize = this.terrainGenerator.gridSize;
        
        // Divide terrain into initial grid cells and process each one
        for (let y = 0; y < effectiveGridSize - 1; y += cellSize) {
            for (let x = 0; x < effectiveGridSize - 1; x += cellSize) {
                // Ensure we don't go out of bounds
                const size = Math.min(cellSize, effectiveGridSize - x - 1, effectiveGridSize - y - 1);
                createSubdividedGrid(x, y, size, baseSkipFactor);
            }
        }
        
        // Sort triangles by height for better visual layering (back-to-front)
        this.triangleBatch.sort((a, b) => a.height - b.height);
        
        // Draw all triangles in batch
        for (const tri of this.triangleBatch) {
            this.drawOptimizedTriangle(
                tri.x1, tri.y1, tri.color1,
                tri.x2, tri.y2, tri.color2,
                tri.x3, tri.y3, tri.color3
            );
        }
        
        return { triangleCount, detailAreaCount };
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
        
            // Calculate weighted average color - gives higher weight to brighter colors
            // This creates more vibrant transitions than a simple average
            const avgR = Math.floor((r1 + r2 + r3) / 3);
            const avgG = Math.floor((g1 + g2 + g3) / 3);
            const avgB = Math.floor((b1 + b2 + b3) / 3);
            
            // Convert to hex color using template string for better performance
            const avgColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
            
            // Fill with average color
            this.ctx.fillStyle = avgColor;
            this.ctx.fill();
        } catch (error) {
            // Fallback if color parsing fails
            console.warn('Error processing triangle colors:', error);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
        }
    }
    
    // Render particles
    renderParticles(particleSystem) {
        // Batch particles by type for better rendering performance
        const standardParticles = [];
        const burstParticles = [];
        
        // Group particles to minimize context changes
        for (const p of particleSystem.particles) {
            if (p.burstParticle) {
                burstParticles.push(p);
            } else {
                standardParticles.push(p);
            }
        }
        
        // Draw standard particles first - simpler rendering
        this.ctx.save();
        for (const p of standardParticles) {
            // Only use fast calculations for standard particles
            const ageOpacity = 1 - (p.age / p.lifetime);
            
            // Faster height lookup - avoid expensive floor operations when possible
            const gridX = Math.min(this.terrainGenerator.gridSize - 1, 
                         Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1)));
            const gridY = Math.min(this.terrainGenerator.gridSize - 1, 
                         Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1)));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color - faster method
            const particleColor = particleSystem.getParticleColor(p, height, ageOpacity);
            
            // Simple circle for better performance
            this.ctx.fillStyle = particleColor;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
        
        // Draw burst particles with full glow effects since they're more visible
        this.ctx.save();
        for (const p of burstParticles) {
            // Calculate opacity based on age
            const ageOpacity = 1 - (p.age / p.lifetime);
            
            // Get grid position and height
            const gridX = Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1));
            const gridY = Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color
            const particleColor = particleSystem.getParticleColor(p, height, ageOpacity);
            
            // Draw glowing particle (only for burst particles)
            const radius = p.size * (1 - p.age / p.lifetime) * 3;
            
            // Draw glow
            const gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, radius * 2
            );
            gradient.addColorStop(0, particleColor);
            gradient.addColorStop(1, `${particleColor.substring(0,7)}00`); // Transparent
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw particle core
            this.ctx.fillStyle = particleColor;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
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