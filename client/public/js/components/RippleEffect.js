// Manages ripple effects
class RippleEffect {
    constructor(width, height, colorManager) {
        this.width = width;
        this.height = height;
        this.colorManager = colorManager;
        this.ripples = [];
    }
    
    // Create a ripple effect 
    addRipple(x, y, value) {
        const ripple = {
            x: x * this.width,
            y: y * this.height,
            maxRadius: Math.max(this.width, this.height) * 0.4,
            currentRadius: 0,
            thickness: 8,
            opacity: 1,
            speed: 0.15,
            color: this.colorManager.getHeightColor(value)
        };
        
        this.ripples.push(ripple);
    }
    
    // Update ripples
    updateRipples(deltaTime) {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            
            // Expand ripple
            ripple.currentRadius += ripple.speed * deltaTime;
            ripple.opacity = 1 - (ripple.currentRadius / ripple.maxRadius);
            
            // Remove ripples that have expanded fully
            if (ripple.currentRadius >= ripple.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }
    }
    
    // Update width and height
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
    }
}

export default RippleEffect;