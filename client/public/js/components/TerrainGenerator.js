// Terrain Generation using Diamond-Square algorithm
import { clamp, randomShift } from '../utils/MathUtils.js';

class TerrainGenerator {
    constructor(roughness, seedPoints = []) {
        this.roughness = roughness;
        this.seedPoints = seedPoints;
        
        // Grid size - using a power of 2 plus 1 (increased for higher detail)
        this.gridSize = 129; // Was 65, increased to allow more triangles
        this.terrainMap = new Array(this.gridSize * this.gridSize).fill(0);
    }
    
    setRoughness(roughness) {
        this.roughness = roughness;
    }
    
    // Initialize terrain with random corners
    initTerrain() {
        // Clear the terrain map
        this.terrainMap.fill(0);
        
        const size = this.gridSize - 1;
        
        // Set the four corners to random values
        this.setValue(0, 0, Math.random());
        this.setValue(size, 0, Math.random());
        this.setValue(0, size, Math.random());
        this.setValue(size, size, Math.random());
        
        // Apply seed points if any
        for (const seed of this.seedPoints) {
            const { x, y, value } = seed;
            const gridX = Math.floor(x * size);
            const gridY = Math.floor(y * size);
            this.setValue(gridX, gridY, value);
        }
        
        // Run the diamond-square algorithm
        this.diamondSquare(size);
    }
    
    // Add a seed point
    addSeedPoint(x, y, value) {
        const seedPoint = { x, y, value };
        this.seedPoints.push(seedPoint);
        
        // Update the terrain with the new seed point
        const gridX = Math.floor(x * (this.gridSize - 1));
        const gridY = Math.floor(y * (this.gridSize - 1));
        this.setValue(gridX, gridY, value);
        
        // Re-run the algorithm
        this.diamondSquare(this.gridSize - 1);
    }
    
    // Micro-evolve for subtle constant movement with safety checks
    microEvolve(rate) {
        // Validate rate parameter
        if (isNaN(rate) || !isFinite(rate)) {
            console.warn('TerrainGenerator: microEvolve received invalid rate:', rate);
            rate = 0.0003; // Use default safe value
        }
        
        // Cap rate to reasonable values to prevent extreme changes
        const safeRate = clamp(rate, 0, 0.01);
        
        // Apply very subtle evolution to random points
        for (let i = 0; i < 10; i++) {
            // Generate valid random index
            const index = Math.floor(Math.random() * this.terrainMap.length);
            if (index < 0 || index >= this.terrainMap.length) {
                console.warn('TerrainGenerator: microEvolve generated invalid index:', index);
                continue; // Skip this iteration
            }
            
            // Get current value with safety check
            const currentValue = this.terrainMap[index];
            if (isNaN(currentValue) || !isFinite(currentValue)) {
                console.warn('TerrainGenerator: microEvolve found invalid value at index:', index);
                this.terrainMap[index] = 0.5; // Reset to safe value
                continue;
            }
            
            // Calculate new value with safety checks for randomShift
            try {
                const shift = randomShift(0, safeRate);
                if (isNaN(shift) || !isFinite(shift)) {
                    console.warn('TerrainGenerator: microEvolve got invalid shift value:', shift);
                    continue;
                }
                
                // Apply the shift with strict bounds
                this.terrainMap[index] = clamp(currentValue + shift, 0, 1);
            } catch (err) {
                console.error('TerrainGenerator: Error in microEvolve:', err);
            }
        }
    }
    
    // Evolve the landscape with dramatic effect and safety checks
    evolve(rate = 0.02) {
        // Validate rate parameter
        if (isNaN(rate) || !isFinite(rate)) {
            console.warn('TerrainGenerator: evolve received invalid rate:', rate);
            rate = 0.02; // Use default safe value
        }
        
        // Cap rate to reasonable values to prevent extreme changes
        const safeRate = clamp(rate, 0, 0.1);
        
        // Apply evolution to the map with safety checks
        for (let i = 0; i < this.terrainMap.length; i++) {
            // Safety check for array bounds
            if (i < 0 || i >= this.terrainMap.length) {
                console.warn('TerrainGenerator: evolve index out of bounds:', i);
                continue;
            }
            
            // Get current value with safety check
            const currentValue = this.terrainMap[i];
            if (isNaN(currentValue) || !isFinite(currentValue)) {
                console.warn('TerrainGenerator: evolve found invalid value at index:', i);
                this.terrainMap[i] = 0.5; // Reset to safe value
                continue;
            }
            
            // Calculate new value with safety checks for randomShift
            try {
                const shift = randomShift(0, safeRate);
                if (isNaN(shift) || !isFinite(shift)) {
                    console.warn('TerrainGenerator: evolve got invalid shift value:', shift);
                    continue;
                }
                
                // Apply the shift with strict bounds
                this.terrainMap[i] = clamp(currentValue + shift, 0, 1);
            } catch (err) {
                console.error('TerrainGenerator: Error in evolve:', err);
            }
        }
    }
    
    // Diamond-Square algorithm for terrain generation
    diamondSquare(size) {
        let step = size;
        let roughness = this.roughness;
        
        while (step > 1) {
            const half = step / 2;
            
            // Diamond step
            for (let y = half; y < this.gridSize - 1; y += step) {
                for (let x = half; x < this.gridSize - 1; x += step) {
                    this.diamondStep(x, y, half, roughness);
                }
            }
            
            // Square step
            for (let y = 0; y < this.gridSize - 1; y += half) {
                for (let x = (y + half) % step; x < this.gridSize - 1; x += step) {
                    this.squareStep(x, y, half, roughness);
                }
            }
            
            // Reduce roughness each iteration
            step /= 2;
            roughness *= 0.5;
        }
    }
    
    // Diamond step of the algorithm
    diamondStep(x, y, size, roughness) {
        // Average the four corner values
        const avg = (
            this.getValue(x - size, y - size) +
            this.getValue(x + size, y - size) +
            this.getValue(x - size, y + size) +
            this.getValue(x + size, y + size)
        ) / 4;
        
        // Add random displacement
        this.setValue(x, y, randomShift(avg, roughness));
    }
    
    // Square step of the algorithm
    squareStep(x, y, size, roughness) {
        // Count and sum valid neighbors
        let count = 0;
        let sum = 0;
        
        // Top
        if (y - size >= 0) {
            sum += this.getValue(x, y - size);
            count++;
        }
        
        // Right
        if (x + size < this.gridSize) {
            sum += this.getValue(x + size, y);
            count++;
        }
        
        // Bottom
        if (y + size < this.gridSize) {
            sum += this.getValue(x, y + size);
            count++;
        }
        
        // Left
        if (x - size >= 0) {
            sum += this.getValue(x - size, y);
            count++;
        }
        
        // Average valid neighbors
        const avg = sum / count;
        
        // Add random displacement
        this.setValue(x, y, randomShift(avg, roughness));
    }
    
    // Helper to get value from terrain map with additional safety checks
    getValue(x, y) {
        // Check for NaN or non-finite inputs
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn('TerrainGenerator: getValue received invalid coordinates:', x, y);
            return 0;
        }
        
        // Round coordinates to integers to avoid fractional indexing
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        // Bounds check
        if (xi < 0 || yi < 0 || xi >= this.gridSize || yi >= this.gridSize) {
            // Out of bounds but not logging as this is expected at edges
            return 0;
        }
        
        // Calculate index with bounds check to prevent array overflow
        const index = yi * this.gridSize + xi;
        if (index < 0 || index >= this.terrainMap.length) {
            console.warn('TerrainGenerator: Calculated invalid map index:', index);
            return 0;
        }
        
        // Retrieve and validate the value
        const val = this.terrainMap[index];
        if (isNaN(val) || !isFinite(val)) {
            console.warn('TerrainGenerator: Retrieved invalid terrain value at', xi, yi);
            return 0;
        }
        
        return val;
    }
    
    // Helper to set value in terrain map with additional safety checks
    setValue(x, y, value) {
        // Check for NaN or non-finite inputs
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn('TerrainGenerator: setValue received invalid coordinates:', x, y);
            return;
        }
        
        // Round coordinates to integers to avoid fractional indexing
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        // Bounds check
        if (xi < 0 || yi < 0 || xi >= this.gridSize || yi >= this.gridSize) {
            return;
        }
        
        // Calculate index with bounds check to prevent array overflow
        const index = yi * this.gridSize + xi;
        if (index < 0 || index >= this.terrainMap.length) {
            console.warn('TerrainGenerator: Calculated invalid map index for setting:', index);
            return;
        }
        
        // Check if the input value is valid
        if (isNaN(value) || !isFinite(value)) {
            console.warn('TerrainGenerator: Attempted to set invalid terrain value:', value);
            value = 0.5; // Use a safe default
        }
        
        // Ensure value is between 0 and 1
        this.terrainMap[index] = clamp(value, 0, 1);
    }
}

export default TerrainGenerator;