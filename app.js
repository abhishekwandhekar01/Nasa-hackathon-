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
    secret: process.env.SESSION_SECRET || 'a_secret_key_for_the_space_nerds',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // send cookie over HTTPS only in prod
        httpOnly: true,
        sameSite: 'lax'
    }
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
app.get('/missions', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        const missions = require('./data/missions');
        res.render('missions', { user: user, missions });
    } catch (error) {
        console.error("Error loading missions page:", error);
        res.send("Could not load missions.");
    }
});
app.get('/daily-quiz', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        // Use local custom questions rather than external APIs
        const allQuestions = require('./data/questions');
        // pick 2 random questions (we'll add one generated from fact)
        const shuffled = allQuestions.slice().sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);

    // pick a random fact and generate a knowledge paragraph + question from it
    const facts = require('./data/facts');
    const { generateKnowledgeAndQuestion } = require('./utils/knowledgeGen');
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const generated = generateKnowledgeAndQuestion(fact);

        // Build questions for view (exclude answers)
        // We'll give the generated question id 'fact'
        const questions = selected.map(q => {
            const { id, type, prompt, options, image } = q;
            return { id, type, prompt, options, image };
        });

    const factQuestion = { id: 'fact', type: generated.type, prompt: generated.question, options: generated.options, image: null };
    // place fact question at the top
    questions.unshift(factQuestion);

    // Store correct answers server-side
    req.session.dailyQuiz = [{ id: 'fact', answer: generated.answer }, ...selected.map(q => ({ id: q.id, answer: q.answer }))];

    // Pass the knowledge paragraph to the view as todaysKnowledge
    res.render('quiz', { user, questions, todaysKnowledge: generated.knowledge });
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        res.send("Could not load the quiz.");
    }
});

// NEW ROUTE TO HANDLE QUIZ SUBMISSION (server-side answers stored in session)
app.post('/submit-quiz', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        const answers = req.session.dailyQuiz || [];

        // req.body should contain fields like q1, q2, q3
        let totalCorrect = 0;
        for (const a of answers) {
            const submitted = (req.body[a.id] || '').trim();
            if (!submitted) continue;
            if (submitted.toLowerCase() === String(a.answer).trim().toLowerCase()) {
                totalCorrect++;
            }
        }

        // Award XP based on correct answers (10 XP per correct)
        if (totalCorrect > 0) {
            await addXP(req.session.userId, totalCorrect * 10);
        }

        // Clear stored answers to avoid resubmission
        delete req.session.dailyQuiz;

        // Re-fetch the user to reflect updated XP/level
        const updatedUser = await User.findById(req.session.userId);

        res.render('quiz-result', { user: updatedUser, totalCorrect, totalQuestions: answers.length });
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
        if (userAnswer === correctAnswer) {
            await addXP(req.session.userId, 15);
        }
        res.redirect('/dashboard');
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
// app.js (add this new route)

// NEW ROUTE FOR THE NASA DATA HUB
app.get('/nasa-data', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        
        // Fetch live ISS location from Open Notify API (no key needed)
        let issData = null;
        try {
            const issResponse = await axios.get('http://api.open-notify.org/iss-now.json');
            issData = issResponse.data;
        } catch (e) {
            console.warn('Could not fetch ISS data:', e.message);
        }

        // Conditionally fetch NASA data if API key is provided
        const nasaKey = process.env.NASA_API_KEY;
        let apod = null;
        let neos = null;
        let marsPhotos = null;
        if (nasaKey) {
            try {
                const apodResp = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${nasaKey}`);
                apod = apodResp.data;
            } catch (e) {
                console.warn('Could not fetch APOD:', e.message);
            }

            try {
                const today = new Date().toISOString().split('T')[0];
                const neoResp = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${nasaKey}`);
                neos = (neoResp.data && neoResp.data.near_earth_objects && neoResp.data.near_earth_objects[today]) || null;
            } catch (e) {
                console.warn('Could not fetch NEOs:', e.message);
            }

            try {
                const marsResp = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${nasaKey}`);
                marsPhotos = marsResp.data.latest_photos || null;
            } catch (e) {
                console.warn('Could not fetch Mars photos:', e.message);
            }
        }

        res.render('nasa-data', { user: user, issData, apod, neos, marsPhotos, hasNasaKey: !!nasaKey });
    } catch (error) {
        console.error("Error loading NASA data page:", error);
        res.send("Could not load data hub.");
    }
});

// Detail pages open in new tab
app.get('/nasa/iss', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    try {
        const user = await User.findById(req.session.userId);
        let issData = null;
        try { issData = (await axios.get('http://api.open-notify.org/iss-now.json')).data; } catch(e) { }
        res.render('nasa-iss', { user, issData });
    } catch (e) { res.sendStatus(500); }
});

app.get('/nasa/apod', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    try {
        const user = await User.findById(req.session.userId);
        let apod = null;
        if (process.env.NASA_API_KEY) {
            try { apod = (await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`)).data; } catch(e) {}
        }
        res.render('nasa-apod', { user, apod });
    } catch (e) { res.sendStatus(500); }
});

app.get('/nasa/neos', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    try {
        const user = await User.findById(req.session.userId);
        let neos = null;
        if (process.env.NASA_API_KEY) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const resp = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${process.env.NASA_API_KEY}`);
                neos = (resp.data && resp.data.near_earth_objects && resp.data.near_earth_objects[today]) || null;
            } catch(e) {}
        }
        res.render('nasa-neos', { user, neos });
    } catch (e) { res.sendStatus(500); }
});

app.get('/nasa/mars-photos', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    try {
        const user = await User.findById(req.session.userId);
        let marsPhotos = null;
        if (process.env.NASA_API_KEY) {
            try { marsPhotos = (await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${process.env.NASA_API_KEY}`)).data.latest_photos; } catch(e) {}
        }
        res.render('nasa-mars', { user, marsPhotos });
    } catch (e) { res.sendStatus(500); }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// AR demo page
app.get('/ar', async (req, res) => {
    try {
        const user = req.session.userId ? await User.findById(req.session.userId) : null;
        res.render('ar', { user });
    } catch (e) { console.error(e); res.sendStatus(500); }
});

// Solar Builder - interactive page to assemble a system
app.get('/solar-builder', async (req, res) => {
    try {
        const user = req.session.userId ? await User.findById(req.session.userId) : null;
        const planets = require('./data/planets');
        res.render('solar-builder', { user, planets });
    } catch (e) { console.error(e); res.sendStatus(500); }
});

app.post('/solar-builder/save', express.json(), async (req, res) => {
    try {
        // save the posted system to session to keep it simple
        req.session.customSystem = req.body.system || [];
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ ok: false }); }
});