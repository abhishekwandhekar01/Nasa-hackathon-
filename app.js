// Import the 'dotenv' package to manage environment variables
require('dotenv').config(); 

// Import the 'express' library to create our server
const express = require('express');

// Initialize our Express application
const app = express();

// Define the port number. It will use the one from the environment or default to 3000
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
// This tells Express to serve static files (like CSS) from the 'public' folder
app.use(express.static('public')); 
// This tells Express how to understand and display our .ejs files from the 'views' folder
app.set('view engine', 'ejs'); 

// --- A Simple Route for the Homepage ---
// When someone visits the homepage ('/'), we'll send a simple message
app.get('/', (req, res) => {
    res.send("🚀 Our Space Universe is taking off!");
});

// --- Start the Server ---
// This command starts our server and makes it listen for requests on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});