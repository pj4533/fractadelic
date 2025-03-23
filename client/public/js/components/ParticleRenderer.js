// ParticleRenderer class - Handles particle rendering
class ParticleRenderer {
    constructor(ctx, terrainGenerator) {
        this.ctx = ctx;
        this.terrainGenerator = terrainGenerator;
        
        // Ensure terrainGenerator is properly initialized
        if (!this.terrainGenerator) {
            console.error("Error: terrainGenerator is undefined in ParticleRenderer constructor");
            // Set a default gridSize to prevent errors
            this.defaultGridSize = 128;
        }
    }
    
    // Render particles
    renderParticles(particleSystem, width, height) {
        if (!particleSystem) return; // Guard against undefined particleSystem
        
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
            
            // Safely access terrainGenerator with fallbacks
            let height = 0.5; // Default height value if we can't get from terrain
            
            if (this.terrainGenerator && typeof this.terrainGenerator.gridSize !== 'undefined') {
                const gridSize = this.terrainGenerator.gridSize || this.defaultGridSize;
                const gridX = Math.min(gridSize - 1, Math.floor(p.x / width * (gridSize - 1)));
                const gridY = Math.min(gridSize - 1, Math.floor(p.y / height * (gridSize - 1)));
                
                // Only try to get value if getValue exists
                if (typeof this.terrainGenerator.getValue === 'function') {
                    height = this.terrainGenerator.getValue(gridX, gridY);
                }
            }
            
            // Get particle color - create a local color instead of relying on particleSystem
            let particleColor;
            if (p.burstParticle) {
                // Burst particles use a bright white color
                const alpha = Math.round(ageOpacity * 255).toString(16).padStart(2,'0');
                particleColor = `#ffffff${alpha}`;
            } else {
                // Use a default color based on height
                const r = Math.floor(200 + height * 55);
                const g = Math.floor(200 + height * 55);
                const b = Math.floor(220 + height * 35);
                particleColor = `rgba(${r}, ${g}, ${b}, ${ageOpacity * p.brightness})`;
            }
            
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
            
            // Safely access terrainGenerator with fallbacks
            let height = 0.5; // Default height value if we can't get from terrain
            
            if (this.terrainGenerator && typeof this.terrainGenerator.gridSize !== 'undefined') {
                const gridSize = this.terrainGenerator.gridSize || this.defaultGridSize;
                const gridX = Math.min(gridSize - 1, Math.floor(p.x / width * (gridSize - 1)));
                const gridY = Math.min(gridSize - 1, Math.floor(p.y / height * (gridSize - 1)));
                
                // Only try to get value if getValue exists
                if (typeof this.terrainGenerator.getValue === 'function') {
                    height = this.terrainGenerator.getValue(gridX, gridY);
                }
            }
            
            // Get particle color - create a local color instead of relying on particleSystem
            let particleColor;
            if (p.burstParticle) {
                // Burst particles use a bright white color
                const alpha = Math.round(ageOpacity * 255).toString(16).padStart(2,'0');
                particleColor = `#ffffff${alpha}`;
            } else {
                // Use a default color based on height
                const r = Math.floor(200 + height * 55);
                const g = Math.floor(200 + height * 55);
                const b = Math.floor(220 + height * 35);
                particleColor = `rgba(${r}, ${g}, ${b}, ${ageOpacity * p.brightness})`;
            }
            
            // Draw glowing particle (only for burst particles)
            const radius = p.size * (1 - p.age / p.lifetime) * 3;
            
            // Draw glow
            const gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, radius * 2
            );
            // For burst particles, use the hex color format
            if (particleColor.startsWith('#')) {
                gradient.addColorStop(0, particleColor);
                gradient.addColorStop(1, `${particleColor.substring(0,7)}00`); // Transparent
            } else {
                // For rgba colors, create transparent version
                const rgbaBase = particleColor.substring(0, particleColor.lastIndexOf(','));
                gradient.addColorStop(0, particleColor);
                gradient.addColorStop(1, `${rgbaBase}, 0)`); // Transparent
            }
            
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