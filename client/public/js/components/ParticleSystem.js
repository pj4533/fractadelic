// Manages particle effects
class ParticleSystem {
    constructor(terrainGenerator, colorManager, maxParticles = 100) {
        this.terrainGenerator = terrainGenerator;
        this.colorManager = colorManager;
        this.particles = [];
        this.maxParticles = maxParticles;
        this.seed = 12345; // Default seed
    }
    
    // Set a shared seed for deterministic randomness
    setSharedSeed(seed) {
        this.seed = seed;
    }
    
    // Get deterministic random number
    getSeededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
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
        const x = this.getSeededRandom() * width;
        const y = this.getSeededRandom() * height;
        
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
            direction: this.getSeededRandom() * Math.PI * 2,
            lifetime: 10000 + this.getSeededRandom() * 15000,
            age: 0
        });
    }
    
    // Update all particles with optimized algorithm
    updateParticles(deltaTime, width, height) {
        // Cap delta time to avoid large jumps
        const cappedDeltaTime = Math.min(deltaTime, 33);
        
        // Optimize by skipping updates at regular intervals for better performance
        // Only process a subset of particles each frame
        const updateInterval = Math.max(1, Math.floor(this.particles.length / 100));
        
        // Update existing particles more efficiently
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update age
            p.age += cappedDeltaTime;
            if (p.age > p.lifetime) {
                // Remove old particles
                this.particles.splice(i, 1);
                continue;
            }
            
            // Only update position on some frames for better performance
            // This creates a more efficient particle system
            if (i % updateInterval === 0 || p.burstParticle) {
                // Move the particle with smaller steps
                const moveFactor = cappedDeltaTime / 150; // Slower movement
                p.x += Math.cos(p.direction) * p.speed * moveFactor;
                p.y += Math.sin(p.direction) * p.speed * moveFactor;
                
                // Change direction less frequently and with smaller changes
                if (Math.random() < 0.3) { // Only change direction sometimes
                    p.direction += (this.getSeededRandom() - 0.5) * 0.1; // Smaller change
                }
                
                // Simplified boundary check - just wrap around for better performance
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            }
        }
        
        // Add new particles if needed - but limit how many we add per frame
        const particlesToAdd = Math.min(5, this.maxParticles - this.particles.length);
        for (let i = 0; i < particlesToAdd; i++) {
            this.addRandomParticle(width, height);
        }
    }
    
    // Add a burst of particles
    addParticleBurst(x, y, intensity) {
        const numParticles = 20 + Math.floor(intensity * 30);
        
        for (let i = 0; i < numParticles; i++) {
            const angle = this.getSeededRandom() * Math.PI * 2;
            const speed = 1 + this.getSeededRandom() * 5;
            const distance = 20 + this.getSeededRandom() * 50;
            const size = 1 + this.getSeededRandom() * 3;
            
            const particleX = x + Math.cos(angle) * this.getSeededRandom() * 10;
            const particleY = y + Math.sin(angle) * this.getSeededRandom() * 10;
            
            this.particles.push({
                x: particleX, 
                y: particleY,
                size,
                speed,
                brightness: 0.8 + this.getSeededRandom() * 0.2,
                direction: angle,
                lifetime: 1000 + this.getSeededRandom() * 3000,
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

export default ParticleSystem;