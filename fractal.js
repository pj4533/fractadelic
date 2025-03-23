// Main FractalLandscape class - orchestrates all components
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
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        
        // Initialize components
        this.colorManager = new ColorManager(this.options.palette);
        this.terrainGenerator = new TerrainGenerator(
            this.options.roughness, 
            this.options.seedPoints
        );
        this.particleSystem = new ParticleSystem(
            this.terrainGenerator,
            this.colorManager
        );
        this.rippleEffect = new RippleEffect(
            this.width,
            this.height,
            this.colorManager
        );
        
        // Initialize the terrain
        this.terrainGenerator.initTerrain();
        
        // Initialize particles
        this.particleSystem.initializeParticles(this.width, this.height);
        
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
        this.colorManager.updateColorShift(deltaTime);

        // Auto-evolve the landscape very subtly
        if (timestamp - this.lastAutoEvolutionTime > 100) { // Micro-evolve every 100ms
            this.terrainGenerator.microEvolve(0.001);
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Update particles
        this.particleSystem.updateParticles(deltaTime, this.width, this.height);
        
        // Update ripples
        this.rippleEffect.updateRipples(deltaTime);
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
        
        // Add a ripple effect at the seed point
        this.rippleEffect.addRipple(x, y, value);
        
        // Add a burst of particles
        this.particleSystem.addParticleBurst(
            x * this.width, 
            y * this.height, 
            value
        );
    }
    
    // Update options with fast transition
    updateOptions(options) {
        // Update options
        this.options = { ...this.options, ...options };
        
        // Update components with new options
        if (options.palette) {
            this.colorManager.setPalette(options.palette);
        }
        
        // Only regenerate terrain if roughness changed
        if (options.roughness !== undefined) {
            this.terrainGenerator.setRoughness(options.roughness);
            this.terrainGenerator.initTerrain();
            
            // Add a few ripples for visual interest
            for (let i = 0; i < 3; i++) {
                const x = Math.random();
                const y = Math.random();
                const value = 0.5 + Math.random() * 0.5;
                this.rippleEffect.addRipple(x, y, value);
            }
        }
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
        
        // Add random ripples for visual effect
        for (let i = 0; i < 5; i++) {
            const x = Math.random();
            const y = Math.random();
            const value = Math.random();
            this.rippleEffect.addRipple(x, y, value);
        }
        
        // Renew particles to match new terrain
        this.particleSystem.initializeParticles(this.width, this.height);
    }
    
    // Add a ripple effect at the specified location
    addRipple(x, y, value) {
        this.rippleEffect.addRipple(x, y, value);
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
        
        // Calculate pixel size
        const pixelWidth = this.width / (this.terrainGenerator.gridSize - 1);
        const pixelHeight = this.height / (this.terrainGenerator.gridSize - 1);
        
        // Render terrain
        this.renderTerrain(pixelWidth, pixelHeight);
        
        // Render ripples
        this.renderRipples();
        
        // Render particles
        this.renderParticles();
    }
    
    // Render terrain
    renderTerrain(pixelWidth, pixelHeight) {
        // Draw the terrain with pulsating glow
        for (let y = 0; y < this.terrainGenerator.gridSize - 1; y++) {
            for (let x = 0; x < this.terrainGenerator.gridSize - 1; x++) {
                const value = this.terrainGenerator.getValue(x, y);
                const baseColor = this.colorManager.getHeightColor(value);
                const glowColor = this.colorManager.getGlowColor(baseColor, x, y, this.globalTime);
                
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
    }
    
    // Render ripples
    renderRipples() {
        for (const ripple of this.rippleEffect.ripples) {
            this.ctx.strokeStyle = `${ripple.color}${Math.round(ripple.opacity * 255).toString(16).padStart(2,'0')}`;
            this.ctx.lineWidth = ripple.thickness;
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    // Render particles
    renderParticles() {
        for (const p of this.particleSystem.particles) {
            // Calculate opacity based on age
            const ageOpacity = 1 - (p.age / p.lifetime);
            
            // Get grid position and height
            const gridX = Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1));
            const gridY = Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color from the particle system
            const particleColor = this.particleSystem.getParticleColor(
                p, height, ageOpacity
            );
            
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

// Color Management - handles palettes and color calculations
class ColorManager {
    constructor(paletteName) {
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
        
        this.currentPalette = paletteName || 'cosmic';
        this.colorShift = 0;
    }
    
    setPalette(paletteName) {
        if (this.palettes[paletteName]) {
            this.currentPalette = paletteName;
        }
    }
    
    updateColorShift(deltaTime) {
        this.colorShift = (this.colorShift + deltaTime * 0.0002) % 1;
    }
    
    // Get a color for a height value with shifting
    getHeightColor(height, animate = true) {
        const palette = this.palettes[this.currentPalette];
        
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
    getGlowColor(color, x, y, globalTime) {
        // Extract RGB components
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        
        // Calculate a pulsating factor based on position and time
        const pulseFactor = 0.2 * Math.sin(x / 30 + y / 30 + globalTime * 2) + 1;
        
        // Apply the pulse factor
        const rNew = Math.min(255, Math.round(r * pulseFactor));
        const gNew = Math.min(255, Math.round(g * pulseFactor));
        const bNew = Math.min(255, Math.round(b * pulseFactor));
        
        // Convert back to hex
        return `#${rNew.toString(16).padStart(2, '0')}${gNew.toString(16).padStart(2, '0')}${bNew.toString(16).padStart(2, '0')}`;
    }
}

// Terrain Generation using Diamond-Square algorithm
class TerrainGenerator {
    constructor(roughness, seedPoints = []) {
        this.roughness = roughness;
        this.seedPoints = seedPoints;
        
        // Grid size - using a power of 2 plus 1 (smaller for faster rendering)
        this.gridSize = 65; // Was 129
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

// Manages particle effects
class ParticleSystem {
    constructor(terrainGenerator, colorManager) {
        this.terrainGenerator = terrainGenerator;
        this.colorManager = colorManager;
        this.particles = [];
        this.maxParticles = 100;
    }
    
    // Create particles based on terrain
    initializeParticles(width, height) {
        this.particles = [];
        
        for (let i = 0; i < this.maxParticles; i++) {
            this.addRandomParticle(width, height);
        }
    }
    
    // Add a particle at a random position
    addRandomParticle(width, height) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        
        // Find the height at this position
        const gridX = Math.floor(x / width * (this.terrainGenerator.gridSize - 1));
        const gridY = Math.floor(y / height * (this.terrainGenerator.gridSize - 1));
        const terrainHeight = this.terrainGenerator.getValue(gridX, gridY);
        
        // Higher areas get brighter particles
        const brightness = 0.7 + terrainHeight * 0.3;
        const size = 1 + terrainHeight * 3;
        const speed = 0.5 + terrainHeight * 2;
        
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
    updateParticles(deltaTime, width, height) {
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
            if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                // Bounce off edges
                if (p.x < 0) p.direction = Math.PI - p.direction;
                if (p.x > width) p.direction = Math.PI - p.direction;
                if (p.y < 0) p.direction = -p.direction;
                if (p.y > height) p.direction = -p.direction;
                
                // Ensure it's inside
                p.x = Math.max(0, Math.min(width, p.x));
                p.y = Math.max(0, Math.min(height, p.y));
            }
        }
        
        // Add new particles if needed
        while (this.particles.length < this.maxParticles) {
            this.addRandomParticle(width, height);
        }
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
    
    // Get particle color
    getParticleColor(particle, terrainHeight, ageOpacity) {
        if (particle.burstParticle) {
            // Burst particles use a bright white-to-palette color
            const alpha = Math.round(ageOpacity * 255).toString(16).padStart(2,'0');
            return `#ffffff${alpha}`;
        } else {
            // Normal particles use terrain height color
            const color = this.colorManager.getHeightColor(terrainHeight, true);
            const alpha = Math.round(ageOpacity * particle.brightness * 255).toString(16).padStart(2,'0');
            return `${color}${alpha}`;
        }
    }
}

// Manages ripple effects
class RippleEffect {
    constructor(width, height, colorManager) {
        this.width = width;
        this.height = height;
        this.colorManager = colorManager;
        this.ripples = [];
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
            color: this.colorManager.getHeightColor(value)
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
    
    // Update width and height
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
    }
}