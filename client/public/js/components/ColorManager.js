// ColorManager - handles palettes and color calculations
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
        
        // Add original palettes for backward compatibility
        this.palettes.earth = ['#0f5e9c', '#2389da', '#1fab89', '#6cca78', '#bef992', '#eeeebb', '#d6ae96', '#b8763e', '#7f5a3d', '#ffffff'];
        this.palettes.ocean = ['#000033', '#000066', '#0000aa', '#0066cc', '#00aaff', '#33ccff', '#66ffff', '#99ffff', '#ccffff', '#ffffff'];
        this.palettes.fire = ['#000000', '#1f0000', '#3f0000', '#6f0000', '#af0000', '#df3f00', '#ff7f00', '#ffbf00', '#ffff00', '#ffffff'];
        this.palettes.forest = ['#071a07', '#0f2f0f', '#174f17', '#1f6f1f', '#278f27', '#2faf2f', '#37cf37', '#8fef8f', '#b7f7b7', '#ffffff'];
        
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
            // Shift the height value based on the global time
            shiftedHeight = (height + this.colorShift) % 1;
        }
        
        // Map to color index
        const colorIndex = Math.min(palette.length - 1, Math.floor(shiftedHeight * palette.length));
        return palette[colorIndex];
    }
    
    // Get color with a pulsating glow effect
    getGlowColor(color, x, y, globalTime, intensity = 0.5) {
        // Safety check for invalid color
        if (!color || typeof color !== 'string' || !color.startsWith('#') || color.length < 7) {
            return '#000000'; // Return black as fallback
        }
        
        try {
            // Extract RGB components with error handling
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            
            // Check if any RGB values are NaN (invalid hex color)
            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                return '#000000'; // Return black for invalid colors
            }
            
            // Calculate a pulsating factor based on position and time
            // Scale the effect by the intensity parameter
            const pulseFactor = (0.2 + intensity * 0.3) * 
                            Math.sin(x / 30 + y / 30 + globalTime * (1 + intensity)) + 1;
            
            // Apply the pulse factor with intensity boost
            const intensityMultiplier = 1 + (intensity * 0.5);
            const rNew = Math.min(255, Math.round(r * pulseFactor * intensityMultiplier));
            const gNew = Math.min(255, Math.round(g * pulseFactor * intensityMultiplier));
            const bNew = Math.min(255, Math.round(b * pulseFactor * intensityMultiplier));
            
            // Convert back to hex with padding
            return `#${rNew.toString(16).padStart(2, '0')}${gNew.toString(16).padStart(2, '0')}${bNew.toString(16).padStart(2, '0')}`;
        } catch (error) {
            // Handle any unexpected errors during color processing
            console.warn('Error processing color:', color, error);
            return '#000000'; // Return black as fallback
        }
    }
}

export default ColorManager;