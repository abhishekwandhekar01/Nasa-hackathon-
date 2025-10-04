// utils/knowledgeGen.js
// Lightweight knowledge + question generator. Uses a fact object {id,title,text}
// Produces a 'knowledge' paragraph and a generated question (text or mcq) with an answer.

function generateKnowledgeAndQuestion(fact) {
    // Use the fact.title and fact.text to compose a knowledge paragraph
    const knowledge = `${fact.title}: ${fact.text}`;

    // Simple heuristics to create a question and answer
    let question = '';
    let answer = '';
    let type = 'text';
    let options = null;

    const text = fact.text.toLowerCase();

    if (text.includes('tide') || text.includes('tidal')) {
        question = 'What natural phenomenon on Earth is caused by the Moon\'s gravity?';
        answer = 'Tides';
        type = 'text';
    } else if (text.includes("largest planet") || text.includes('largest planet')) {
        question = 'Which planet is the largest in the Solar System?';
        answer = 'Jupiter';
        type = 'mcq';
        options = ['Jupiter', 'Saturn', 'Earth', 'Mars'];
    } else if (text.includes('rings') && text.includes('saturn')) {
        question = 'What are Saturn\'s rings mostly made of?';
        answer = 'Water ice';
        type = 'mcq';
        options = ['Water ice', 'Iron', 'Carbon dioxide', 'Silicates'];
    } else if (text.includes('olympus mons') || text.includes('tallest volcano')) {
        question = 'On which planet is Olympus Mons located?';
        answer = 'Mars';
        type = 'mcq';
        options = ['Mars', 'Earth', 'Venus', 'Mercury'];
    } else if (text.includes('milky way') || text.includes('galaxy')) {
        question = 'Approximately how many stars does the Milky Way contain (order of magnitude)?';
        answer = '100 billion';
        type = 'text';
    } else {
        // fallback: ask for the title
        question = `What is the topic of the following paragraph?`;
        answer = fact.title;
        type = 'text';
    }

    return { knowledge, question, type, options, answer };
}

module.exports = { generateKnowledgeAndQuestion };
