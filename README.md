# Fractadelic

A collaborative real-time fractal landscape generator where users can create and evolve beautiful terrain together, with perfectly synchronized visual displays across all clients.

## Features

- Generate fractal landscapes using the Diamond-Square algorithm
- Collaborate with other users in real-time with synchronized displays
- Dynamic particle systems and ripple effects
- Vibrant color palettes with smooth transitions
- Interactive parameter controls for real-time adjustments
- Wave, glow, and particle visual effects
- Responsive design for all device sizes
- Deterministic randomness for consistent experiences
- Adaptive performance optimization for all devices
- Anti-flashing techniques for smooth animations
- Quadtree-based adaptive detail rendering

## Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   npm run install-all
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser to `http://localhost:3000`
5. Open multiple browser windows to see the real-time collaboration

### Deployment Options

#### Heroku Deployment

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku: `heroku login`
3. Create a new Heroku app: `heroku create fractadelic-app`
4. Push code to Heroku: `git push heroku main`
5. Open the app: `heroku open`

#### GitHub Pages (Static Version)

For GitHub Pages deployment, the app will run in offline mode without collaboration:

1. Run the app locally
2. Copy the contents of the `client/public` folder to your GitHub Pages repository
3. Use static-index.html and static-main.js which are configured for offline use

## Project Structure

```
fractadelic/
├── client/                  # Client-side code
│   ├── public/              # Static assets
│   │   ├── index.html       # Main HTML
│   │   ├── static-index.html # Static version HTML
│   │   ├── css/             # CSS modules
│   │   │   ├── base.css     # Core styles
│   │   │   ├── parameters.css # Control panel styles
│   │   │   ├── ...          # Other CSS modules
│   │   │   └── index.css    # CSS entry point
│   │   └── js/              # JavaScript files
│   │       ├── components/  # Modular components
│   │       │   ├── FractalLandscape.js    # Main controller
│   │       │   ├── TerrainGenerator.js    # Terrain algorithm
│   │       │   ├── TerrainRenderer.js     # Optimized mesh rendering
│   │       │   ├── ColorManager.js        # Color handling
│   │       │   ├── ParticleSystem.js      # Particle effects
│   │       │   ├── RippleEffect.js        # Ripple animations
│   │       │   ├── UIManager.js           # UI interactions
│   │       │   ├── ServerConnection.js    # WebSocket communication
│   │       │   ├── SyncManager.js         # State synchronization
│   │       │   └── PerformanceMonitor.js  # Adaptive performance
│   │       ├── fractal.js   # Module exports
│   │       ├── main.js      # Main client code
│   │       └── static-main.js # Static version
│   └── package.json         # Client dependencies
├── server.js                # Express.js server with Socket.io
└── package.json             # Server dependencies
```

## How to Use

- **Palette (P key)**: Cycle through different visual themes
- **Wave (Left/Right arrows)**: Control wave-like movement intensity
- **Glow (Up/Down arrows)**: Adjust the glow effect intensity
- **Particles (+/- keys)**: Change particle density
- **Space**: Add ripple effects for visual interest
- **Click/right-click parameters**: Increase/decrease values

## Technical Details

- Uses HTML5 Canvas for rendering with requestAnimationFrame
- ES6 module system for component organization
- Socket.io for real-time communication and state synchronization
- Server-side animation state broadcast at 60fps
- Deterministic pseudo-random number generation for visual consistency
- Diamond-Square algorithm for fractal terrain generation
- Quadtree-based adaptive detail rendering system
- Anti-flashing techniques for smooth terrain movement
- Optimized triangle batching for performance
- Adaptive detail level based on device performance
- Client-side performance monitoring and optimization

## License

See the LICENSE file for details.