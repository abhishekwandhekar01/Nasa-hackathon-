// app.js (Complete updated version)

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const axios = require('axios');
const User = require('./models/User'); // <-- Make sure User model is imported
const planetsData = require('./data/planets');
const { addXP } = require('./utils/xpManager');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// --- Middlewares ---
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// --- Session Configuration ---
app.use(session({
    secret: 'a_secret_key_for_the_space_nerds',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// --- Routes ---
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.render('home');
});

// UPDATED DASHBOARD ROUTE
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        // Now we fetch BOTH user data and NASA data
        const user = await User.findById(req.session.userId);
        const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`);
        const apodData = response.data;

        res.render('dashboard', { user: user, apod: apodData });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.send("Could not load dashboard.");
    }
});

// NEW ROUTE TO SHOW THE QUIZ
// app.js

app.get('/daily-quiz', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        // 1. Fetch the logged-in user's data
        const user = await User.findById(req.session.userId); 
        const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`);
        
        // 2. Pass BOTH the user and apod data to the view
        res.render('quiz', { user: user, apod: response.data }); 
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        res.send("Could not load the quiz.");
    }
});

// NEW ROUTE TO HANDLE QUIZ SUBMISSION
app.post('/submit-quiz', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const { userAnswer, correctAnswer } = req.body;

        // Check if the answer is correct (case-insensitive and trimmed)
        // ... inside the route
        if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
            await addXP(req.session.userId, 10); // Use the new function
        }
        res.redirect('/dashboard');
        // ...
    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.send("Something went wrong.");
    }
});

// app.js (add this new route)

// NEW ROUTE FOR THE LEADERBOARD
app.get('/leaderboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId); // Add this
const topUsers = await User.find({}).sort({ level: -1, xp: -1 }).limit(10);
res.render('leaderboard', { user: user, users: topUsers }); // Add user here
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        res.send("Could not load the leaderboard.");
    }
});
// app.js (add this new route)

// NEW ROUTE FOR MARS ROVER PHOTOS
app.get('/mars-rover', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId); // Add this
const response = await axios.get(/* ... */);
res.render('mars-rover', { user: user, photos: response.data.latest_photos }); // Add user here

    } catch (error) {
        console.error("Error fetching Mars rover photos:", error);
        res.send("Could not fetch photos from Mars.");
    }
});

// app.js (add these two new routes)

// NEW ROUTE TO SET UP AND SHOW THE MARS MISSION
app.get('/mars-mission', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        const response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${process.env.NASA_API_KEY}`);
        const photos = response.data.latest_photos;

        // 1. Pick a random photo for the mission
        const missionPhoto = photos[Math.floor(Math.random() * photos.length)];
        const correctAnswer = missionPhoto.camera.full_name;

        // 2. Create a list of incorrect answers
        const allCameras = ["Front Hazard Avoidance Camera", "Rear Hazard Avoidance Camera", "Mast Camera", "Chemistry and Camera Complex", "Mars Hand Lens Imager", "Mars Descent Imager", "Navigation Camera"];
        const incorrectAnswers = allCameras.filter(c => c !== correctAnswer);
        const shuffledIncorrect = incorrectAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);

        // 3. Create the final choices array and shuffle it
        const choices = [correctAnswer, ...shuffledIncorrect].sort(() => 0.5 - Math.random());

        res.render('mars-mission', { user: user, missionPhoto, choices, correctAnswer });   

    } catch (error) {
        console.error("Error setting up Mars mission:", error);
        res.send("Could not start mission. The Mars rovers might be resting.");
    }
});

// NEW ROUTE TO HANDLE MISSION SUBMISSION
app.post('/submit-mission', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const { userAnswer, correctAnswer } = req.body;
        // ... inside the route
        if (userAnswer === correctAnswer) {
            await addXP(req.session.userId, 15); // Use the new function
        }
        res.redirect('/dashboard');
        // ...
    } catch (error) {
        console.error("Error submitting mission:", error);
        res.send("Something went wrong with your submission.");
    }
});

// app.js (add this new route)

// NEW ROUTE FOR NEAR-EARTH OBJECTS
app.get('/neo', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Fetch data for today's NEOs
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${process.env.NASA_API_KEY}`);

        // The data is nested under the date key
        const neosForToday = response.data.near_earth_objects[today];

        res.render('neo', { user: user, neos: neosForToday, date: today });

    } catch (error) {
        console.error("Error fetching NEO data:", error);
        res.send("Could not fetch Near-Earth Object data.");
    }
});

// app.js (add these two new routes)

// NEW ROUTE TO SET UP AND SHOW THE NEO MISSION
app.get('/neo-mission', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId); 
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${process.env.NASA_API_KEY}`);
        const neos = response.data.near_earth_objects[today];

        if (neos.length < 3) {
            return res.send("Not enough NEO data for a mission today. Please check back tomorrow!");
        }

        // 1. Find the NEO with the smallest miss distance
        const closestNeo = neos.reduce((prev, curr) => {
            return parseFloat(prev.close_approach_data[0].miss_distance.kilometers) < parseFloat(curr.close_approach_data[0].miss_distance.kilometers) ? prev : curr;
        });
        const correctAnswer = closestNeo.name;

        // 2. Get two other random incorrect answers
        const incorrectNeos = neos.filter(n => n.name !== correctAnswer);
        const shuffledIncorrect = incorrectNeos.sort(() => 0.5 - Math.random()).slice(0, 2);

        // 3. Create and shuffle the final choices
        const choices = [correctAnswer, shuffledIncorrect[0].name, shuffledIncorrect[1].name].sort(() => 0.5 - Math.random());

        res.render('neo-mission', { user: user, choices, correctAnswer });

    } catch (error) {
        console.error("Error setting up NEO mission:", error);
        res.send("Could not generate a mission. The deep space network may be offline.");
    }
});

// NEW ROUTE TO HANDLE NEO MISSION SUBMISSION
app.post('/submit-neo-mission', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const { userAnswer, correctAnswer } = req.body;
        // ... inside the route
        if (userAnswer === correctAnswer) {
            await addXP(req.session.userId, 20); // Use the new function
        }
        res.redirect('/dashboard');
        // ...
    } catch (error) {
        console.error("Error submitting NEO mission:", error);
        res.send("Something went wrong with your mission report.");
    }
});

app.get('/solar-system', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    const user = await User.findById(req.session.userId);
    res.render('solar-system', { user: user, planets: planetsData });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});