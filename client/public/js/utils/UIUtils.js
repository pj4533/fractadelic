// UI utilities
import { UI } from './constants.js';

/**
 * Updates a status element with an optional highlight effect
 * @param {HTMLElement} element - The element to update
 * @param {string} value - The new value to display
 * @param {boolean} addHighlight - Whether to add a highlight effect
 * @param {number} [highlightDuration=UI.highlightTime] - Duration of highlight effect
 */
export const updateStatusElement = (element, value, addHighlight = true, highlightDuration = UI.highlightTime) => {
    if (!element) return;
    
    // Update text content
    element.textContent = value;
    
    // Add highlight effect if requested
    if (addHighlight) {
        const parentItem = element.parentElement;
        if (parentItem) {
            parentItem.classList.add('highlight');
            
            // Remove highlight after animation
            setTimeout(() => {
                parentItem.classList.remove('highlight');
            }, highlightDuration);
        }
    }
};

/**
 * Shows a visual feedback for keypresses
 * @param {string} key - The key that was pressed
 * @param {string} action - Description of the action
 * @param {number} [duration=1500] - How long to show the feedback
 * @returns {HTMLElement} The created feedback element
 */
export const showKeyFeedback = (key, action, duration = 1500) => {
    // Remove existing feedback if present
    const existingFeedback = document.querySelector('.key-feedback');
    if (existingFeedback) {
        document.body.removeChild(existingFeedback);
    }
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'key-feedback';
    feedback.innerHTML = `<span class="key">${key}</span> ${action}`;
    document.body.appendChild(feedback);
    
    // Set timeout to remove
    setTimeout(() => {
        if (feedback.parentNode) {
            document.body.removeChild(feedback);
        }
    }, duration);
    
    return feedback;
};

/**
 * Updates canvas dimensions to match container
 * @param {HTMLCanvasElement} canvas - The canvas element to update
 * @returns {boolean} True if dimensions changed, false otherwise
 */
export const updateCanvasDimensions = (canvas) => {
    if (!canvas) return false;
    
    const container = canvas.parentElement;
    if (!container) return false;
    
    if (canvas.width !== container.clientWidth || 
        canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        return true;
    }
    return false;
};