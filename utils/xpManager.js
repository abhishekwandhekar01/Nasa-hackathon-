const User = require('../models/User');

// Define the total XP required to reach each level. Level 1 is 0 XP, Level 2 is 100 XP, etc.
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000]; // etc.

const addXP = async (userId, amount) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // Add the XP
        user.xp += amount;

        // Check for level up
        let currentLevel = user.level;
        // Keep leveling up as long as the user's XP exceeds the threshold for the next level
        while (currentLevel < LEVEL_THRESHOLDS.length && user.xp >= LEVEL_THRESHOLDS[currentLevel]) {
            currentLevel++;
        }

        // Assign the new level if it changed
        if (currentLevel > user.level) {
            user.level = currentLevel;
            // You could add a notification here in the future
        }

        await user.save();
    } catch (error) {
        console.error("Error adding XP:", error);
    }
};

module.exports = { addXP };