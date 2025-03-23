// QuadTreeSubdivider class - Handles adaptive quad-tree based terrain subdivision
import { clamp, safeValue } from '../utils/MathUtils.js';

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
        // Add a small epsilon to prevent z-fighting from identical heights
        this.triangleBatch.sort((a, b) => {
            const heightDiff = a.height - b.height;
            // If heights are nearly identical, maintain stable sorting
            if (Math.abs(heightDiff) < 0.0001) {
                // Use position for stable sorting when heights are equal
                return (a.y1 + a.y2 + a.y3) - (b.y1 + b.y2 + b.y3);
            }
            return heightDiff;
        });
        
        return { 
            triangleBatch: this.triangleBatch,
            triangleCount: this.triangleCount, 
            detailAreaCount: this.detailAreaCount 
        };
    }
    
    // Define a subdivision function to create more detailed areas
    createSubdividedGrid(startX, startY, size, detailFactor, pixelWidth, pixelHeight, globalTime, options) {
        // Base case - create triangles for this cell
        // Validate detailFactor while maintaining a wider range for visible detail differences
        const safeDetailFactor = safeValue(detailFactor, 1);
        const limitedDetailFactor = clamp(safeDetailFactor, 0.1, 5);
        
        // Adaptive size threshold based on detail level:
        // - With high detail (low safeDetailFactor), subdivide more deeply
        // - With low detail (high safeDetailFactor), stop subdivision earlier
        const minSubdivisionSize = Math.max(1, Math.floor(limitedDetailFactor * 0.8));
        if (size <= minSubdivisionSize || limitedDetailFactor >= 4) { // Adaptive termination criteria
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
        
        // Adjust thresholds based on detailFactor to make detail level more visually apparent
        // When detailFactor is high (low detail), we're more selective about what areas to subdivide
        // When detailFactor is low (high detail), we subdivide more aggressively
        const detailScale = clamp(1 - limitedDetailFactor/3, 0, 1); // 0 = low detail, 1 = high detail
        const isDetailArea = centerHeight > (0.4 - detailScale * 0.2) || // Adaptive peak threshold 
                          heightDiff > (0.07 - detailScale * 0.05) ||   // Adaptive variance threshold
                          size > (4 + Math.floor(limitedDetailFactor * 2)); // Adaptive size threshold
        
        if (isDetailArea) { // Always subdivide if it's a detail area
            this.detailAreaCount++;
            // Subdivide further for detail areas with safety checks
            const newSize = halfSize;
            // Make child subdivisions maintain parent's detail factor for consistent behavior
            // This ensures the detail level properly propagates through the entire subdivision tree
            // Use the same detail factor for child nodes to prevent accumulated changes
            const newDetail = limitedDetailFactor;
            
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
        
        // Ensure points have valid coordinates
        for (let i = 0; i < points.length; i++) {
            if (isNaN(points[i].x) || isNaN(points[i].y) || 
                !isFinite(points[i].x) || !isFinite(points[i].y)) {
                console.warn('Invalid point coordinates detected:', points[i]);
                return; // Skip creating triangles with invalid points
            }
        }
        
        // Get corner data
        const corners = points.map(p => {
            // Get terrain value for this position
            const value = this.terrainGenerator.getValue(p.x, p.y);
            
            // Skip invalid values
            if (isNaN(value) || !isFinite(value)) {
                console.warn('Invalid height value detected at', p);
                return { xPos: p.x * pixelWidth, yPos: p.y * pixelHeight, value: 0, color: '#000000' };
            }
            
            const color = this.colorManager.getHeightColor(value);
            
            // Direct mapping of coordinates to pixels without wave effect
            const xPos = p.x * pixelWidth;
            const yPos = p.y * pixelHeight;
            
            return { xPos, yPos, value, color };
        });
        
        // Ensure all corners have valid positions
        for (let i = 0; i < corners.length; i++) {
            if (isNaN(corners[i].xPos) || isNaN(corners[i].yPos) || 
                !isFinite(corners[i].xPos) || !isFinite(corners[i].yPos)) {
                console.warn('Invalid corner position detected:', corners[i]);
                return; // Skip creating triangles with invalid corners
            }
        }
        
        // Ensure valid triangle area before adding (avoid degenerate triangles)
        // First triangle (top-left, top-right, bottom-left)
        const height1 = (corners[0].value + corners[1].value + corners[3].value) / 3;
        if (isFinite(height1)) {
            this.triangleBatch.push({
                x1: corners[0].xPos, y1: corners[0].yPos, color1: corners[0].color,
                x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                x3: corners[3].xPos, y3: corners[3].yPos, color3: corners[3].color,
                height: height1
            });
            this.triangleCount++;
        }
        
        // Second triangle (bottom-left, top-right, bottom-right)
        const height2 = (corners[3].value + corners[1].value + corners[2].value) / 3;
        if (isFinite(height2)) {
            this.triangleBatch.push({
                x1: corners[3].xPos, y1: corners[3].yPos, color1: corners[3].color,
                x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                x3: corners[2].xPos, y3: corners[2].yPos, color3: corners[2].color,
                height: height2
            });
            this.triangleCount++;
        }
    }
}

export default QuadTreeSubdivider;