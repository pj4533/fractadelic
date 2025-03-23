// ParticleRenderer class - Handles particle rendering
class ParticleRenderer {
    constructor(ctx, terrainGenerator) {
        this.ctx = ctx;
        this.terrainGenerator = terrainGenerator;
    }
    
    // Render particles
    renderParticles(particleSystem, width, height) {
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
                         Math.floor(p.x / width * (this.terrainGenerator.gridSize - 1)));
            const gridY = Math.min(this.terrainGenerator.gridSize - 1, 
                         Math.floor(p.y / height * (this.terrainGenerator.gridSize - 1)));
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
            const gridX = Math.floor(p.x / width * (this.terrainGenerator.gridSize - 1));
            const gridY = Math.floor(p.y / height * (this.terrainGenerator.gridSize - 1));
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
}

export default ParticleRenderer;