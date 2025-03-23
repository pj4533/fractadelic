import ColorManager from './ColorManager.js';
import TerrainGenerator from './TerrainGenerator.js';
import ParticleSystem from './ParticleSystem.js';

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
            particleDensity: 0.5,    // 0.1 to 1.0 - controls number of particles
            glowIntensity: 0.5,      // 0.1 to 1.0 - controls glow effect
            waveIntensity: 0.5,      // 0.1 to 1.0 - controls wave-like movement
            useServerSync: true,     // Whether to use server-synchronized animation
            ...options
        };
        
        // Animation properties
        this.globalTime = 0;
        this.lastFrameTime = 0;
        this.lastAutoEvolutionTime = 0;
        this.waveOffset = 0;
        this.useServerSync = this.options.useServerSync;
        
        // Initialize components
        this.colorManager = new ColorManager(this.options.palette);
        this.terrainGenerator = new TerrainGenerator(
            this.options.roughness, 
            this.options.seedPoints
        );
        this.particleSystem = new ParticleSystem(
            this.terrainGenerator,
            this.colorManager,
            this.calculateParticleCount(this.options.particleDensity)
        );
        
        // Initialize the terrain
        this.terrainGenerator.initTerrain();
        
        // Initialize particles
        this.particleSystem.initializeParticles(this.width, this.height);
        
        // Start continuous animation loop
        this.startContinuousAnimation();
    }
    
    // Calculate particle count based on density parameter
    calculateParticleCount(density) {
        // Map density 0.1-1.0 to particle count 20-300
        return Math.floor(20 + (density * 280));
    }
    
    // Continuously animate the landscape for flowing, vibrant visuals
    startContinuousAnimation() {
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Animation loop that runs continuously
    continuousAnimation(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = Math.min(timestamp - this.lastFrameTime, 33); // Cap at ~30fps to avoid large jumps
        this.lastFrameTime = timestamp;
        
        if (this.useServerSync && this.syncData) {
            // In server sync mode, use the rate-based synchronization system
            // This creates smooth animations that follow server values without jumps
            this.applyServerSync(deltaTime);
        } else {
            // In local mode, use direct increments
            // Use smaller increment values for smoother transitions
            this.globalTime += deltaTime * 0.0005; // Half the original rate for smoother motion
            
            // Use smaller waveOffset increments for smoother transitions
            this.waveOffset += (deltaTime * 0.0005) * this.options.waveIntensity;
        }
        
        // Update color shift (in both modes)
        this.colorManager.updateColorShift(deltaTime * 0.5); // Even slower color shifts
        
        // Auto-evolve less frequently and with smaller values
        if (timestamp - this.lastAutoEvolutionTime > 250) { // Even lower frequency
            this.terrainGenerator.microEvolve(0.0003); // Smaller evolution amount
            this.lastAutoEvolutionTime = timestamp;
        }
        
        // Update particles
        this.particleSystem.updateParticles(deltaTime, this.width, this.height);
        
        // Render
        this.render();
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.continuousAnimation.bind(this));
    }
    
    // Add a seed point with ripple effect
    addSeedPoint(x, y, value) {
        // Add to terrain generator
        this.terrainGenerator.addSeedPoint(x, y, value);
        
        
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
        
        // Update particle density
        if (options.particleDensity !== undefined) {
            this.particleSystem.maxParticles = this.calculateParticleCount(options.particleDensity);
            
            // Create particle explosion effect when increasing density
            if (this.particleSystem.particles.length < this.particleSystem.maxParticles) {
                for (let i = 0; i < 5; i++) {
                    const x = Math.random();
                    const y = Math.random();
                    this.particleSystem.addParticleBurst(x * this.width, y * this.height, 0.8);
                }
            }
        }
        
        // Only regenerate terrain if roughness changed
        if (options.roughness !== undefined) {
            this.terrainGenerator.setRoughness(options.roughness);
            this.terrainGenerator.initTerrain();
            
        }
        
        // Update server sync preference
        if (options.useServerSync !== undefined) {
            this.useServerSync = options.useServerSync;
        }
    }
    
    // Update animation state from server
    updateAnimationState(animState) {
        if (!this.useServerSync) return;
        
        // Store the shared random seed for deterministic random operations
        if (animState.sharedSeed !== undefined) {
            this.sharedSeed = animState.sharedSeed;
            // Set seed for particle system
            this.particleSystem.setSharedSeed(this.sharedSeed);
        }
        
        // Initialize local sync state if needed
        if (!this.syncData) {
            this.syncData = {
                // Store last server values received
                lastServerGlobalTime: this.globalTime,
                lastServerWaveOffset: this.waveOffset,
                lastServerColorShift: this.colorManager.colorShift,
                
                // Store deltas (rate of change from server)
                globalTimeDelta: 0.016, // Default frames (60fps)
                waveOffsetDelta: 0.008, // Default wave movement
                colorShiftDelta: 0.0000032, // Default color shift
                
                // Last update timestamp
                lastUpdateTime: performance.now(),
                
                // Server updates counter
                updateCounter: 0
            };
        }
        
        const now = performance.now();
        const timeSinceLastUpdate = (now - this.syncData.lastUpdateTime) / 1000; // in seconds
        this.syncData.lastUpdateTime = now;
        
        // Don't allow backward jumps in time/animation - only accelerate or decelerate
        if (animState.isSyncCheckpoint) {
            this.syncData.updateCounter++;
            
            // Calculate how much the server values changed since last sync
            if (animState.globalTime !== undefined) {
                const serverTimeDiff = animState.globalTime - this.syncData.lastServerGlobalTime;
                // Update stored server values
                this.syncData.lastServerGlobalTime = animState.globalTime;
                
                // Calculate rate of change per second (rather than directly setting values)
                // This prevents jumps by making the client match velocity instead of position
                if (serverTimeDiff > 0 && timeSinceLastUpdate > 0) {
                    // Target delta: how fast server time is advancing
                    const targetDelta = serverTimeDiff / timeSinceLastUpdate;
                    // Blend current delta with target (80% current, 20% target) for stability
                    this.syncData.globalTimeDelta = 0.8 * this.syncData.globalTimeDelta + 0.2 * targetDelta;
                }
            }
            
            // Calculate wave offset delta (rate of change)
            if (animState.waveOffset !== undefined) {
                const serverWaveOffsetValue = animState.waveOffset * this.options.waveIntensity;
                const serverWaveDiff = serverWaveOffsetValue - this.syncData.lastServerWaveOffset;
                this.syncData.lastServerWaveOffset = serverWaveOffsetValue;
                
                if (serverWaveDiff !== 0 && timeSinceLastUpdate > 0) {
                    // Target delta: how fast server wave is changing
                    const targetDelta = serverWaveDiff / timeSinceLastUpdate;
                    // Blend deltas very gradually (95% current, 5% target) for smooth transitions
                    this.syncData.waveOffsetDelta = 0.95 * this.syncData.waveOffsetDelta + 0.05 * targetDelta;
                }
            }
            
            // Calculate color shift delta (rate of change)
            if (animState.colorShift !== undefined) {
                const serverColorDiff = animState.colorShift - this.syncData.lastServerColorShift;
                this.syncData.lastServerColorShift = animState.colorShift;
                
                if (serverColorDiff !== 0 && timeSinceLastUpdate > 0) {
                    const targetDelta = serverColorDiff / timeSinceLastUpdate;
                    this.syncData.colorShiftDelta = 0.95 * this.syncData.colorShiftDelta + 0.05 * targetDelta;
                }
            }
        }
        
        // Perform microEvolve if signaled by server
        if (animState.microEvolve) {
            this.terrainGenerator.microEvolve(0.0003); // Even smaller value for smoother changes
        }
    }
    
    // Apply server-driven animation parameters in local animation loop
    // This method should be called from continuousAnimation
    applyServerSync(deltaTime) {
        if (!this.useServerSync || !this.syncData) return;
        
        // Convert deltaTime to seconds
        const dt = deltaTime * 0.001;
        
        // Update values based on deltas (rates of change) rather than absolute values
        // This creates smooth transitions without jumps
        this.globalTime += this.syncData.globalTimeDelta * dt;
        this.waveOffset += this.syncData.waveOffsetDelta * dt;
        
        // Smoothly adjust color shift
        this.colorManager.colorShift += this.syncData.colorShiftDelta * dt;
        // Keep color shift in 0-1 range
        if (this.colorManager.colorShift > 1) this.colorManager.colorShift -= 1;
        if (this.colorManager.colorShift < 0) this.colorManager.colorShift += 1;
    }
    
    // Easing function for smooth interpolation
    easeInOutCubic(t) {
        return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Get deterministic random value using shared seed
    getSharedRandom() {
        // Simple deterministic pseudo-random using shared seed
        this.sharedSeed = (this.sharedSeed * 9301 + 49297) % 233280;
        return this.sharedSeed / 233280;
    }
    
    // Evolve the landscape with dramatic effect
    evolve(rate = 0.02) {  // Increased rate for more visible changes
        // Apply evolution to the map
        this.terrainGenerator.evolve(rate);
        
        
        // Renew particles to match new terrain
        this.particleSystem.initializeParticles(this.width, this.height);
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
        
        
        // Render particles
        this.renderParticles();
    }
    
    // Render terrain using triangular mesh with optimized gradient shading
    renderTerrain(pixelWidth, pixelHeight) {
        // Use a smaller effective grid size for better performance
        // Skip every other point in busy scenes
        const skipFactor = Math.max(1, Math.floor(this.terrainGenerator.gridSize / 40));
        
        // Draw the terrain as a continuous triangular mesh with gradient shading
        for (let y = 0; y < this.terrainGenerator.gridSize - skipFactor; y += skipFactor) {
            for (let x = 0; x < this.terrainGenerator.gridSize - skipFactor; x += skipFactor) {
                // Get the four corners of the current grid cell
                const points = [
                    { x, y },                         // Top-left
                    { x: x + skipFactor, y },         // Top-right
                    { x: x + skipFactor, y: y + skipFactor },  // Bottom-right
                    { x, y: y + skipFactor }          // Bottom-left
                ];
                
                // Precompute wave effect for this cell to avoid redundant calculations
                const cellWaveEffect = this.options.waveIntensity * 
                    Math.sin((x + y) / 5 + this.waveOffset * 3) * 5; // Reduced multiplier
                
                // Calculate wave-affected positions and values for each corner
                const corners = points.map(p => {
                    // Use simpler wave calculation with fewer trig functions
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = this.options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, this.globalTime, glowIntensity
                    );
                    
                    // Apply wave distortion to positions - simplified calculation
                    const waveX = cellWaveEffect * Math.sin(p.y / 10 + this.waveOffset);
                    const waveY = cellWaveEffect * Math.cos(p.x / 10 + this.waveOffset);
                    const xPos = p.x * pixelWidth + waveX;
                    const yPos = p.y * pixelHeight + waveY;
                    
                    return { xPos, yPos, color: glowColor };
                });
                
                // Draw first triangle (top-left, top-right, bottom-left)
                this.drawOptimizedTriangle(
                    corners[0].xPos, corners[0].yPos, corners[0].color,
                    corners[1].xPos, corners[1].yPos, corners[1].color,
                    corners[3].xPos, corners[3].yPos, corners[3].color
                );
                
                // Draw second triangle (bottom-left, top-right, bottom-right)
                this.drawOptimizedTriangle(
                    corners[3].xPos, corners[3].yPos, corners[3].color,
                    corners[1].xPos, corners[1].yPos, corners[1].color,
                    corners[2].xPos, corners[2].yPos, corners[2].color
                );
            }
        }
    }
    
    // Draw a triangle with a simpler coloring approach for better performance
    drawOptimizedTriangle(x1, y1, color1, x2, y2, color2, x3, y3, color3) {
        // Create a triangle path
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.closePath();
        
        // Use a simpler coloring approach - average the colors
        // This is much faster than creating a gradient for each triangle
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        const r3 = parseInt(color3.substring(1, 3), 16);
        const g3 = parseInt(color3.substring(3, 5), 16);
        const b3 = parseInt(color3.substring(5, 7), 16);
        
        // Calculate average color
        const avgR = Math.floor((r1 + r2 + r3) / 3);
        const avgG = Math.floor((g1 + g2 + g3) / 3);
        const avgB = Math.floor((b1 + b2 + b3) / 3);
        
        // Convert to hex color
        const avgColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
        
        // Fill with average color
        this.ctx.fillStyle = avgColor;
        this.ctx.fill();
    }
    
    
    // Render particles with optimized approach
    renderParticles() {
        // Batch particles by type for better rendering performance
        const standardParticles = [];
        const burstParticles = [];
        
        // Group particles to minimize context changes
        for (const p of this.particleSystem.particles) {
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
                          Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1)));
            const gridY = Math.min(this.terrainGenerator.gridSize - 1, 
                          Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1)));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color - faster method
            const particleColor = this.particleSystem.getParticleColor(p, height, ageOpacity);
            
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
            const gridX = Math.floor(p.x / this.width * (this.terrainGenerator.gridSize - 1));
            const gridY = Math.floor(p.y / this.height * (this.terrainGenerator.gridSize - 1));
            const height = this.terrainGenerator.getValue(gridX, gridY);
            
            // Get particle color
            const particleColor = this.particleSystem.getParticleColor(p, height, ageOpacity);
            
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

export { FractalLandscape };
export default FractalLandscape;