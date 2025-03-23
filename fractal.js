class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Default options
        this.options = {
            roughness: 0.5,
            palette: 'earth',
            seedPoints: [],
            ...options
        };
        
        // Grid size - using a power of 2 plus 1
        this.gridSize = 129;
        this.terrainMap = new Array(this.gridSize * this.gridSize).fill(0);
        
        // Color palettes
        this.palettes = {
            earth: ['#0f5e9c', '#2389da', '#1fab89', '#6cca78', '#bef992', '#eeeebb', '#d6ae96', '#b8763e', '#7f5a3d', '#ffffff'],
            ocean: ['#000033', '#000066', '#0000aa', '#0066cc', '#00aaff', '#33ccff', '#66ffff', '#99ffff', '#ccffff', '#ffffff'],
            fire: ['#000000', '#1f0000', '#3f0000', '#6f0000', '#af0000', '#df3f00', '#ff7f00', '#ffbf00', '#ffff00', '#ffffff'],
            forest: ['#071a07', '#0f2f0f', '#174f17', '#1f6f1f', '#278f27', '#2faf2f', '#37cf37', '#8fef8f', '#b7f7b7', '#ffffff']
        };
        
        // Initialize the terrain
        this.initTerrain();
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
        for (const seed of this.options.seedPoints) {
            const { x, y, value } = seed;
            const gridX = Math.floor(x * size);
            const gridY = Math.floor(y * size);
            this.setValue(gridX, gridY, value);
        }
        
        // Run the diamond-square algorithm
        this.diamondSquare(size);
    }
    
    // Diamond-Square algorithm for terrain generation
    diamondSquare(size) {
        let step = size;
        let roughness = this.options.roughness;
        
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
    
    // Add a seed point to influence the terrain
    addSeedPoint(x, y, value) {
        const seedPoint = { x, y, value };
        this.options.seedPoints.push(seedPoint);
        
        // Update the terrain with the new seed point
        const gridX = Math.floor(x * (this.gridSize - 1));
        const gridY = Math.floor(y * (this.gridSize - 1));
        this.setValue(gridX, gridY, value);
        
        // Re-run the algorithm
        this.diamondSquare(this.gridSize - 1);
    }
    
    // Update options and regenerate
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.initTerrain();
    }
    
    // Evolve the landscape by slightly shifting values
    evolve(rate = 0.01) {
        for (let i = 0; i < this.terrainMap.length; i++) {
            const currentValue = this.terrainMap[i];
            const shift = (Math.random() * 2 - 1) * rate;
            this.terrainMap[i] = Math.max(0, Math.min(1, currentValue + shift));
        }
    }
    
    // Render the terrain to the canvas
    render() {
        // Make sure canvas dimensions match the container
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Get selected color palette
        const palette = this.palettes[this.options.palette];
        
        // Calculate pixel size
        const pixelWidth = this.width / (this.gridSize - 1);
        const pixelHeight = this.height / (this.gridSize - 1);
        
        // Draw the terrain
        for (let y = 0; y < this.gridSize - 1; y++) {
            for (let x = 0; x < this.gridSize - 1; x++) {
                const value = this.getValue(x, y);
                
                // Map value to color index (0-9)
                const colorIndex = Math.min(9, Math.floor(value * 10));
                this.ctx.fillStyle = palette[colorIndex];
                
                // Draw pixel
                this.ctx.fillRect(
                    x * pixelWidth,
                    y * pixelHeight,
                    pixelWidth + 1, // +1 to prevent gaps
                    pixelHeight + 1
                );
            }
        }
    }
}