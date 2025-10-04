// utils/questionGen.js
// Simple deterministic "question generator" that creates a question from a fact string.
// This is intentionally light-weight and rule-based (no external AI calls).

function generateFromFact(fact) {
    // Basic heuristics to generate a question and answer from a fact sentence.
    // Example fact: "Mars has the largest volcano in the Solar System, Olympus Mons."
    // We'll try to extract a subject and object using simple patterns.

    let question = `According to today's fact, ${fact}`;
    let answer = '';
    let type = 'text';
    let options = null;

    // Simple patterns
    if (/has the largest ([a-z ]+)/i.test(fact)) {
        const m = fact.match(/has the largest ([a-z ]+)/i);
        const thing = m ? m[1].trim() : null;
        if (thing) {
            question = `Which object is noted for having the largest ${thing}?`;
            // try to extract the subject (before 'has')
            const subjMatch = fact.match(/^([A-Z][a-zA-Z0-9 ]+)/);
            answer = subjMatch ? subjMatch[1].trim() : '';
            type = 'mcq';
            // add some plausible distractors
            options = [answer, 'Earth', 'Venus', 'Jupiter'].slice(0,4);
        }
    } else if (/is the largest planet/i.test(fact)) {
        question = 'Which planet is the largest in the Solar System?';
        answer = 'Jupiter';
        type = 'mcq';
        options = ['Jupiter', 'Saturn', 'Earth', 'Neptune'];
    } else if (/causes tides/i.test(fact)) {
        question = 'What causes tides on Earth?';
        answer = 'The Moon\'s gravity';
        type = 'text';
    } else if (/has the most moons/i.test(fact) || /has the most number of moons/i.test(fact)) {
        question = 'Which planet has the most moons?';
        answer = 'Saturn';
        type = 'mcq';
        options = ['Saturn', 'Jupiter', 'Earth', 'Mars'];
    } else if (/contains over [0-9]+ billion stars/i.test(fact) || /contains over [0-9]+ billion/i.test(fact)) {
        question = 'Approximately how many stars does the Milky Way contain?';
        answer = fact.match(/over ([0-9]+ billion)/i) ? fact.match(/over ([0-9]+ billion)/i)[1] : '100 billion';
        type = 'text';
    } else if (/composed of ice, dust/i.test(fact) || /comets are composed/i.test(fact)) {
        question = 'Comets are mainly composed of what?';
        answer = 'Ice and dust';
        type = 'mcq';
        options = ['Ice and dust', 'Iron and nickel', 'Gas only', 'Silicate rock'];
    } else {
        // fallback: ask a simple question repeating the fact
        question = `According to today's fact, ${fact.split('.').slice(0,1).join('.')}`;
        answer = fact;
        type = 'text';
    }

    return { question, type, options, answer };
}

module.exports = { generateFromFact };
