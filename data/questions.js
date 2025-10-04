// data/questions.js
// Custom quiz questions for the application. Do NOT include answers in views.
module.exports = [
    {
        id: 'q1',
        type: 'mcq',
        prompt: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Earth', 'Mars', 'Jupiter'],
        answer: 'Mars'
    },
    {
        id: 'q2',
        type: 'mcq',
        prompt: 'What is the primary component of the Sun?',
        options: ['Iron', 'Hydrogen', 'Oxygen', 'Carbon Dioxide'],
        answer: 'Hydrogen'
    },
    {
        id: 'q3',
        type: 'text',
        prompt: 'Name the galaxy that contains our Solar System.',
        answer: 'Milky Way'
    },
    {
        id: 'q4',
        type: 'mcq',
        prompt: 'Which force keeps planets in orbit around the Sun?',
        options: ['Magnetism', 'Gravity', 'Friction', 'Electricity'],
        answer: 'Gravity'
    },
    {
        id: 'q5',
        type: 'mcq',
        prompt: 'Which planet has the most moons?',
        options: ['Earth', 'Saturn', 'Mercury', 'Venus'],
        answer: 'Saturn'
    }
];
