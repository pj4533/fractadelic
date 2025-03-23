// Main fractal module - exports all components
import FractalLandscape from './components/FractalLandscape.js';
import ColorManager from './components/ColorManager.js';
import TerrainGenerator from './components/TerrainGenerator.js';
import ParticleSystem from './components/ParticleSystem.js';
import RippleEffect from './components/RippleEffect.js';

// Export individual components for direct access
export {
    FractalLandscape,
    ColorManager,
    TerrainGenerator,
    ParticleSystem,
    RippleEffect
};

// Export the FractalLandscape class as the default export
export default FractalLandscape;