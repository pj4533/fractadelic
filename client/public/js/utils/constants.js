// Constants used throughout the application

// Color palette definitions
export const PALETTES = {
    cosmic: ['#120136', '#035aa6', '#40bad5', '#60efff', '#b2fcff', '#fcff82', '#ff9c71', '#ff5050', '#d162a4', '#b000ff'],
    neon: ['#ff00cc', '#9600ff', '#4900ff', '#00b8ff', '#00fff9', '#00ffa3', '#b6ff00', '#fbff00', '#ff9100', '#ff0000'],
    candy: ['#ea00ff', '#aa00ff', '#7500ff', '#4d00ff', '#2600ff', '#00fff5', '#00ff85', '#00ff3a', '#caff00', '#f9ff00'],
    sunset: ['#0d0221', '#0f4c81', '#168aad', '#34c4e3', '#56e0e0', '#70d6ff', '#ff70a6', '#ff9770', '#ffd670', '#fffd82'],
    lava: ['#000000', '#240046', '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd', '#c77dff', '#ff7c43', '#ff5a5f', '#ff9e00'],
    rainbow: ['#ff0000', '#ff8700', '#ffd300', '#deff0a', '#a1ff0a', '#0aff99', '#0aefff', '#147df5', '#580aff', '#be0aff'],
    earth: ['#0f5e9c', '#2389da', '#1fab89', '#6cca78', '#bef992', '#eeeebb', '#d6ae96', '#b8763e', '#7f5a3d', '#ffffff'],
    ocean: ['#000033', '#000066', '#0000aa', '#0066cc', '#00aaff', '#33ccff', '#66ffff', '#99ffff', '#ccffff', '#ffffff'],
    fire: ['#000000', '#1f0000', '#3f0000', '#6f0000', '#af0000', '#df3f00', '#ff7f00', '#ffbf00', '#ffff00', '#ffffff'],
    forest: ['#071a07', '#0f2f0f', '#174f17', '#1f6f1f', '#278f27', '#2faf2f', '#37cf37', '#8fef8f', '#b7f7b7', '#ffffff']
};

// List of palette names in order
export const PALETTE_NAMES = ['cosmic', 'neon', 'candy', 'sunset', 'lava', 'rainbow', 'earth', 'ocean', 'fire', 'forest'];

// Performance thresholds
export const PERFORMANCE = {
    targetFps: 35,
    minTriangleTarget: 6000,
    maxTriangleTarget: 16000,
    preferredTriangleRange: {min: 8000, max: 14000}
};

// Default options
export const DEFAULT_OPTIONS = {
    roughness: 0.5,
    palette: 'cosmic',
    seedPoints: [],
    useServerSync: true
};

// Animation parameters
export const ANIMATION = {
    colorShiftRate: 0.0002,
    evolutionRate: 0.0003,
    globalTimeRate: 0.0005,
    throttleTime: 200
};

// UI parameters
export const UI = {
    highlightTime: 500
};