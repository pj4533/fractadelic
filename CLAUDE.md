# Fractadelic Developer Guide

## Commands
- `npm install-all` - Install all dependencies (server and client)
- `npm start` - Start the server (port 3000)
- `npm run install-server` - Install server dependencies only
- `npm run install-client` - Install client dependencies only
- `cd client && npm run dev` - Serve the client in development mode

> Note: The user will always run the server. Claude should never attempt to run the server.

## Architecture Overview

The application is built with a modular component-based architecture:

### Component Structure
- **FractalLandscape**: Main controller that orchestrates all components
- **TerrainGenerator**: Implements Diamond-Square algorithm for terrain generation
- **TerrainRenderer**: Handles optimized triangle mesh rendering with adaptive detail
- **TriangleRenderer**: Renders and optimizes triangle drawing operations
- **QuadTreeSubdivider**: Intelligently subdivides terrain for variable detail levels
- **ColorManager**: Handles color palettes and visual effects
- **AnimationManager**: Controls animation timing and transitions
- **UIManager**: Handles user interface interactions
- **KeyboardManager**: Processes keyboard input and shortcuts
- **ParameterDisplay**: Manages UI display of adjustable parameters
- **ServerConnection**: Manages WebSocket communication with the server
- **SyncManager**: Handles synchronized animation state across clients
- **PerformanceMonitor**: Main performance tracking and adaptation controller
- **PerformanceAdapter**: Implements detail level adaptation algorithms
- **PerformanceMetrics**: Tracks and stores performance-related metrics
- **PerformanceDebugger**: Provides visualization of performance data

### CSS Organization
- **base.css**: Core layout and canvas styles
- **parameters.css**: Control panel styling
- **status.css**: Connection status indicators
- **notifications.css**: Feedback elements
- **responsive.css**: Media queries for different screen sizes
- **index.css**: Main entry point that imports all CSS modules

## Rendering System

The application uses an adaptive rendering system:

- **Quadtree-Based Detail**: Areas with high terrain variation get more triangles
- **Performance Monitoring**: Automatically adjusts detail level based on FPS
- **Triangle Batching**: Optimizes rendering by processing triangles in batches
- **Anti-Flashing**: Applies techniques to prevent terrain flashing during animation
- **Adaptive Grid Size**: Adjusts grid size based on device capabilities
- **Detail Thresholds**: Higher detail areas are rendered with finer triangulation
- **Z-Order Rendering**: Sorts triangles by height for correct visual layering
- **Stable Sorting**: Uses position-based secondary sorting to prevent z-fighting
- **Error Handling**: Comprehensive error detection for invalid coordinates or heights
- **Degenerate Triangle Prevention**: Checks triangle validity before rendering
- **Safe Value Clamping**: Prevents extreme values from causing rendering glitches
- **Progressive Fault Recovery**: Gracefully handles rendering errors with fallbacks

## Synchronization System

The application implements a real-time synchronization system:

- Server maintains canonical animation state (global time, wave offset, color shift)
- Animation state is broadcast to all clients at 60fps
- Deterministic pseudo-random number generation ensures visual consistency
- All random visual elements use shared seeds from the server
- Parameter changes are immediately synchronized across all clients
- Smooth transition between states prevents visual jumps
- Clients synchronize animation velocity rather than absolute position

## Performance Optimization

The application includes several performance optimization techniques:

- **Adaptive Detail Level**: Automatically adjusts triangle count based on device performance
- **FPS Monitoring**: Tracks frame rate and adjusts detail accordingly
- **Dynamic FPS Targeting**: Intelligent algorithm targets 35 FPS for optimal balance
- **Triangle Batching**: Processes triangles in batches for improved performance
- **Simplified Coloring**: Uses optimized color blending for triangles
- **Selective Glow Effects**: Only applies intensive visual effects on important elements
- **Fixed Time Step**: Uses consistent time steps for animation regardless of frame rate
- **Render Time Tracking**: Monitors and optimizes render time per frame
- **Adaptive Detail Thresholds**: Adjusts detail thresholds based on historical performance
- **Smart High-FPS Handling**: Prevents detail level from getting stuck at high FPS values
- **Oscillation Detection**: Identifies and corrects oscillating detail level changes
- **Detail Change Dampening**: Uses exponential moving averages to smooth transitions
- **Optimal Detail Reset**: Intelligently resets optimization parameters when FPS drifts too far
- **Progressive Detail Scaling**: Uses non-linear scaling for detail adjustments based on performance

## Code Style Guidelines

### JavaScript Conventions
- Use camelCase for variables, functions, methods
- Use PascalCase for classes (e.g., `FractalLandscape`)
- Use const for immutable variables, let otherwise
- Include JSDoc comments for classes and public methods
- Indent with 4 spaces
- Add blank line between logical sections of code
- Use ES6 modules for code organization

### Client Code Structure
- Place UI components and event handlers in main.js
- Component files in js/components/ folder
- Use event delegation for dynamic elements
- Separate concerns: UI logic, data handling, calculations

### Server Code
- Use Express middleware for common functionality
- Log important events (connections, errors)
- Handle WebSocket disconnections gracefully
- Validate user input before processing
- Maintain server-side state for synchronization

### Error Handling
- Use try/catch blocks for async operations
- Provide meaningful error messages
- Implement fallbacks for offline functionality
- Console.log errors during development
- Validate inputs to prevent rendering errors