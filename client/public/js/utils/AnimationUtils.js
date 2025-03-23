// Animation utilities

/**
 * Updates and normalizes a cyclic value (keeps it within 0-1 range)
 * @param {number} currentValue - The current value 
 * @param {number} increment - The amount to increment
 * @returns {number} The updated value, normalized to 0-1 range
 */
export const updateCyclicValue = (currentValue, increment) => {
    const newValue = currentValue + increment;
    
    // Keep in 0-1 range
    if (newValue > 1) {
        return newValue - 1;
    } else if (newValue < 0) {
        return newValue + 1;
    }
    return newValue;
};