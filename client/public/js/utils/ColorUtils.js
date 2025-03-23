// Color utilities

/**
 * Parses a hex color string into RGB components (private function)
 * @param {string} hexColor - The hex color string (e.g. '#FF00CC')
 * @returns {Object} Object with r, g, b properties
 */
const parseHexColor = (hexColor) => {
    // Default to black if invalid
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) {
        return { r: 0, g: 0, b: 0 };
    }
    
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Check for NaN values
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return { r: 0, g: 0, b: 0 };
        }
        
        return { r, g, b };
    } catch (error) {
        console.warn('Error parsing hex color:', error);
        return { r: 0, g: 0, b: 0 };
    }
};

/**
 * Converts RGB values to a hex color string (private function)
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string
 */
const rgbToHex = (r, g, b) => {
    // Clamp and round values
    r = Math.min(255, Math.max(0, Math.round(r)));
    g = Math.min(255, Math.max(0, Math.round(g)));
    b = Math.min(255, Math.max(0, Math.round(b)));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Calculates the average of multiple colors
 * @param {...string} colors - Hex color strings
 * @returns {string} The average color as a hex string
 */
export const averageColors = (...colors) => {
    try {
        // Parse all colors
        const rgbColors = colors.map(parseHexColor);
        
        // Calculate average of each component
        const avgR = rgbColors.reduce((sum, color) => sum + color.r, 0) / rgbColors.length;
        const avgG = rgbColors.reduce((sum, color) => sum + color.g, 0) / rgbColors.length;
        const avgB = rgbColors.reduce((sum, color) => sum + color.b, 0) / rgbColors.length;
        
        // Convert back to hex
        return rgbToHex(avgR, avgG, avgB);
    } catch (error) {
        console.warn('Error averaging colors:', error);
        return '#000000';
    }
};