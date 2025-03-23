// Terrain Generation using Diamond-Square algorithm
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
    
    // Micro-evolve for subtle constant movement
    microEvolve(rate) {
        // Apply very subtle evolution to random points
        for (let i = 0; i < 10; i++) {
            const index = Math.floor(Math.random() * this.terrainMap.length);
            const currentValue = this.terrainMap[index];
            const shift = (Math.random() * 2 - 1) * rate;
            this.terrainMap[index] = Math.max(0, Math.min(1, currentValue + shift));
        }
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        for (let i = 0; i < this.terrainMap.length; i++) {
            const currentValue = this.terrainMap[i];
            const shift = (Math.random() * 2 - 1) * rate;
            this.terrainMap[i] = Math.max(0, Math.min(1, currentValue + shift));
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
        const displacement = (Math.random() * 2 - 1) * roughness;
        this.setValue(x, y, avg + displacement);
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
        const displacement = (Math.random() * 2 - 1) * roughness;
        this.setValue(x, y, avg + displacement);
    }
    
    // Helper to get value from terrain map
    getValue(x, y) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return 0;
        }
        return this.terrainMap[y * this.gridSize + x];
    }
    
    // Helper to set value in terrain map
    setValue(x, y, value) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return;
        }
        // Ensure value is between 0 and 1
        this.terrainMap[y * this.gridSize + x] = Math.max(0, Math.min(1, value));
    }
}

export default TerrainGenerator;