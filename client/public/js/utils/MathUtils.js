// Mathematical utility functions

/**
 * Clamps a value between a minimum and maximum value
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @returns {number} The clamped value
 */
export const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value));
};

/**
 * Returns a valid number or the default value if invalid
 * @param {number} value - The value to check
 * @param {number} defaultValue - The default value to use if invalid
 * @returns {number} A valid number
 */
export const safeValue = (value, defaultValue) => {
    return isNaN(value) || !isFinite(value) ? defaultValue : value;
};

/**
 * Adds a random displacement to a value within a range
 * @param {number} value - The base value
 * @param {number} roughness - The roughness factor
 * @returns {number} The value with added displacement
 */
export const randomShift = (value, roughness) => {
    const displacement = (Math.random() * 2 - 1) * roughness;
    return value + displacement;
};

/**
 * Calculates average of an array of values
 * @param {Array<number>} array - The array of values
 * @returns {number} The average value
 */
export const calculateAverage = (array) => {
    if (!array || array.length === 0) return 0;
    return array.reduce((a, b) => a + b, 0) / array.length;
};

/**
 * Calculates a weighted average between a current value and a target
 * @param {number} currentValue - The current value
 * @param {number} targetValue - The target value
 * @param {number} weight - Weight factor (0-1) - how much to favor the target
 * @returns {number} The weighted average
 */
export const weightedAverage = (currentValue, targetValue, weight) => {
    return (targetValue * weight) + (currentValue * (1 - weight));
};

/**
 * Calculates exponential moving average
 * @param {number} currentValue - The current value
 * @param {number} previousAverage - The previous average value
 * @param {number} smoothingFactor - Smoothing factor (0-1)
 * @returns {number} The exponential moving average
 */
export const exponentialMovingAverage = (currentValue, previousAverage, smoothingFactor) => {
    return (smoothingFactor * currentValue) + ((1 - smoothingFactor) * previousAverage);
};