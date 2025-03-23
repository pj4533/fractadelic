class FractalLandscape {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Default options
        this.options = {
            roughness: 0.5,
            palette: 'cosmic',
            seedPoints: [],
            ...options
        };
        
        // Animation properties
        this.particles = [];
        this.ripples = [];
        this.maxParticles = 100;
        this.animationSpeed = 300; // Faster animation (was 1000ms)
        this.colorShift = 0;
        this.globalTime = 0;
        
        // Grid size - using a power of 2 plus 1 (smaller for faster rendering)
        this.gridSize = 65; // Was 129
        this.terrainMap = new Array(this.gridSize * this.gridSize).fill(0);
        
        // Enhanced vibrant color palettes
        this.palettes = {
            cosmic: ['#120136', '#035aa6', '#40bad5', '#60efff', '#b2fcff', '#fcff82', '#ff9c71', '#ff5050', '#d162a4', '#b000ff'],
            neon: ['#ff00cc', '#9600ff', '#4900ff', '#00b8ff', '#00fff9', '#00ffa3', '#b6ff00', '#fbff00', '#ff9100', '#ff0000'],
            candy: ['#ea00ff', '#aa00ff', '#7500ff', '#4d00ff', '#2600ff', '#00fff5', '#00ff85', '#00ff3a', '#caff00', '#f9ff00'],
            sunset: ['#0d0221', '#0f4c81', '#168aad', '#34c4e3', '#56e0e0', '#70d6ff', '#ff70a6', '#ff9770', '#ffd670', '#fffd82']
        };
        
        // Add more palettes
        this.palettes.lava = ['#000000', '#240046', '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd', '#c77dff', '#ff7c43', '#ff5a5f', '#ff9e00'];
        this.palettes.rainbow = ['#ff0000', '#ff8700', '#ffd300', '#deff0a', '#a1ff0a', '#0aff99', '#0aefff', '#147df5', '#580aff', '#be0aff'];
        
        // Add original palettes for backward compatibility
        this.palettes.earth = ['#0f5e9c', '#2389da', '#1fab89', '#6cca78', '#bef992', '#eeeebb', '#d6ae96', '#b8763e', '#7f5a3d', '#ffffff'];
        this.palettes.ocean = ['#000033', '#000066', '#0000aa', '#0066cc', '#00aaff', '#33ccff', '#66ffff', '#99ffff', '#ccffff', '#ffffff'];
        this.palettes.fire = ['#000000', '#1f0000', '#3f0000', '#6f0000', '#af0000', '#df3f00', '#ff7f00', '#ffbf00', '#ffff00', '#ffffff'];
        this.palettes.forest = ['#071a07', '#0f2f0f', '#174f17', '#1f6f1f', '#278f27', '#2faf2f', '#37cf37', '#8fef8f', '#b7f7b7', '#ffffff'];
        
        // Animation timing
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        
        // Initialize the terrain
        this.initTerrain();
        
        // Start continuous animation loop
        this.startContinuousAnimation();
    }
    
    // Continuously animate the landscape for flowing, vibrant visuals
    startContinuousAnimation() {
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Animation loop that runs continuously
    continuousAnimation(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update global time for color shifts
        this.globalTime += deltaTime * 0.001;
        this.colorShift = (this.colorShift + deltaTime * 0.0002) % 1;

        // Auto-evolve the landscape very subtly
        if (timestamp - this.lastAutoEvolutionTime > 100) { // Micro-evolve every 100ms
            this.microEvolve(0.001);
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update ripples
        this.updateRipples(deltaTime);
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
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
        
        // Create initial particles
        this.initializeParticles();
    }
    
    // Create particles based on terrain
    initializeParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.maxParticles; i++) {
            this.addRandomParticle();
        }
    }
    
    // Add a particle at a random position
    addRandomParticle() {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        
        // Find the height at this position
        const gridX = Math.floor(x / this.width * (this.gridSize - 1));
        const gridY = Math.floor(y / this.height * (this.gridSize - 1));
        const height = this.getValue(gridX, gridY);
        
        // Higher areas get brighter particles
        const brightness = 0.7 + height * 0.3;
        const size = 1 + height * 3;
        const speed = 0.5 + height * 2;
        
        this.particles.push({
            x, y, 
            size,
            speed,
            brightness,
            direction: Math.random() * Math.PI * 2,
            lifetime: 10000 + Math.random() * 15000,
            age: 0
        });
    }
    
    // Update all particles
    updateParticles(deltaTime) {
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update age
            p.age += deltaTime;
            if (p.age > p.lifetime) {
                // Remove old particles
                this.particles.splice(i, 1);
                continue;
            }
            
            // Move the particle
            p.x += Math.cos(p.direction) * p.speed * (deltaTime / 100);
            p.y += Math.sin(p.direction) * p.speed * (deltaTime / 100);
            
            // Change direction slightly
            p.direction += (Math.random() - 0.5) * 0.2;
            
            // Check boundaries
            if (p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
                // Bounce off edges
                if (p.x < 0) p.direction = Math.PI - p.direction;
                if (p.x > this.width) p.direction = Math.PI - p.direction;
                if (p.y < 0) p.direction = -p.direction;
                if (p.y > this.height) p.direction = -p.direction;
                
                // Ensure it's inside
                p.x = Math.max(0, Math.min(this.width, p.x));
                p.y = Math.max(0, Math.min(this.height, p.y));
            }
        }
        
        // Add new particles if needed
        while (this.particles.length < this.maxParticles) {
            this.addRandomParticle();
        }
    }
    
    // Create a ripple effect 
    addRipple(x, y, value) {
        const ripple = {
            x: x * this.width,
            y: y * this.height,
            maxRadius: Math.max(this.width, this.height) * 0.4,
            currentRadius: 0,
            thickness: 8,
            opacity: 1,
            speed: 0.15,
            color: this.getHeightColor(value)
        };
        
        this.ripples.push(ripple);
    }
    
    // Update ripples
    updateRipples(deltaTime) {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            
            // Expand ripple
            ripple.currentRadius += ripple.speed * deltaTime;
            ripple.opacity = 1 - (ripple.currentRadius / ripple.maxRadius);
            
            // Remove ripples that have expanded fully
            if (ripple.currentRadius >= ripple.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }
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
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        const seedPoint = { x, y, value };
        this.options.seedPoints.push(seedPoint);
        
        // Update the terrain with the new seed point
        const gridX = Math.floor(x * (this.gridSize - 1));
        const gridY = Math.floor(y * (this.gridSize - 1));
        this.setValue(gridX, gridY, value);
        
        // Re-run the algorithm
        this.diamondSquare(this.gridSize - 1);
        
        // Add a ripple effect at the seed point
        this.addRipple(x, y, value);
        
        // Add a burst of particles
        this.addParticleBurst(x * this.width, y * this.height, value);
    }
    
    // Add a burst of particles
    addParticleBurst(x, y, intensity) {
        const numParticles = 20 + Math.floor(intensity * 30);
        
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 5;
            const distance = 20 + Math.random() * 50;
            const size = 1 + Math.random() * 3;
            
            const particleX = x + Math.cos(angle) * Math.random() * 10;
            const particleY = y + Math.sin(angle) * Math.random() * 10;
            
            this.particles.push({
                x: particleX, 
                y: particleY,
                size,
                speed,
                brightness: 0.8 + Math.random() * 0.2,
                direction: angle,
                lifetime: 1000 + Math.random() * 3000,
                age: 0,
                burstParticle: true
            });
        }
    }
    
    // Update options with fast transition
    updateOptions(options) {
        // Check if this is a palette change
        const isPaletteChange = options.palette && options.palette !== this.options.palette;
        
        // Update options
        this.options = { ...this.options, ...options };
        
        // Only regenerate terrain if roughness changed
        if (options.roughness !== undefined) {
            this.initTerrain();
            
            // Add a few ripples for visual interest
            for (let i = 0; i < 3; i++) {
                const x = Math.random();
                const y = Math.random();
                const value = 0.5 + Math.random() * 0.5;
                this.addRipple(x, y, value);
            }
        }
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
        
        // Add random ripples for visual effect
        for (let i = 0; i < 5; i++) {
            const x = Math.random();
            const y = Math.random();
            const value = Math.random();
            this.addRipple(x, y, value);
        }
        
        // Renew particles to match new terrain
        this.initializeParticles();
    }
    
    // Get a color for a height value with shifting
    getHeightColor(height, animate = true) {
        const palette = this.palettes[this.options.palette];
        
        // Apply color shifting for animation
        let shiftedHeight = height;
        if (animate) {
            // Shift the height value based on the global time
            shiftedHeight = (height + this.colorShift) % 1;
        }
        
        // Map to color index
        const colorIndex = Math.min(palette.length - 1, Math.floor(shiftedHeight * palette.length));
        return palette[colorIndex];
    }
    
    // Get color with a pulsating glow effect
    getGlowColor(color, x, y) {
        // Extract RGB components
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        
        // Calculate a pulsating factor based on position and time
        const pulseFactor = 0.2 * Math.sin(x / 30 + y / 30 + this.globalTime * 2) + 1;
        
        // Apply the pulse factor
        const rNew = Math.min(255, Math.round(r * pulseFactor));
        const gNew = Math.min(255, Math.round(g * pulseFactor));
        const bNew = Math.min(255, Math.round(b * pulseFactor));
        
        // Convert back to hex
        return `#${rNew.toString(16).padStart(2, '0')}${gNew.toString(16).padStart(2, '0')}${bNew.toString(16).padStart(2, '0')}`;
    }
    
    // Render the terrain to the canvas
    render() {
        // Make sure canvas dimensions match the container
        if (this.canvas.width !== this.canvas.clientWidth || 
            this.canvas.height !== this.canvas.clientHeight) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate pixel size - make pixels larger for a more abstract look
        const pixelWidth = this.width / (this.gridSize - 1);
        const pixelHeight = this.height / (this.gridSize - 1);
        
        // Draw the terrain with pulsating glow
        for (let y = 0; y < this.gridSize - 1; y++) {
            for (let x = 0; x < this.gridSize - 1; x++) {
                const value = this.getValue(x, y);
                const baseColor = this.getHeightColor(value);
                const glowColor = this.getGlowColor(baseColor, x, y);
                
                this.ctx.fillStyle = glowColor;
                
                // Draw rounded pixels for a smoother look
                const xPos = x * pixelWidth;
                const yPos = y * pixelHeight;
                
                // Use rounded rectangles for a smoother appearance
                this.ctx.beginPath();
                this.ctx.roundRect(
                    xPos, 
                    yPos, 
                    pixelWidth + 1, 
                    pixelHeight + 1,
                    2 // Corner radius
                );
                this.ctx.fill();
            }
        }
        
        // Draw ripples
        for (const ripple of this.ripples) {
            this.ctx.strokeStyle = `${ripple.color}${Math.round(ripple.opacity * 255).toString(16).padStart(2,'0')}`;
            this.ctx.lineWidth = ripple.thickness;
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw particles with glow
        for (const p of this.particles) {
            // Calculate opacity based on age
            const ageOpacity = 1 - (p.age / p.lifetime);
            
            // Get grid position and height
            const gridX = Math.floor(p.x / this.width * (this.gridSize - 1));
            const gridY = Math.floor(p.y / this.height * (this.gridSize - 1));
            const height = this.getValue(gridX, gridY);
            
            // Get color from height
            let particleColor;
            if (p.burstParticle) {
                // Burst particles use a bright white-to-palette color
                const alpha = Math.round(ageOpacity * 255).toString(16).padStart(2,'0');
                particleColor = `#ffffff${alpha}`;
            } else {
                // Normal particles use terrain height color
                const color = this.getHeightColor(height, true);
                const alpha = Math.round(ageOpacity * p.brightness * 255).toString(16).padStart(2,'0');
                particleColor = `${color}${alpha}`;
            }
            
            // Draw glowing particle
            const radius = p.burstParticle ? 
                p.size * (1 - p.age / p.lifetime) * 3 : 
                p.size;
                
            this.ctx.save();
            
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
            
            this.ctx.restore();
        }
    }
}