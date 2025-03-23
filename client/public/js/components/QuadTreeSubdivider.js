// QuadTreeSubdivider class - Handles adaptive quad-tree based terrain subdivision
class QuadTreeSubdivider {
    constructor(terrainGenerator, colorManager) {
        this.terrainGenerator = terrainGenerator;
        this.colorManager = colorManager;
        this.triangleBatch = [];
        this.triangleCount = 0;
        this.detailAreaCount = 0;
    }
    
    // Clear any existing state before next subdivision run
    reset() {
        this.triangleBatch.length = 0;
        this.triangleCount = 0;
        this.detailAreaCount = 0;
    }
    
    // Process the terrain with quad tree subdivision
    subdivide(effectiveGridSize, cellSize, baseSkipFactor, pixelWidth, pixelHeight, globalTime, options) {
        this.reset();
        
        // Divide terrain into initial grid cells and process each one
        for (let y = 0; y < effectiveGridSize - 1; y += cellSize) {
            for (let x = 0; x < effectiveGridSize - 1; x += cellSize) {
                // Ensure we don't go out of bounds
                const size = Math.min(cellSize, effectiveGridSize - x - 1, effectiveGridSize - y - 1);
                this.createSubdividedGrid(
                    x, y, size, baseSkipFactor, 
                    pixelWidth, pixelHeight, 
                    globalTime, options
                );
            }
        }
        
        // Sort triangles by height for better visual layering (back-to-front)
        this.triangleBatch.sort((a, b) => a.height - b.height);
        
        return { 
            triangleBatch: this.triangleBatch,
            triangleCount: this.triangleCount, 
            detailAreaCount: this.detailAreaCount 
        };
    }
    
    // Define a subdivision function to create more detailed areas
    createSubdividedGrid(startX, startY, size, detailFactor, pixelWidth, pixelHeight, globalTime, options) {
        // Base case - create triangles for this cell
        // Use absolute minimum size to force maximum subdivision
        if (size <= 1 || detailFactor >= 5) { // Increased threshold to allow even more subdivision
            this.createTrianglesForQuad(
                startX, startY, size, 
                pixelWidth, pixelHeight, 
                globalTime, options
            );
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
            this.detailAreaCount++;
            // Subdivide further for detail areas
            const newSize = halfSize;
            const newDetail = detailFactor / 2;
            
            // Recursively subdivide into 4 quads
            this.createSubdividedGrid(startX, startY, newSize, newDetail, 
                                  pixelWidth, pixelHeight, 
                                  globalTime, options);
            this.createSubdividedGrid(startX + newSize, startY, newSize, newDetail, 
                                  pixelWidth, pixelHeight, 
                                  globalTime, options);
            this.createSubdividedGrid(startX, startY + newSize, newSize, newDetail, 
                                  pixelWidth, pixelHeight, 
                                  globalTime, options);
            this.createSubdividedGrid(startX + newSize, startY + newSize, newSize, newDetail, 
                                  pixelWidth, pixelHeight, 
                                  globalTime, options);
        } else {
            // Just create triangles for this cell (similar to base case)
            this.createTrianglesForQuad(
                startX, startY, size, 
                pixelWidth, pixelHeight, 
                globalTime, options
            );
        }
    }
    
    // Create triangles for a quad (shared by both base case and non-detail areas)
    createTrianglesForQuad(startX, startY, size, pixelWidth, pixelHeight, globalTime, options) {
        const points = [
            { x: startX, y: startY },
            { x: startX + size, y: startY },
            { x: startX + size, y: startY + size },
            { x: startX, y: startY + size }
        ];
        
        // Get corner data
        const corners = points.map(p => {
            // Get terrain value for this position
            const value = this.terrainGenerator.getValue(p.x, p.y);
            const color = this.colorManager.getHeightColor(value);
            
            // Direct mapping of coordinates to pixels without wave effect
            const xPos = p.x * pixelWidth;
            const yPos = p.y * pixelHeight;
            
            return { xPos, yPos, value, color };
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
        
        this.triangleCount += 2;
    }
}

export default QuadTreeSubdivider;