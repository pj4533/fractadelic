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
    
    // Render terrain using fixed high density triangular mesh with anti-flashing
    renderTerrain(pixelWidth, pixelHeight) {
        // Static grid offset to prevent flashing (remain stable between frames)
        if (!this.gridOffset) {
            this.gridOffset = {
                lastWaveOffset: this.waveOffset,
                speedFactor: 0.05 // Slow down wave movement to reduce flashing
            };
        }
        
        // True adaptive rendering system that pushes GPU limits
        // Performance measurements to adapt level of detail
        if (!this.perfData) {
            this.perfData = {
                lastFpsCheck: performance.now(),
                frameCount: 0,
                fps: 60,
                adaptiveDetail: 0.1, // Start at high detail (lower = more detail)
                targetDetail: 0.1,   // Target detail level
                lastTarget: 0.1,     // Track last target for trend analysis
                minFrameTime: 9999,  // Track best frame time (ms)
                fpsHistory: [],      // Track FPS history
                detailHistory: [],   // Track detail level changes
                highDetailMode: true,
                triangleCount: 0,
                triangleTarget: 15000, // Higher target triangle count for better quality
                lastDetailChange: performance.now(),
                renderTime: 0,
                detailAreas: 0,
                triangleHistory: [],  // Track history for stability
                upCount: 0,          // Counter for consecutive increases
                downCount: 0         // Counter for consecutive decreases
            };
        }
        
        const renderStart = performance.now();
        
        // FPS-based adaptive detail level
        this.perfData.frameCount++;
        const now = performance.now();
        
        // Faster adaptations (check every 500ms instead of 1000ms)
        if (now - this.perfData.lastFpsCheck > 500) {
            // Calculate FPS
            const fps = this.perfData.frameCount * 1000 / (now - this.perfData.lastFpsCheck);
            this.perfData.fps = fps;
            this.perfData.frameCount = 0;
            this.perfData.lastFpsCheck = now;
            
            // Update FPS history
            this.perfData.fpsHistory.push(fps);
            if (this.perfData.fpsHistory.length > 10) {
                this.perfData.fpsHistory.shift();
            }
            
            // Only adjust detail if we have stable FPS history
            if (this.perfData.fpsHistory.length >= 3) {
                const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                               this.perfData.fpsHistory.length;
                
                // Wait at least 2 seconds between major detail changes to assess impact
                const timeSinceLastChange = now - this.perfData.lastDetailChange;
                const readyForChange = timeSinceLastChange > 2000;
                
                // Dynamic adaptation logic - MUCH more aggressive
                if (readyForChange) {
                    // Very aggressive increases for good performance
                    if (avgFps > 58 && this.perfData.triangleCount < 20000) {
                        // Significant detail increase - 20% more triangles
                        this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.8); // Min 0.05 to limit max detail
                        this.perfData.upCount++;
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "up", fps: avgFps});
                    } 
                    // Quick recovery if FPS drops too low
                    else if (avgFps < 45) {
                        // Emergency detail reduction - 50% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.5;
                        this.perfData.upCount = 0;
                        this.perfData.downCount++;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                        direction: "emergency", fps: avgFps});
                    }
                    // Moderate increases for good performance
                    else if (avgFps > 55 && this.perfData.triangleCount < 18000) {
                        // Moderate detail increase - 10% more triangles
                        this.perfData.targetDetail = Math.max(0.05, this.perfData.adaptiveDetail * 0.9); // Min 0.05 to limit max detail
                        this.perfData.upCount++;
                        this.perfData.downCount = 0;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                       direction: "up", fps: avgFps});
                    }
                    // Gradual reduction if performance is marginal
                    else if (avgFps < 50 && avgFps >= 45) {
                        // Gentle detail reduction - 10% fewer triangles
                        this.perfData.targetDetail = this.perfData.adaptiveDetail * 1.1;
                        this.perfData.upCount = 0;
                        this.perfData.downCount++;
                        this.perfData.lastDetailChange = now;
                        this.perfData.detailHistory.push({time: now, detail: this.perfData.targetDetail, 
                                                       direction: "down", fps: avgFps});
                    }
                }
                
                // Keep history manageable
                if (this.perfData.detailHistory.length > 20) {
                    this.perfData.detailHistory.shift();
                }
            }
            
            // Gradually approach target detail to avoid sudden changes
            const detailDiff = this.perfData.targetDetail - this.perfData.adaptiveDetail;
            // Faster adaptation - 50% toward target instead of 30%
            this.perfData.adaptiveDetail += detailDiff * 0.5;
            
            // Set lower bound dynamically based on history
            // Allow incredibly high detail if system proves it can handle it
            const avgFps = this.perfData.fpsHistory.reduce((a, b) => a + b, 0) / 
                           this.perfData.fpsHistory.length;
            if (this.perfData.upCount > 3 && avgFps > 58) {
                // System has shown it can handle high detail - push further but with higher limit
                this.perfData.triangleTarget = Math.min(25000, this.perfData.triangleTarget + 1000);
            }
        }
        
        // Determine detail level for this frame - force HIGH detail
        // Lower values = more detail (values below 1 = subdivided grid)
        const detailLevel = this.perfData.adaptiveDetail;
        
        // Determine appropriate level for device
        // Calculate base skip factor - smaller values = more triangles
        // Use an even smaller value to push for more detail
        const baseSkipFactor = Math.max(0.5, Math.floor(detailLevel * 4)) / 5;
        
        // Grid size is 65, so we'll use fixed high density
        const effectiveGridSize = this.terrainGenerator.gridSize;
        
        // Track triangle counts
        let triangleCount = 0;
        let detailAreaCount = 0;
        
        // Pre-allocate array for batch rendering
        if (!this.triangleBatch) {
            this.triangleBatch = [];
        }
        this.triangleBatch.length = 0;
        
        // Use anti-flashing technique: maintain stable positions between frames
        // Calculate stable wave offset by dampening changes between frames
        const currentWaveOffset = this.waveOffset;
        const waveDelta = currentWaveOffset - this.gridOffset.lastWaveOffset;
        
        // Only move a percentage of the full wave amount (reduces oscillation)
        const stableWaveOffset = this.gridOffset.lastWaveOffset + 
            (waveDelta * this.gridOffset.speedFactor);
        this.gridOffset.lastWaveOffset = stableWaveOffset;
        
        // Define a subdivision function to create more detailed areas
        const createSubdividedGrid = (startX, startY, size, detailFactor) => {
            // Base case - create triangles for this cell
            // Use absolute minimum size to force maximum subdivision
            if (size <= 1 || detailFactor >= 5) { // Increased threshold to allow even more subdivision
                // Create a quad (2 triangles) for this cell
                const points = [
                    { x: startX, y: startY },
                    { x: startX + size, y: startY },
                    { x: startX + size, y: startY + size },
                    { x: startX, y: startY + size }
                ];
                
                // Get wave effect for this cell - use stable offset to prevent flashing
                const cellWaveEffect = this.options.waveIntensity * 
                    Math.sin((startX + startY) / 5 + stableWaveOffset * 3) * 2;
                
                // Get corner data
                const corners = points.map(p => {
                    // Get terrain value for this position
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = this.options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, this.globalTime, glowIntensity
                    );
                    
                    // Apply wave effect - use stable offset to prevent flashing
                    const waveX = cellWaveEffect * Math.sin(p.y / 10 + stableWaveOffset);
                    const waveY = cellWaveEffect * Math.cos(p.x / 10 + stableWaveOffset);
                    const xPos = p.x * pixelWidth + waveX;
                    const yPos = p.y * pixelHeight + waveY;
                    
                    return { xPos, yPos, value, color: glowColor };
                });
                
                // Create triangles for this quad
                // First triangle (top-left, top-right, bottom-left)
                this.triangleBatch.push({
                    x1: corners[0].xPos, y1: corners[0].yPos, color1: corners[0].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[3].xPos, y3: corners[3].yPos, color3: corners[3].color,
                    height: (corners[0].value + corners[1].value + corners[3].value) / 3
                });
                
                // Second triangle (bottom-left, top-right, bottom-right)
                this.triangleBatch.push({
                    x1: corners[3].xPos, y1: corners[3].yPos, color1: corners[3].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[2].xPos, y3: corners[2].yPos, color3: corners[2].color,
                    height: (corners[3].value + corners[1].value + corners[2].value) / 3
                });
                
                triangleCount += 2;
                return;
            }
            
            // Always subdivide more for better detail
            const halfSize = size / 2;
            const centerX = startX + halfSize;
            const centerY = startY + halfSize;
            const centerHeight = this.terrainGenerator.getValue(centerX, centerY);
            
            // Check corner heights
            const nwHeight = this.terrainGenerator.getValue(startX, startY);
            const neHeight = this.terrainGenerator.getValue(startX + size, startY);
            const seHeight = this.terrainGenerator.getValue(startX + size, startY + size);
            const swHeight = this.terrainGenerator.getValue(startX, startY + size);
            
            // Calculate height variance in this cell
            const maxHeight = Math.max(nwHeight, neHeight, seHeight, swHeight);
            const minHeight = Math.min(nwHeight, neHeight, seHeight, swHeight);
            const heightDiff = maxHeight - minHeight;
            
            // More moderate thresholds to balance detail with the larger grid
            const isDetailArea = centerHeight > 0.35 || // Moderate threshold for peaks 
                               heightDiff > 0.03 ||   // Moderate threshold for variance
                               size > 3;              // Force subdivision for larger cells
            
            if (isDetailArea) { // Always subdivide if it's a detail area
                detailAreaCount++;
                // Subdivide further for detail areas
                const newSize = halfSize;
                const newDetail = detailFactor / 2;
                
                // Recursively subdivide into 4 quads
                createSubdividedGrid(startX, startY, newSize, newDetail);
                createSubdividedGrid(startX + newSize, startY, newSize, newDetail);
                createSubdividedGrid(startX, startY + newSize, newSize, newDetail);
                createSubdividedGrid(startX + newSize, startY + newSize, newSize, newDetail);
            } else {
                // Just create triangles for this cell (similar to base case)
                const points = [
                    { x: startX, y: startY },
                    { x: startX + size, y: startY },
                    { x: startX + size, y: startY + size },
                    { x: startX, y: startY + size }
                ];
                
                // Get wave effect for this cell - use stable offset to prevent flashing
                const cellWaveEffect = this.options.waveIntensity * 
                    Math.sin((startX + startY) / 5 + stableWaveOffset * 3) * 2;
                
                // Get corner data
                const corners = points.map(p => {
                    // Get terrain value for this position
                    const value = this.terrainGenerator.getValue(p.x, p.y);
                    const baseColor = this.colorManager.getHeightColor(value);
                    const glowIntensity = this.options.glowIntensity || 0.5;
                    const glowColor = this.colorManager.getGlowColor(
                        baseColor, p.x, p.y, this.globalTime, glowIntensity
                    );
                    
                    // Apply wave effect - use stable offset to prevent flashing
                    const waveX = cellWaveEffect * Math.sin(p.y / 10 + stableWaveOffset);
                    const waveY = cellWaveEffect * Math.cos(p.x / 10 + stableWaveOffset);
                    const xPos = p.x * pixelWidth + waveX;
                    const yPos = p.y * pixelHeight + waveY;
                    
                    return { xPos, yPos, value, color: glowColor };
                });
                
                // Create triangles for this quad
                // First triangle (top-left, top-right, bottom-left)
                this.triangleBatch.push({
                    x1: corners[0].xPos, y1: corners[0].yPos, color1: corners[0].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[3].xPos, y3: corners[3].yPos, color3: corners[3].color,
                    height: (corners[0].value + corners[1].value + corners[3].value) / 3
                });
                
                // Second triangle (bottom-left, top-right, bottom-right)
                this.triangleBatch.push({
                    x1: corners[3].xPos, y1: corners[3].yPos, color1: corners[3].color,
                    x2: corners[1].xPos, y2: corners[1].yPos, color2: corners[1].color,
                    x3: corners[2].xPos, y3: corners[2].yPos, color3: corners[2].color,
                    height: (corners[3].value + corners[1].value + corners[2].value) / 3
                });
                
                triangleCount += 2;
            }
        };
        
        // With larger gridSize, we need slightly larger cell size for initial grid
        const cellSize = Math.max(2, Math.floor(baseSkipFactor * 4)); // Balancing detail and performance
        
        // Divide terrain into initial grid cells and process each one
        for (let y = 0; y < effectiveGridSize - 1; y += cellSize) {
            for (let x = 0; x < effectiveGridSize - 1; x += cellSize) {
                // Ensure we don't go out of bounds
                const size = Math.min(cellSize, effectiveGridSize - x - 1, effectiveGridSize - y - 1);
                createSubdividedGrid(x, y, size, baseSkipFactor);
            }
        }
        
        // Sort triangles by height for better visual layering (back-to-front)
        this.triangleBatch.sort((a, b) => a.height - b.height);
        
        // Draw all triangles in batch
        for (const tri of this.triangleBatch) {
            this.drawOptimizedTriangle(
                tri.x1, tri.y1, tri.color1,
                tri.x2, tri.y2, tri.color2,
                tri.x3, tri.y3, tri.color3
            );
        }
        
        // Track triangle history for analytics
        this.perfData.triangleHistory.push(triangleCount);
        if (this.perfData.triangleHistory.length > 10) {
            this.perfData.triangleHistory.shift();
        }
        
        // Update performance metrics
        this.perfData.triangleCount = triangleCount;
        this.perfData.detailAreas = detailAreaCount;
        this.perfData.renderTime = performance.now() - renderStart;
        
        // Draw debug information
        this.drawDebugInfo();
    }
    
    // Draw debug information overlay
    drawDebugInfo() {
        if (!this.perfData) return;
        
        // Set up text rendering
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(5, 5, 280, 115);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textBaseline = 'top';
        
        // Draw performance metrics with enhanced info
        this.ctx.fillText(`FPS: ${Math.round(this.perfData.fps)}`, 10, 10);
        this.ctx.fillText(`Triangles: ${this.perfData.triangleCount} / Target: ${this.perfData.triangleTarget}`, 10, 25);
        
        // Add color indicators for target direction
        if (this.perfData.targetDetail < this.perfData.adaptiveDetail) {
            // Moving toward higher detail (lower value = higher detail)
            this.ctx.fillStyle = '#00ff00'; // Green for higher detail
        } else if (this.perfData.targetDetail > this.perfData.adaptiveDetail) {
            // Moving toward lower detail (higher value = lower detail)
            this.ctx.fillStyle = '#ff0000'; // Red for lower detail
        } else {
            // Stable
            this.ctx.fillStyle = '#ffffff'; // White - stable
        }
        
        this.ctx.fillText(`Detail Level: ${this.perfData.adaptiveDetail.toFixed(3)} → ${this.perfData.targetDetail.toFixed(3)}`, 10, 40);
        this.ctx.fillStyle = '#ffffff'; // Reset color
        
        this.ctx.fillText(`Detail Areas: ${this.perfData.detailAreas}`, 10, 55);
        this.ctx.fillText(`Render Time: ${this.perfData.renderTime.toFixed(1)}ms`, 10, 70);
        
        // Show adaptation counters
        this.ctx.fillText(`Up/Down Counts: ${this.perfData.upCount}/${this.perfData.downCount}`, 10, 85);
        
        // Display last detail change
        if (this.perfData.detailHistory && this.perfData.detailHistory.length > 0) {
            const lastChange = this.perfData.detailHistory[this.perfData.detailHistory.length - 1];
            const secAgo = ((performance.now() - lastChange.time) / 1000).toFixed(1);
            this.ctx.fillText(`Last Change: ${lastChange.direction} (${secAgo}s ago)`, 10, 100);
        }
        
        this.ctx.restore();
    }
    
    // Safely get terrain data with error handling
    getSafeTerrainPoint(x, y, globalTime, waveEffect, stableWaveOffset, pixelWidth, pixelHeight) {
        try {
            // Ensure coordinates are within bounds
            const validX = Math.max(0, Math.min(this.terrainGenerator.gridSize - 1, x));
            const validY = Math.max(0, Math.min(this.terrainGenerator.gridSize - 1, y));
            
            // Get terrain value safely
            const value = this.terrainGenerator.getValue(validX, validY);
            
            // Get colors with error handling
            const baseColor = this.colorManager.getHeightColor(value);
            const glowIntensity = this.options.glowIntensity || 0.5;
            const glowColor = this.colorManager.getGlowColor(
                baseColor, validX, validY, globalTime, glowIntensity
            );
            
            // Apply wave effect
            const waveX = waveEffect * Math.sin(validY / 10 + stableWaveOffset);
            const waveY = waveEffect * Math.cos(validX / 10 + stableWaveOffset);
            const xPos = validX * pixelWidth + waveX;
            const yPos = validY * pixelHeight + waveY;
            
            return { xPos, yPos, value, color: glowColor };
        } catch (error) {
            console.warn('Error processing terrain point:', x, y, error);
            return { 
                xPos: x * pixelWidth, 
                yPos: y * pixelHeight, 
                value: 0, 
                color: '#000000' 
            };
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
        
        try {
            // Validate colors first - ensure valid hex format
            if (!color1 || !color1.startsWith('#') || color1.length < 7) color1 = '#000000';
            if (!color2 || !color2.startsWith('#') || color2.length < 7) color2 = '#000000';
            if (!color3 || !color3.startsWith('#') || color3.length < 7) color3 = '#000000';
            
            // Use a faster coloring approach - average the colors
            // Parse colors in batch for better performance
            const r1 = parseInt(color1.slice(1, 3), 16);
            const g1 = parseInt(color1.slice(3, 5), 16);
            const b1 = parseInt(color1.slice(5, 7), 16);
            
            const r2 = parseInt(color2.slice(1, 3), 16);
            const g2 = parseInt(color2.slice(3, 5), 16);
            const b2 = parseInt(color2.slice(5, 7), 16);
            
            const r3 = parseInt(color3.slice(1, 3), 16);
            const g3 = parseInt(color3.slice(3, 5), 16);
            const b3 = parseInt(color3.slice(5, 7), 16);
            
            // Check for NaN values
            if (isNaN(r1) || isNaN(g1) || isNaN(b1) || 
                isNaN(r2) || isNaN(g2) || isNaN(b2) || 
                isNaN(r3) || isNaN(g3) || isNaN(b3)) {
                throw new Error('Invalid color values');
            }
        
            // Calculate weighted average color - gives higher weight to brighter colors
            // This creates more vibrant transitions than a simple average
            const avgR = Math.floor((r1 + r2 + r3) / 3);
            const avgG = Math.floor((g1 + g2 + g3) / 3);
            const avgB = Math.floor((b1 + b2 + b3) / 3);
            
            // Convert to hex color using template string for better performance
            const avgColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
            
            // Fill with average color
            this.ctx.fillStyle = avgColor;
            this.ctx.fill();
        } catch (error) {
            // Fallback if color parsing fails
            console.warn('Error processing triangle colors:', error);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
        }
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