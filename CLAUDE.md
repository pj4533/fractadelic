# Fractadelic Developer Guide

## Commands
- `npm install-all` - Install all dependencies (server and client)
- `npm start` - Start the server (port 3000)
- `npm run install-server` - Install server dependencies only
- `npm run install-client` - Install client dependencies only
- `cd client && npm run dev` - Serve the client in development mode

## Architecture Overview

The application is built with a modular component-based architecture:

### Component Structure
- **FractalLandscape**: Main controller that orchestrates all components
- **TerrainGenerator**: Implements Diamond-Square algorithm for terrain generation
- **ColorManager**: Handles color palettes and visual effects
- **ParticleSystem**: Manages particle effects and animations
- **RippleEffect**: Creates expanding ripple animations

### CSS Organization
- **base.css**: Core layout and canvas styles
- **parameters.css**: Control panel styling
- **status.css**: Connection status indicators
- **notifications.css**: Feedback elements
- **responsive.css**: Media queries for different screen sizes
- **index.css**: Main entry point that imports all CSS modules

## Synchronization System

The application implements a real-time synchronization system:

- Server maintains canonical animation state (global time, wave offset, color shift)
- Animation state is broadcast to all clients at 60fps
- Deterministic pseudo-random number generation ensures visual consistency
- All random visual elements use shared seeds from the server
- Parameter changes are immediately synchronized across all clients

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