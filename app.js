// app.js (Complete updated version)

require('dotenv').config();
// Quick sanity check for the chat API key (do NOT log the key itself)
if (typeof process !== 'undefined') {
    try {
        // Print presence state only to help debugging — do not expose the secret
        console.log('Chat API key configured:', !!process.env.GEMINI_API_KEY);
    } catch (e) { /* ignore logging errors */ }
}
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
app.use(express.json());
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
    // 1. Get the user object from the request (standard with Passport.js or custom auth)
    //    If no user is logged in, this will be null or undefined.
    const currentUser = req.user || null; 
    
    // 2. Pass the 'user' variable to the template
    res.render('home', { 
        user: currentUser 
    }); 
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
        let photos = null;
        if (process.env.NASA_API_KEY) {
            try {
                const response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${process.env.NASA_API_KEY}`);
                photos = response.data.latest_photos;
            } catch (e) {
                console.warn('Could not fetch Mars rover photos:', e.message);
            }
        }
        res.render('mars-rover', { user: user, photos }); // Add user here

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
app.get('/neo-mission', async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    try {
        const user = await User.findById(req.session.userId);
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${process.env.NASA_API_KEY}`);
        const neos = (response.data && response.data.near_earth_objects && response.data.near_earth_objects[today]) || [];

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

// Chat proxy route for Gemini / Generative Language API
// app.js (replace the old /api/chat route with this)

// app.js (replace your old /api/chat route with this one)

// app.js (Verified /api/chat route)

// app.js (replace the old /api/chat route with this robust version)

// app.js (replace your /api/chat route with this new one for Cosmos)

app.post('/api/chat', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required. Please log in again.' });
    }
    const userMessage = (req.body.message || '').toString().trim();
    if (!userMessage) return res.status(400).json({ error: 'No message provided.' });

    // Prefer Hugging Face as the primary provider
    const triedProviders = [];
    const hfToken = process.env.HF_API_TOKEN;
    const hfModel = process.env.HF_FALLBACK_MODEL || 'microsoft/DialoGPT-medium';

    // Per-session custom system prompt and canned responses
    const customSystemPrompt = req.session && req.session.customSystemPrompt ? req.session.customSystemPrompt : null;
    const canned = req.session && Array.isArray(req.session.cannedResponses) ? req.session.cannedResponses : [];

    // Check canned responses first (exact match or substring)
    try {
        for (const c of canned) {
            if (!c || !c.trigger) continue;
            const trig = String(c.trigger).trim().toLowerCase();
            if (!trig) continue;
            const msg = String(userMessage).toLowerCase();
            if (msg === trig || msg.includes(trig)) {
                return res.json({ reply: c.response, provider: 'local-canned', cannedId: c.id });
            }
        }
    } catch (e) {
        console.warn('Canned response check error:', e && e.message);
    }

    if (hfToken) {
        try {
            const hfInput = customSystemPrompt ? `${customSystemPrompt}\nUser: ${userMessage}` : userMessage;
            const hfResp = await axios.post(`https://api-inference.huggingface.co/models/${hfModel}`, { inputs: hfInput }, { headers: { 'Authorization': `Bearer ${hfToken}` }, timeout: 20000 });
            // Try to extract different response shapes
            let hfReply = null;
            if (hfResp && hfResp.data) {
                if (Array.isArray(hfResp.data) && hfResp.data[0]) {
                    if (typeof hfResp.data[0] === 'string') hfReply = hfResp.data[0];
                    else if (hfResp.data[0].generated_text) hfReply = hfResp.data[0].generated_text;
                } else if (typeof hfResp.data.generated_text === 'string') hfReply = hfResp.data.generated_text;
                else if (typeof hfResp.data === 'string') hfReply = hfResp.data;
            }
            if (hfReply) return res.json({ reply: hfReply, provider: 'huggingface' });
            // Record that HF returned but with unexpected shape
            triedProviders.push({ provider: 'huggingface', ok: false, reason: 'unexpected_shape', raw: hfResp && hfResp.data });
            console.warn('HF returned unexpected shape:', hfResp && hfResp.data);
        } catch (hfErr) {
            // Record HF error and continue to Cosmos fallback
            const hfRemote = hfErr && hfErr.response && hfErr.response.data;
            triedProviders.push({ provider: 'huggingface', ok: false, reason: 'request_failed', status: hfErr && hfErr.response && hfErr.response.status, raw: hfRemote || hfErr.message });
            console.warn('Hugging Face call failed:', hfErr && (hfErr.response ? hfErr.response.data : hfErr.message));
            // If HF returned 404 (model not found), attempt a small list of fallback models automatically
            const status = hfErr && hfErr.response && hfErr.response.status;
            if (status === 404) {
                const fallbackModels = ['gpt2', 'distilgpt2', 'facebook/blenderbot-400M-distill'];
                for (const fm of fallbackModels) {
                    try {
                        const fr = await axios.post(`https://api-inference.huggingface.co/models/${fm}`, { inputs: userMessage }, { headers: { Authorization: `Bearer ${hfToken}` }, timeout: 20000 });
                        // extract text similarly
                        let fmReply = null;
                        if (fr && fr.data) {
                            if (Array.isArray(fr.data) && fr.data[0]) {
                                if (typeof fr.data[0] === 'string') fmReply = fr.data[0];
                                else if (fr.data[0].generated_text) fmReply = fr.data[0].generated_text;
                            } else if (typeof fr.data.generated_text === 'string') fmReply = fr.data.generated_text;
                            else if (typeof fr.data === 'string') fmReply = fr.data;
                        }
                        triedProviders.push({ provider: 'huggingface', model: fm, ok: !!fmReply, status: fr.status, raw: fr.data });
                        if (fmReply) return res.json({ reply: fmReply, provider: 'huggingface', model: fm });
                    } catch (fe) {
                        const raw = fe && fe.response && fe.response.data || fe.message;
                        triedProviders.push({ provider: 'huggingface', model: fm, ok: false, status: fe && fe.response && fe.response.status, raw });
                        console.warn(`HF fallback model ${fm} failed:`, raw);
                    }
                }
            }
        }
    } else {
        triedProviders.push({ provider: 'huggingface', ok: false, reason: 'not_configured' });
    }

    // If HF not configured or failed to produce usable reply, try Cosmos/DeepSeek if configured
    const dsKey = process.env.Cosmos_API_KEY || process.env.DEEPSEEK_API_KEY;
    const dsProviderName = process.env.Cosmos_API_KEY ? 'Cosmos' : (process.env.DEEPSEEK_API_KEY ? 'DeepSeek' : null);
    if (!dsKey) {
        // No secondary provider configured — return the triedProviders detail for debugging
        return res.status(502).json({ error: 'No AI providers available. Configure HF_API_TOKEN or Cosmos_API_KEY/DEEPSEEK_API_KEY.', triedProviders });
    }

    try {
        // Use the appropriate upstream depending on which key is present
        const apiUrl = process.env.Cosmos_API_KEY ? 'https://api.Cosmos.com/chat/completions' : 'https://api.deepseek.com/chat/completions';
        const payload = {
            model: process.env.Cosmos_API_KEY ? 'Cosmos-chat' : 'deepseek-chat',
            messages: [
                { role: 'system', content: customSystemPrompt || 'You are a helpful NASA space exploration expert named Cosmo. Answer questions about planets, missions, stars, and space technology. Be friendly and keep answers concise.' },
                { role: 'user', content: userMessage }
            ]
        };
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dsKey}` };
        const response = await axios.post(apiUrl, payload, { headers, timeout: 20000 });
        let reply = null;
        const data = response && response.data;
        try {
            if (data) {
                if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
                    const c = data.choices[0];
                    if (c.message && typeof c.message.content === 'string') reply = c.message.content;
                    else if (c.message && c.message.content && typeof c.message.content === 'object' && c.message.content.text) reply = c.message.content.text;
                    else if (c.text) reply = c.text;
                    else if (typeof c === 'string') reply = c;
                } else if (typeof data.reply === 'string') {
                    reply = data.reply;
                } else if (Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string') {
                    reply = data[0].generated_text;
                }
            }
        } catch (parseErr) {
            console.warn('Cosmos response parse error:', parseErr && parseErr.toString());
        }
        if (reply) return res.json({ reply, provider: dsProviderName || 'secondary' });
        throw { __Cosmos_unexpected__: true, data };
    } catch (error) {
        const remote = error && error.response && error.response.data;
        const isInsufficient = (error && error.response && error.response.status === 402) || (remote && (remote.error && /insufficient/i.test(String(remote.error.message || remote.error))));
        if (isInsufficient) {
            triedProviders.push({ provider: dsProviderName || 'secondary', ok: false, reason: 'insufficient_balance', remote });
            return res.status(402).json({
                error: `${dsProviderName || 'Secondary provider'} reported insufficient balance.`,
                code: `${dsProviderName || 'secondary'}_insufficient_balance`,
                remediation: `Refill your ${dsProviderName || 'secondary'} balance or configure HF_API_TOKEN in .env to use Hugging Face as a primary provider.`,
                triedProviders
            });
        }
        if (error && error.__Cosmos_unexpected__) {
            triedProviders.push({ provider: dsProviderName || 'secondary', ok: false, reason: 'unexpected_shape', raw: error.data });
            console.error(`${dsProviderName || 'Secondary provider'} returned unexpected response shape:`, error.data);
            return res.status(502).json({ error: `${dsProviderName || 'Secondary provider'} returned an unexpected response format. Check server logs.`, triedProviders });
        }
        triedProviders.push({ provider: dsProviderName || 'secondary', ok: false, reason: 'request_failed', raw: remote || (error && error.message) });
        console.error(`${dsProviderName || 'Secondary provider'} API Error:`, remote || (error && error.message));
        return res.status(500).json({ error: 'Failed to get a response from the AI assistant. Check server logs.', triedProviders });
    }
});
// Start the server after all routes are defined
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Provider status endpoint for quick diagnostics
app.get('/api/chat/provider-status', async (req, res) => {
    // Check Hugging Face first
    const hfToken = process.env.HF_API_TOKEN;
    if (hfToken) {
        try {
            const hfModel = process.env.HF_FALLBACK_MODEL || 'microsoft/DialoGPT-medium';
            const r = await axios.post(`https://api-inference.huggingface.co/models/${hfModel}`, { inputs: 'ping' }, { headers: { Authorization: `Bearer ${hfToken}` }, timeout: 10000 });
            return res.json({ huggingface: { configured: true, reachable: true, status: r.status } });
        } catch (e) {
            const status = e.response ? e.response.status : null;
            const body = e.response ? e.response.data : e.message;
            return res.json({ huggingface: { configured: true, reachable: !!e.response, status, body } });
        }
    }

    // If HF not configured, check Cosmos
    const dsKey = process.env.Cosmos_API_KEY;
    if (!dsKey) return res.json({ Cosmos: { configured: false } });
    try {
        const resp = await axios.post('https://api.Cosmos.com/chat/completions', {
            model: 'Cosmos-chat',
            messages: [ { role: 'system', content: 'healthcheck' }, { role: 'user', content: 'ping' } ]
        }, { headers: { Authorization: `Bearer ${dsKey}` }, timeout: 10000 });
        return res.json({ Cosmos: { configured: true, reachable: true, status: resp.status } });
    } catch (e) {
        const status = e.response ? e.response.status : null;
        const body = e.response ? e.response.data : e.message;
        return res.json({ Cosmos: { configured: true, reachable: !!e.response, status, body } });
    }
});

// Local-only HF test endpoint for debug (no auth) - only accessible from localhost
app.post('/api/chat/test-hf', async (req, res) => {
    const ip = req.ip || req.connection && (req.connection.remoteAddress || req.socket && req.socket.remoteAddress);
    // Normalize typical localhost representations
    if (!ip || !(ip === '::1' || ip === '127.0.0.1' || ip.endsWith('127.0.0.1') || ip === '::ffff:127.0.0.1')) {
        return res.status(403).json({ error: 'Forbidden - this test endpoint is localhost only.' });
    }
    const hfToken = process.env.HF_API_TOKEN;
    if (!hfToken) return res.status(400).json({ error: 'HF_API_TOKEN not configured.' });
    const model = process.env.HF_FALLBACK_MODEL || 'microsoft/DialoGPT-medium';
    const input = (req.body && req.body.inputs) || 'Hello from local test';
    try {
        const r = await axios.post(`https://api-inference.huggingface.co/models/${model}`, { inputs: input }, { headers: { Authorization: `Bearer ${hfToken}` }, timeout: 20000 });
        return res.json({ ok: true, status: r.status, data: r.data });
    } catch (e) {
        return res.status(502).json({ ok: false, status: e.response && e.response.status, body: e.response && e.response.data || e.message });
    }
});

// Endpoint to grade mission quizzes
app.post('/submit-mission-quiz', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Authentication required.' });
    try {
        const { missionId, answers } = req.body || {};
        if (!missionId || !answers) return res.status(400).json({ error: 'Invalid payload.' });
        const missions = require('./data/missions');
        const mission = missions.find(m => m.id === missionId);
        if (!mission) return res.status(404).json({ error: 'Mission not found.' });

        // Build expected answers
        const expected = {
            q1: mission.agency,
            q2: (mission.launchDate || '').split('-')[0],
            q3: (mission.achievements && mission.achievements[0]) || ''
        };

        let score = 0, total = 3;
        // q1: agency
        if ((answers.q1 || '').toString().trim().toLowerCase() === String(expected.q1 || '').toLowerCase()) score++;
        // q2: year
        if ((answers.q2 || '').toString().trim() === String(expected.q2 || '')) score++;
        // q3: achievement option
        if ((answers.q3 || '').toString().trim() === String(expected.q3 || '').trim()) score++;

        // Award XP: 10 XP per correct
        if (score > 0) await addXP(req.session.userId, score * 10);

        return res.json({ ok: true, score, total, message: `You earned ${score * 10} XP.` });
    } catch (e) {
        console.error('Error grading mission quiz:', e);
        return res.status(500).json({ error: 'Server error grading quiz.' });
    }
});