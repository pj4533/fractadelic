// Main fractal module - exports all components
import FractalLandscape from './components/FractalLandscape.js';
import ColorManager from './components/ColorManager.js';
import TerrainGenerator from './components/TerrainGenerator.js';

// Export individual components for direct access
export {
    FractalLandscape,
    ColorManager,
    TerrainGenerator
};

// Export the FractalLandscape class as the default export
export default FractalLandscape;