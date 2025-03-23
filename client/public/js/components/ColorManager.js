// ColorManager - handles palettes and color calculations
import { PALETTES } from '../utils/constants.js';
import { updateCyclicValue } from '../utils/AnimationUtils.js';

class ColorManager {
    constructor(paletteName) {
        this.palettes = PALETTES;
        this.currentPalette = paletteName || 'cosmic';
        this.colorShift = 0;
    }
    
    setPalette(paletteName) {
        if (this.palettes[paletteName]) {
            this.currentPalette = paletteName;
        }
    }
    
    // Update color shift for animation
    updateColorShift(deltaTime) {
        this.colorShift = updateCyclicValue(this.colorShift, deltaTime * 0.0002);
    }
    
    // Get a color for a height value with shifting for animation
    getHeightColor(height, animate = true) {
        // Safety check for invalid height
        if (height === undefined || height === null || isNaN(height)) {
            return this.palettes[this.currentPalette][0]; // Return first color as fallback
        }
        
        // Ensure height is between 0 and 1
        height = Math.max(0, Math.min(1, height));
        
        const palette = this.palettes[this.currentPalette];
        
        // Apply color shifting for animation
        let shiftedHeight = height;
        if (animate) {
            // Shift the height value based on the color shift
            // Use a more stable modulo implementation to prevent artifacts
            shiftedHeight = ((height + this.colorShift) % 1 + 1) % 1;
        }
        
        // Map to color index with bounds checking to prevent index errors
        const safeShiftedHeight = Math.max(0, Math.min(0.9999, shiftedHeight));
        const colorIndex = Math.min(palette.length - 1, Math.floor(safeShiftedHeight * palette.length));
        return palette[colorIndex];
    }
}

export default ColorManager;