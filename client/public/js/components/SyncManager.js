// SyncManager class - Handles synchronization with server
import { updateCyclicValue } from '../utils/AnimationUtils.js';
import { weightedAverage } from '../utils/MathUtils.js';

class SyncManager {
    constructor() {
        this.useServerSync = true;
        this.syncData = null;
        this.sharedSeed = 0;
    }
    
    // Enable or disable server synchronization
    setServerSyncEnabled(enabled) {
        this.useServerSync = enabled;
    }
    
    // Update animation state from server
    updateAnimationState(animState, globalTime, colorManager) {
        if (!this.useServerSync) return;
        
        // Store the shared random seed for deterministic random operations
        if (animState.sharedSeed !== undefined) {
            this.sharedSeed = animState.sharedSeed;
        }
        
        // Initialize local sync state if needed
        if (!this.syncData) {
            this.syncData = {
                // Store last server values received
                lastServerGlobalTime: globalTime,
                lastServerColorShift: colorManager.colorShift,
                
                // Store deltas (rate of change from server)
                globalTimeDelta: 0.016, // Default frames (60fps)
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
                    this.syncData.globalTimeDelta = weightedAverage(this.syncData.globalTimeDelta, targetDelta, 0.2);
                }
            }
            
            // Calculate color shift delta (rate of change)
            if (animState.colorShift !== undefined) {
                const serverColorDiff = animState.colorShift - this.syncData.lastServerColorShift;
                this.syncData.lastServerColorShift = animState.colorShift;
                
                if (serverColorDiff !== 0 && timeSinceLastUpdate > 0) {
                    const targetDelta = serverColorDiff / timeSinceLastUpdate;
                    this.syncData.colorShiftDelta = weightedAverage(this.syncData.colorShiftDelta, targetDelta, 0.05);
                }
            }
        }
    }
    
    // Apply server-driven animation parameters in local animation loop
    applyServerSync(deltaTime, globalTimeRef, colorManager) {
        if (!this.useServerSync || !this.syncData) return { newGlobalTime: globalTimeRef };
        
        // Convert deltaTime to seconds
        const dt = deltaTime * 0.001;
        
        // Update values based on deltas (rates of change) rather than absolute values
        // This creates smooth transitions without jumps
        const newGlobalTime = globalTimeRef + this.syncData.globalTimeDelta * dt;
        
        // Smoothly adjust color shift
        const newColorShift = colorManager.colorShift + this.syncData.colorShiftDelta * dt;
        // Keep color shift in 0-1 range
        colorManager.colorShift = updateCyclicValue(colorManager.colorShift, this.syncData.colorShiftDelta * dt);
        
        return { newGlobalTime };
    }
    
    // Get the shared seed for deterministic randomness
    getSharedSeed() {
        return this.sharedSeed;
    }
    
    // Get deterministic random value using shared seed
    getSharedRandom() {
        // Simple deterministic pseudo-random using shared seed
        this.sharedSeed = (this.sharedSeed * 9301 + 49297) % 233280;
        return this.sharedSeed / 233280;
    }
}

export default SyncManager;