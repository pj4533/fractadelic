// Manages particle effects
class ParticleSystem {
    constructor(terrainGenerator, colorManager, maxParticles = 100) {
        this.terrainGenerator = terrainGenerator;
        this.colorManager = colorManager;
        this.particles = [];
        this.maxParticles = maxParticles;
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

export default ParticleSystem;