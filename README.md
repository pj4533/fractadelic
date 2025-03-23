# Fractadelic

A collaborative real-time fractal landscape generator where users can create and evolve beautiful terrain together.

## Features

- Generate fractal landscapes using the Diamond-Square algorithm
- Collaborate with other users in real-time
- Add seed points to shape the terrain
- Choose from different color palettes
- Watch landscapes evolve over time

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
3. Update the client code to run in offline mode

## Project Structure

```
fractadelic/
├── client/               # Client-side code
│   ├── public/           # Static assets
│   │   ├── index.html    # Main HTML
│   │   ├── styles.css    # CSS styles
│   │   └── js/           # JavaScript files
│   │       ├── fractal.js # Fractal generation logic
│   │       └── main.js   # Main client code
│   └── package.json      # Client dependencies
├── server.js             # Express.js server
└── package.json          # Server dependencies
```

## How to Use

- **Color Palette**: Select different visual themes for your landscape
- **Roughness**: Adjust to control how jagged the terrain appears
- **Add Seed**: Click to place points of influence on the landscape
- **Evolution Speed**: Control how quickly the landscape changes over time

## Technical Details

- Uses HTML5 Canvas for rendering
- Socket.io for real-time communication
- Express.js for the server
- Diamond-Square algorithm for fractal terrain generation

## License

See the LICENSE file for details.