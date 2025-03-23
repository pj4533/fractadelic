# Fractadelic Developer Guide

## Commands
- `npm install-all` - Install all dependencies (server and client)
- `npm start` - Start the server (port 3000)
- `npm run install-server` - Install server dependencies only
- `npm run install-client` - Install client dependencies only
- `cd client && npm run dev` - Serve the client in development mode

## Code Style Guidelines

### JavaScript Conventions
- Use camelCase for variables, functions, methods
- Use PascalCase for classes (e.g., `FractalLandscape`)
- Use const for immutable variables, let otherwise
- Include JSDoc comments for classes and public methods
- Indent with 4 spaces
- Add blank line between logical sections of code

### Client Code Structure
- Place UI components and event handlers in main.js
- Keep fractal generation logic in fractal.js
- Use event delegation for dynamic elements
- Separate concerns: UI logic, data handling, calculations

### Server Code
- Use Express middleware for common functionality
- Log important events (connections, errors)
- Handle WebSocket disconnections gracefully
- Validate user input before processing

### Error Handling
- Use try/catch blocks for async operations
- Provide meaningful error messages
- Implement fallbacks for offline functionality
- Console.log errors during development