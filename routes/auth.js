const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // <-- THE MISSING LINE
const User = require('../models/User');

// Route to SHOW the registration page
router.get('/register', (req, res) => {
    res.render('register');
});

// Route to HANDLE the form submission
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.send('Username already taken. Please choose another.');
        }
        const newUser = new User({ username, password });
        await newUser.save();
        res.redirect('/auth/login');
    } catch (error) {
        console.log(error);
        res.send('Something went wrong.');
    }
});

// Route to SHOW the login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Route to HANDLE the login form submission
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.send('Invalid username or password.');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('Invalid username or password.');
        }
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } catch (error) {
        console.log(error);
        res.send('Something went wrong.');
    }
});

// Route for logging out
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

module.exports = router;