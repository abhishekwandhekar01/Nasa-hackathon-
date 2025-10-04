// public/js/sketch.js

// Simplified planet data for the simulation
const planets = [
    { name: 'Mercury', distance: 60, radius: 4, speed: 0.04, color: [169, 169, 169] },
    { name: 'Venus', distance: 90, radius: 8, speed: 0.025, color: [255, 165, 0] },
    { name: 'Earth', distance: 130, radius: 9, speed: 0.015, color: [0, 191, 255] },
    { name: 'Mars', distance: 180, radius: 6, speed: 0.01, color: [255, 69, 0] },
    { name: 'Jupiter', distance: 250, radius: 20, speed: 0.005, color: [210, 180, 140] },
    { name: 'Saturn', distance: 330, radius: 18, speed: 0.003, color: [240, 230, 140] },
    { name: 'Uranus', distance: 400, radius: 14, speed: 0.002, color: [173, 216, 230] },
    { name: 'Neptune', distance: 460, radius: 13, speed: 0.001, color: [65, 105, 225] }
];

// p5.js setup function - runs once at the beginning
function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    let canvas = createCanvas(canvasContainer.offsetWidth, 500);
    canvas.parent('canvas-container'); // Place the canvas in our div
}

// p5.js draw function - runs continuously in a loop
function draw() {
    background(0); // Black background for space
    translate(width / 2, height / 2); // Move the origin to the center of the canvas

    // Draw the Sun
    fill(255, 204, 0); // Yellow
    noStroke();
    ellipse(0, 0, 30, 30);

    // Draw each planet and its orbit
    planets.forEach(planet => {
        // Calculate the planet's position using trigonometry
        let x = planet.distance * cos(frameCount * planet.speed);
        let y = planet.distance * sin(frameCount * planet.speed);

        // Draw the orbit path
        noFill();
        stroke(255, 50); // Faint white line
        ellipse(0, 0, planet.distance * 2, planet.distance * 2);

        // Draw the planet
        fill(planet.color);
        noStroke();
        ellipse(x, y, planet.radius * 2, planet.radius * 2);
    });
}

function windowResized() {
    let canvasContainer = document.getElementById('canvas-container');
    resizeCanvas(canvasContainer.offsetWidth, 500);
}