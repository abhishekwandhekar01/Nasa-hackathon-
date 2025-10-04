// data/missions.js
// Curated list of interesting NASA missions with metadata for display.
module.exports = [
    {
        id: 'apollo11',
        name: 'Apollo 11',
        agency: 'NASA',
        launchDate: '1969-07-16',
        summary: 'First crewed mission to land humans on the Moon and return them safely to Earth. Neil Armstrong and Buzz Aldrin walked on the lunar surface.',
        achievements: ['First humans on the Moon', 'Collected lunar samples', 'Deployed scientific experiments'],
        funFact: 'Neil Armstrong\'s first step was broadcast on live TV to an estimated 600 million people worldwide.',
    image: '/img/earth.png'
    },
    {
        id: 'voyager1',
        name: 'Voyager 1',
        agency: 'NASA',
        launchDate: '1977-09-05',
        summary: 'A long-lived probe that explored the outer planets and is now in interstellar space, sending back data about the heliosphere.',
        achievements: ['First detailed images of outer planets', 'Entered interstellar space', 'Golden Record onboard'],
        funFact: 'Voyager 1 carries a Golden Record with sounds and images intended for any intelligent extraterrestrial life that might find it.',
    image: '/img/jupiter.png'
    },
    {
        id: 'curiosity',
        name: 'Mars Curiosity Rover',
        agency: 'NASA/JPL',
        launchDate: '2011-11-26',
        summary: 'Curiosity is a car-sized rover exploring Gale Crater on Mars to investigate the planet\'s past habitability.',
        achievements: ['Found evidence of ancient water', 'Analyzed rock chemistry', 'Long-lived surface operations'],
        funFact: 'Curiosity used a sky crane maneuver for its landing, a first for Mars missions.',
    image: '/img/mars.png'
    },
    {
        id: 'cassini',
        name: 'Cassini–Huygens',
        agency: 'NASA/ESA/ASI',
        launchDate: '1997-10-15',
        summary: 'A flagship mission to Saturn and its moons; Huygens landed on Titan to provide the first direct surface data.',
        achievements: ['Mapped Saturn\'s rings', 'Huygens landed on Titan', 'Discovered active geology on Enceladus'],
        funFact: 'Cassini discovered geyser-like plumes on Saturn\'s moon Enceladus, hinting at subsurface oceans.',
    image: '/img/saturn.png'
    },
    {
        id: 'hubble',
        name: 'Hubble Space Telescope',
        agency: 'NASA/ESA',
        launchDate: '1990-04-24',
        summary: 'A space telescope that has provided deep and detailed images of distant galaxies and nebulae, revolutionizing astronomy.',
        achievements: ['Captured deep field images', 'Measured cosmic expansion rate', 'Overhauled by service missions'],
        funFact: 'Hubble helped refine the age of the universe and has been serviced multiple times by Space Shuttle missions.',
    image: '/img/neptune.png'
    }
];
