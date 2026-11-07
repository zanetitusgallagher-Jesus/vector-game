// Hoofquake — content definitions: animals, vehicles, cosmetics, furniture, properties, map sites.
'use strict';

H.RAR = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical', 'Secret'];
H.RAR_COL = ['#b9c2cc', '#62d46c', '#4aa6ff', '#b673ff', '#ffb52b', '#ff5592', '#2ff0d6'];
H.RAR_PRICE = [150, 400, 1000, 2400, 6000, 15000, 0];

// ---------------- MAP SITES (shared by world, missions, map) ----------------
// x = east, z = south. Ocean lies past z ≈ 1150.
H.WORLD = { size: 3200, half: 1600, water: 0 };
H.SITES = {
  city: { x: 0, z: 0, r: 290, h: 3, name: 'Bleatsburg City' },
  mall: { x: 400, z: 340, r: 120, h: 3, name: 'Megamall Plaza' },
  industrial: { x: 450, z: -330, r: 110, h: 3, name: 'Rustworks Industrial' },
  airport: { x: 1020, z: -60, r: 330, h: 3, name: 'Gust International Airport' },
  suburbs: { x: -500, z: 60, r: 180, h: 4, name: 'Maple Loop Suburbs' },
  mansions: { x: -660, z: -380, r: 120, h: 34, name: 'Gilded Hill Mansions' },
  themepark: { x: -270, z: 570, r: 150, h: 3, name: 'Wobbleland Theme Park' },
  sports: { x: 230, z: -480, r: 120, h: 3, name: 'Kickabout Sports Complex' },
  golf: { x: -600, z: -720, r: 130, h: 6, name: 'Tumbleweed Golf Club' },
  lake: { x: -280, z: -560, r: 120, h: -9, name: 'Lake Lumpy' },
  farm: { x: -920, z: 520, r: 190, h: 5, name: 'Clover Patch Farm' },
  village: { x: -1180, z: 120, r: 120, h: 6, name: 'Little Hayfield Village' },
  forest: { x: -950, z: -680, r: 260, h: null, name: 'Whispering Pines' },
  jungle: { x: 980, z: -860, r: 260, h: null, name: 'Tangleroot Jungle' },
  mountains: { x: 0, z: -1250, r: 500, h: null, name: 'Grumblepeak Mountains' },
  desert: { x: 1080, z: 660, r: 300, h: null, name: 'Dustbowl Desert' },
  stuntpark: { x: 1100, z: 560, r: 90, h: 6, name: 'Dustbowl Stunt Park' },
  beach: { x: 0, z: 1100, r: 1400, h: null, name: 'Sunbaked Beach' },
  skatepark: { x: 150, z: 430, r: 60, h: 3, name: 'Grindstone Skatepark' },
  island: { x: 650, z: 1420, r: 70, h: null, name: 'Coconut Key' },
  lab: { x: 470, z: -420, r: 10, h: 3, name: 'Shed #9 (?)' },
  cave: { x: 120, z: -930, r: 12, h: null, name: 'Grumble Cave' },
  pier: { x: 220, z: 1140, r: 30, h: 3, name: 'Old Pier' },
  lighthouse: { x: -1250, z: 1060, r: 30, h: 8, name: 'Lighthouse Point' },
  ufo: { x: 1300, z: 900, r: 40, h: null, name: 'Crash Site' },
  temple: { x: 1060, z: -940, r: 50, h: null, name: 'Sunken Temple' },
  observatory: { x: -160, z: -1330, r: 30, h: null, name: 'Peak Observatory' },
};
H.RIVER = z => 640 + 70 * Math.sin(z / 180) + 25 * Math.sin(z / 61); // river centerline x(z)

// ---------------- ANIMALS ----------------
// kind: quad | biped | bird | fish | blob ; body [w,h,l]; leg length; neck; head size
// sp = special ability; atk = primary attack; voice = synth preset
H.ANIMALS = [
  { id: 'goat', name: 'Goat', price: 0, col: '#e8e2d4', col2: '#8a7a66', kind: 'quad', body: [0.9, 0.8, 1.5], leg: 0.75, neck: 0.5, head: 0.5, horns: 'goat', ears: 'floppy', tail: 'short', beard: 1, stats: { spd: 9, jmp: 11, mass: 1, swim: 0.6, climb: 0.55 }, atk: 'headbutt', sp: 'bigbutt', voice: ['bleat', 520], desc: 'The classic. Climbs like a menace, headbutts like a freight train.' },
  { id: 'sheep', name: 'Sheep', price: 800, col: '#f6f3ea', col2: '#3a3430', kind: 'quad', body: [1.2, 1.0, 1.4], leg: 0.6, neck: 0.3, head: 0.45, ears: 'floppy', tail: 'short', wool: 1, stats: { spd: 8, jmp: 10, mass: 1.1, swim: 0.7 }, atk: 'headbutt', sp: 'woolball', voice: ['baa', 380], desc: 'Curls into a bouncing wool ball and rolls through everything.' },
  { id: 'cow', name: 'Cow', price: 2500, col: '#f2f0ea', col2: '#2b2622', kind: 'quad', body: [1.4, 1.2, 2.3], leg: 0.9, neck: 0.4, head: 0.65, horns: 'small', ears: 'round', tail: 'long', spots: 1, stats: { spd: 8, jmp: 9, mass: 2.4, swim: 0.6 }, atk: 'headbutt', sp: 'moo', voice: ['moo', 140], desc: 'Releases a Moo so loud it knocks people over.' },
  { id: 'pig', name: 'Pig', price: 1500, col: '#f3a9b4', col2: '#d97f8f', kind: 'quad', body: [1.1, 0.9, 1.6], leg: 0.45, neck: 0.1, head: 0.55, snout: 1, ears: 'pointy', tail: 'curly', stats: { spd: 8.5, jmp: 9, mass: 1.5, swim: 0.8 }, atk: 'headbutt', sp: 'slide', voice: ['oink', 300], desc: 'Belly-slides at alarming speed. Mud optional.' },
  { id: 'horse', name: 'Horse', price: 6000, col: '#8a5a36', col2: '#2e1d12', kind: 'quad', body: [1.0, 1.1, 2.3], leg: 1.4, neck: 1.0, head: 0.6, ears: 'pointy', tail: 'long', mane: 1, stats: { spd: 15, jmp: 12, mass: 2.2, swim: 0.7 }, atk: 'kick', sp: 'buck', voice: ['neigh', 420], desc: 'Fastest hooves in town. Bucks anything behind it into orbit.' },
  { id: 'dog', name: 'Dog', price: 1200, col: '#c8904a', col2: '#6b4520', kind: 'quad', body: [0.8, 0.7, 1.4], leg: 0.6, neck: 0.3, head: 0.5, snout: 1, ears: 'floppy', tail: 'wag', stats: { spd: 11, jmp: 10, mass: 0.9, swim: 0.9, dig: 1 }, atk: 'bite', sp: 'bark', voice: ['bark', 260], desc: 'Good sniffer: digs up treasure faster and barks people away.' },
  { id: 'cat', name: 'Cat', price: 1200, col: '#555a66', col2: '#e4e4e4', kind: 'quad', body: [0.55, 0.55, 1.1], leg: 0.5, neck: 0.25, head: 0.42, ears: 'pointy', tail: 'long', stats: { spd: 10, jmp: 13, mass: 0.6, swim: 0.3, climb: 1, dbl: 1 }, atk: 'bite', sp: 'pounce', voice: ['meow', 700], desc: 'Climbs any wall, double-jumps, always lands on its feet.' },
  { id: 'rabbit', name: 'Rabbit', price: 900, col: '#efe8e0', col2: '#ffb3c1', kind: 'quad', body: [0.55, 0.55, 0.8], leg: 0.35, neck: 0.1, head: 0.42, ears: 'long', tail: 'puff', stats: { spd: 10, jmp: 17, mass: 0.5, swim: 0.4, dbl: 1 }, atk: 'kick', sp: 'superhop', voice: ['squeak', 900], desc: 'Jumps higher than most buildings. Feet of steel.' },
  { id: 'hamster', name: 'Hamster', price: 700, col: '#e8b070', col2: '#fff3e0', kind: 'quad', body: [0.55, 0.5, 0.65], leg: 0.18, neck: 0, head: 0.42, ears: 'round', tail: 'none', stats: { spd: 9, jmp: 9, mass: 0.35, swim: 0.4 }, atk: 'bite', sp: 'woolball', voice: ['squeak', 1200], desc: 'Tiny. Rolls up in a hamster ball and becomes a bowling ball.' },
  { id: 'chicken', name: 'Chicken', price: 600, col: '#fbfaf5', col2: '#e23b2e', kind: 'bird', body: [0.6, 0.7, 0.75], leg: 0.45, neck: 0.25, head: 0.35, beak: 1, comb: 1, tail: 'fan', wings: 1, stats: { spd: 9, jmp: 9, mass: 0.5, swim: 0.3, glide: 1 }, atk: 'peck', sp: 'eggbomb', voice: ['cluck', 800], desc: 'Glides badly. Lays explosive eggs, for some reason.' },
  { id: 'lion', name: 'Lion', price: 9000, col: '#d6a050', col2: '#7a4a1c', kind: 'quad', body: [1.0, 1.0, 1.9], leg: 0.9, neck: 0.4, head: 0.62, ears: 'round', tail: 'tuft', mane: 2, stats: { spd: 13, jmp: 12, mass: 2, swim: 0.5 }, atk: 'bite', sp: 'roar', voice: ['roar', 110], desc: 'Its roar sends whole crowds running.' },
  { id: 'tiger', name: 'Tiger', price: 9500, col: '#e8862a', col2: '#1b1410', kind: 'quad', body: [1.0, 0.95, 2.0], leg: 0.85, neck: 0.35, head: 0.6, ears: 'round', tail: 'long', stripes: 1, stats: { spd: 13.5, jmp: 13, mass: 1.9, swim: 0.9 }, atk: 'bite', sp: 'pounce', voice: ['roar', 140], desc: 'Long-range pounce that tackles anything it lands on.' },
  { id: 'bear', name: 'Bear', price: 8000, col: '#6b4524', col2: '#3a2412', kind: 'quad', body: [1.5, 1.4, 2.0], leg: 0.8, neck: 0.3, head: 0.7, snout: 1, ears: 'round', tail: 'short', stats: { spd: 10, jmp: 10, mass: 3, swim: 0.9, climb: 0.5 }, atk: 'punch', sp: 'stomp', voice: ['growl', 90], desc: 'Ground-pound shockwaves. Excellent swimmer.' },
  { id: 'wolf', name: 'Wolf', price: 5000, col: '#8c9096', col2: '#e0e0e0', kind: 'quad', body: [0.8, 0.8, 1.6], leg: 0.85, neck: 0.4, head: 0.5, snout: 1, ears: 'pointy', tail: 'fluffy', stats: { spd: 14, jmp: 12, mass: 1.2, swim: 0.7 }, atk: 'bite', sp: 'howl', voice: ['howl', 380], desc: 'Howls for a speed boost and scatters everyone nearby.' },
  { id: 'gorilla', name: 'Gorilla', price: 11000, col: '#2c2a2a', col2: '#5a5250', kind: 'biped', body: [1.3, 1.5, 1.0], leg: 0.6, neck: 0, head: 0.6, ears: 'round', tail: 'none', arms: 1.3, stats: { spd: 10, jmp: 12, mass: 2.6, swim: 0.4, climb: 1 }, atk: 'punch', sp: 'chestpound', voice: ['grunt', 120], desc: 'Climbs skyscrapers and punches cars across the street.' },
  { id: 'croc', name: 'Crocodile', price: 7000, col: '#4a6b30', col2: '#c8c080', kind: 'quad', body: [0.9, 0.55, 2.6], leg: 0.35, neck: 0, head: 0.5, snout: 2, ears: 'none', tail: 'croc', spikes: 1, stats: { spd: 8, jmp: 7, mass: 2, swim: 1.6, dive: 1 }, atk: 'bite', sp: 'deathroll', voice: ['hiss', 150], desc: 'Rocket-fast swimmer. Death-rolls anything it grabs.' },
  { id: 'elephant', name: 'Elephant', price: 16000, col: '#8f9196', col2: '#e8e0d0', kind: 'quad', body: [2.0, 1.9, 2.8], leg: 1.3, neck: 0, head: 1.0, ears: 'elephant', trunk: 1, tusks: 1, tail: 'short', stats: { spd: 8, jmp: 7, mass: 6, swim: 0.8 }, atk: 'headbutt', sp: 'spray', voice: ['trumpet', 220], desc: 'Walking wrecking ball with a pressure-washer trunk.' },
  { id: 'rhino', name: 'Rhino', price: 14000, col: '#7c7b78', col2: '#5d5c5a', kind: 'quad', body: [1.6, 1.4, 2.6], leg: 0.8, neck: 0, head: 0.8, horns: 'rhino', ears: 'pointy', tail: 'short', stats: { spd: 11, jmp: 8, mass: 5, swim: 0.5 }, atk: 'headbutt', sp: 'charge', voice: ['snort', 160], desc: 'Unstoppable charge. Cars count as speed bumps.' },
  { id: 'kangaroo', name: 'Kangaroo', price: 6500, col: '#b27a48', col2: '#e8d0b0', kind: 'biped', body: [0.8, 1.3, 0.9], leg: 0.9, neck: 0.3, head: 0.48, ears: 'long', tail: 'thick', arms: 0.6, stats: { spd: 13, jmp: 18, mass: 1.4, swim: 0.5 }, atk: 'kick', sp: 'superhop', voice: ['chuff', 300], desc: 'Bounces over traffic and drop-kicks the consequences.' },
  { id: 'eagle', name: 'Eagle', price: 12000, col: '#5a3a20', col2: '#fbfbf5', kind: 'bird', body: [0.7, 0.75, 1.1], leg: 0.4, neck: 0.2, head: 0.4, beak: 2, tail: 'fan', wings: 2, stats: { spd: 9, jmp: 10, mass: 0.8, swim: 0.3, fly: 1 }, atk: 'peck', sp: 'dive', voice: ['screech', 1400], desc: 'True flight. Dive-bombs from the clouds.' },
  { id: 'owl', name: 'Owl', price: 9000, col: '#9c7a52', col2: '#efe2c4', kind: 'bird', body: [0.75, 0.9, 0.75], leg: 0.25, neck: 0, head: 0.6, beak: 1, ears: 'tuft', tail: 'fan', wings: 2, bigeyes: 1, stats: { spd: 8, jmp: 9, mass: 0.6, swim: 0.3, fly: 1 }, atk: 'peck', sp: 'hoot', voice: ['hoot', 330], desc: 'Silent flyer. Its hoot slows time around it.' },
  { id: 'penguin', name: 'Penguin', price: 3000, col: '#1c1f26', col2: '#f5f5f5', kind: 'biped', body: [0.75, 1.0, 0.7], leg: 0.2, neck: 0, head: 0.45, beak: 1, tail: 'none', flippers: 1, stats: { spd: 7, jmp: 8, mass: 0.9, swim: 1.8, dive: 1 }, atk: 'peck', sp: 'slide', voice: ['squawk', 500], desc: 'Clumsy on land, a torpedo in water.' },
  { id: 'flamingo', name: 'Flamingo', price: 2500, col: '#ff8fae', col2: '#2a2a2a', kind: 'bird', body: [0.55, 0.6, 0.85], leg: 1.3, neck: 1.0, head: 0.3, beak: 1, tail: 'fan', wings: 1, stats: { spd: 10, jmp: 12, mass: 0.6, swim: 0.6, glide: 1 }, atk: 'kick', sp: 'buck', voice: ['honk', 600], desc: 'Long legs, longer kicks. Glides with style.' },
  { id: 'giraffe', name: 'Giraffe', price: 13000, col: '#e8b84a', col2: '#8a5422', kind: 'quad', body: [1.0, 1.1, 1.8], leg: 2.0, neck: 2.6, head: 0.5, horns: 'ossicone', ears: 'pointy', tail: 'tuft', spots: 2, stats: { spd: 12, jmp: 9, mass: 2.5, swim: 0.4 }, atk: 'headbutt', sp: 'necksmash', voice: ['hum', 200], desc: 'Neck-swing headbutts with absurd reach.' },
  { id: 'camel', name: 'Camel', price: 5500, col: '#c9a26a', col2: '#9a7444', kind: 'quad', body: [1.1, 1.1, 2.0], leg: 1.4, neck: 1.0, head: 0.5, ears: 'round', tail: 'tuft', hump: 1, stats: { spd: 11, jmp: 9, mass: 2.2, swim: 0.4 }, atk: 'kick', sp: 'spit', voice: ['grumble', 180], desc: 'Spits with sniper accuracy. Loves the desert.' },
  { id: 'zebra', name: 'Zebra', price: 5000, col: '#f4f4f4', col2: '#151515', kind: 'quad', body: [0.95, 1.05, 2.1], leg: 1.3, neck: 0.9, head: 0.55, ears: 'pointy', tail: 'tuft', mane: 1, stripes: 2, stats: { spd: 14.5, jmp: 12, mass: 2, swim: 0.6 }, atk: 'kick', sp: 'buck', voice: ['neigh', 520], desc: 'A horse in pajamas with the kick to match.' },
  { id: 'panda', name: 'Panda', price: 10000, col: '#f5f5f2', col2: '#151515', kind: 'quad', body: [1.4, 1.3, 1.7], leg: 0.6, neck: 0.1, head: 0.75, ears: 'round', tail: 'short', panda: 1, stats: { spd: 8.5, jmp: 9, mass: 2.6, swim: 0.6, climb: 0.6 }, atk: 'punch', sp: 'woolball', voice: ['growl', 200], desc: 'Rolls downhill like a fluffy boulder.' },
  { id: 'fox', name: 'Fox', price: 3500, col: '#e2742a', col2: '#fff4e8', kind: 'quad', body: [0.6, 0.6, 1.2], leg: 0.55, neck: 0.3, head: 0.42, snout: 1, ears: 'pointy', tail: 'fluffy', stats: { spd: 13, jmp: 13, mass: 0.7, swim: 0.6, dig: 1, dbl: 1 }, atk: 'bite', sp: 'pounce', voice: ['yip', 900], desc: 'Nimble digger with a snow-dive pounce.' },
  { id: 'shark', name: 'Land Shark', price: 15000, col: '#6f8596', col2: '#eef2f5', kind: 'fish', body: [0.9, 0.9, 2.6], leg: 0, neck: 0, head: 0.6, fin: 1, tail: 'fishtail', stats: { spd: 7, jmp: 10, mass: 2.2, swim: 2.4, dive: 1 }, atk: 'bite', sp: 'charge', voice: ['chomp', 120], desc: 'Flops across land. Becomes a missile in water.' },
  { id: 'trex', name: 'T-Rex', price: 40000, col: '#4f7a3a', col2: '#c9c47a', kind: 'biped', body: [1.6, 1.8, 2.4], leg: 1.6, neck: 0.4, head: 1.2, snout: 2, tail: 'dino', arms: 0.35, spikes: 0, teeth: 1, scale: 1.6, stats: { spd: 12, jmp: 10, mass: 8, swim: 0.5 }, atk: 'bite', sp: 'roar', voice: ['dinoroar', 70], desc: 'Apex chaos. Its footsteps shake the street.' },
  { id: 'trike', name: 'Triceratops', price: 32000, col: '#7a6a9a', col2: '#e0c070', kind: 'quad', body: [1.8, 1.6, 2.8], leg: 0.9, neck: 0.2, head: 1.0, horns: 'trike', frill: 1, tail: 'dino', scale: 1.4, stats: { spd: 10, jmp: 8, mass: 7, swim: 0.5 }, atk: 'headbutt', sp: 'charge', voice: ['dinoroar', 110], desc: 'Three horns, zero brakes.' },
  { id: 'ptero', name: 'Pterodactyl', price: 30000, col: '#b06a3a', col2: '#e8c090', kind: 'bird', body: [0.6, 0.6, 1.2], leg: 0.4, neck: 0.5, head: 0.5, beak: 3, crest: 1, tail: 'none', wings: 3, scale: 1.3, stats: { spd: 9, jmp: 10, mass: 1.2, swim: 0.3, fly: 1 }, atk: 'peck', sp: 'dive', voice: ['screech', 600], desc: 'Prehistoric glider with a devastating dive.' },
  { id: 'robogoat', name: 'Robo-Goat 3000', price: 25000, col: '#b8c4cc', col2: '#2fd2ff', kind: 'quad', body: [1.0, 0.9, 1.6], leg: 0.8, neck: 0.5, head: 0.55, horns: 'goat', ears: 'antenna', tail: 'short', robot: 1, stats: { spd: 12, jmp: 13, mass: 2, swim: 0.4, fly: 1, jet: 1 }, atk: 'headbutt', sp: 'laser', voice: ['robot', 300], desc: 'Jetpack flight and eye lasers. Batteries included.' },
  { id: 'mechabear', name: 'Mecha Bear', price: 45000, col: '#d04a3a', col2: '#2a2a30', kind: 'quad', body: [1.6, 1.5, 2.1], leg: 0.9, neck: 0.3, head: 0.75, ears: 'round', tail: 'short', robot: 1, scale: 1.3, stats: { spd: 11, jmp: 11, mass: 6, swim: 0.3 }, atk: 'punch', sp: 'rocket', voice: ['robot', 120], desc: 'Shoulder-mounted rocket launcher. Very legal.' },
  { id: 'unicorn', name: 'Unicorn', price: 60000, col: '#fbf7ff', col2: '#ff8ad8', kind: 'quad', body: [1.0, 1.1, 2.2], leg: 1.4, neck: 1.0, head: 0.6, horns: 'unicorn', ears: 'pointy', tail: 'long', mane: 3, stats: { spd: 16, jmp: 14, mass: 2, swim: 0.7, glide: 1 }, atk: 'headbutt', sp: 'rainbowdash', voice: ['neigh', 760], desc: 'Gallops on rainbows. Everything it touches gets launched.' },
  { id: 'dragon', name: 'Dragon', price: 120000, col: '#2e8a4a', col2: '#ffcf3a', kind: 'quad', body: [1.4, 1.3, 2.4], leg: 0.8, neck: 1.0, head: 0.7, horns: 'dragon', ears: 'none', tail: 'dino', wings: 4, spikes: 1, scale: 1.5, stats: { spd: 12, jmp: 12, mass: 5, swim: 0.6, fly: 1 }, atk: 'bite', sp: 'firebreath', voice: ['dinoroar', 160], desc: 'Flies. Breathes fire. Ruins picnics.' },
  // Secret unlocks — cannot be bought
  { id: 'mutant', name: 'Mutant Goat', price: -1, secret: 'Free the specimen in the hidden laboratory.', col: '#7ef25a', col2: '#3a1a5a', kind: 'quad', body: [1.1, 1.0, 1.7], leg: 0.8, neck: 0.6, head: 0.6, horns: 'goat', ears: 'floppy', tail: 'short', extraHeads: 1, glow: '#7ef25a', stats: { spd: 12, jmp: 14, mass: 1.8, swim: 1, climb: 0.8 }, atk: 'headbutt', sp: 'teleport', voice: ['bleat', 260], desc: 'Two heads, unstable atoms, short-range teleport.' },
  { id: 'slime', name: 'Lab Slime', price: -1, secret: 'Found in a vat deep in the hidden laboratory.', col: '#5af2c8', col2: '#2a9a7a', kind: 'blob', body: [1.4, 1.2, 1.4], leg: 0, neck: 0, head: 0, tail: 'none', glow: '#5af2c8', stats: { spd: 9, jmp: 16, mass: 1.5, swim: 1.2, climb: 1 }, atk: 'headbutt', sp: 'superhop', voice: ['blorp', 200], desc: 'Bouncy, sticky, climbs walls, absorbs dignity.' },
  { id: 'mossback', name: 'The Mossback', price: -1, secret: 'Follow the giant footprints in Whispering Pines at night.', col: '#3f4a2a', col2: '#6a8a3a', kind: 'biped', body: [1.4, 2.0, 1.0], leg: 1.1, neck: 0, head: 0.65, ears: 'none', tail: 'none', arms: 1.4, moss: 1, scale: 1.4, stats: { spd: 13, jmp: 13, mass: 4, swim: 0.7, climb: 0.8 }, atk: 'punch', sp: 'chestpound', voice: ['grunt', 70], desc: 'The legendary forest cryptid. Real, apparently.' },
  { id: 'cosmicgoat', name: 'Cosmic Goat', price: -1, secret: 'Collect all 12 Golden Goat Statues.', col: '#24124a', col2: '#ffd7ff', kind: 'quad', body: [1.0, 0.9, 1.6], leg: 0.8, neck: 0.5, head: 0.55, horns: 'goat', ears: 'floppy', tail: 'short', galaxy: 1, glow: '#b98cff', stats: { spd: 14, jmp: 15, mass: 2, swim: 1, climb: 0.8, fly: 1 }, atk: 'headbutt', sp: 'blackhole', voice: ['bleat', 180], desc: 'Contains a small universe. Summons black holes.' },
  { id: 'babyraptor', name: 'Baby Raptor', price: -1, secret: 'Hatch the egg hidden in Grumble Cave.', col: '#8aa040', col2: '#f0e060', kind: 'biped', body: [0.6, 0.7, 1.0], leg: 0.7, neck: 0.4, head: 0.45, snout: 2, tail: 'dino', arms: 0.3, stats: { spd: 15, jmp: 14, mass: 0.8, swim: 0.5, dbl: 1 }, atk: 'bite', sp: 'pounce', voice: ['screech', 900], desc: 'Small, fast, and extremely bitey.' },
];
H.ANIMAL = {}; H.ANIMALS.forEach(a => (H.ANIMAL[a.id] = a));

H.SPECIALS = {
  bigbutt: 'Mega Headbutt', woolball: 'Roll Up', moo: 'Sonic Moo', slide: 'Belly Slide', buck: 'Back Kick', bark: 'Bark',
  pounce: 'Pounce', superhop: 'Super Hop', roar: 'Roar', stomp: 'Ground Pound', howl: 'Howl', chestpound: 'Chest Pound',
  deathroll: 'Death Roll', spray: 'Trunk Blast', charge: 'Charge', dive: 'Dive Bomb', hoot: 'Slow-Mo Hoot', necksmash: 'Neck Swing',
  spit: 'Spit', laser: 'Eye Lasers', rocket: 'Rocket', teleport: 'Blink', firebreath: 'Fire Breath', rainbowdash: 'Rainbow Dash',
  blackhole: 'Black Hole', eggbomb: 'Egg Bomb',
};

// ---------------- VEHICLES ----------------
// type: car | moto | bike | kart | truck | bus | tractor | digger | boat | jetski | sub | heli | plane | skate | hover
H.VEHICLES = [
  { id: 'skate', name: 'Skateboard', type: 'skate', price: 400, spd: 22, acc: 14, turn: 2.6, col: '#e8442a', size: [0.7, 0.15, 1.6] },
  { id: 'bike', name: 'Pedal Bike', type: 'bike', price: 600, spd: 20, acc: 10, turn: 2.4, col: '#2aa0e8', size: [0.5, 1.1, 1.8] },
  { id: 'golfcart', name: 'Golf Cart', type: 'car', price: 1500, spd: 18, acc: 9, turn: 2.0, col: '#f2f2ea', size: [1.4, 1.6, 2.4] },
  { id: 'kart', name: 'Turbo Kart', type: 'kart', price: 2500, spd: 34, acc: 26, turn: 2.8, col: '#ffcc00', size: [1.3, 0.6, 2.0] },
  { id: 'sedan', name: 'Puddlejumper Sedan', type: 'car', price: 3500, spd: 34, acc: 16, turn: 1.9, col: '#4a7ac8', size: [1.9, 1.4, 4.2] },
  { id: 'moto', name: 'Dirt Moto', type: 'moto', price: 4500, spd: 44, acc: 26, turn: 2.6, col: '#e8442a', size: [0.6, 1.1, 2.0] },
  { id: 'icecream', name: 'Ice Cream Van', type: 'truck', price: 6000, spd: 28, acc: 10, turn: 1.5, col: '#f8d0e0', size: [2.2, 2.6, 5.0] },
  { id: 'tractor', name: 'Field Tractor', type: 'tractor', price: 5000, spd: 20, acc: 9, turn: 1.6, col: '#3a9a3a', size: [2.0, 2.2, 3.4] },
  { id: 'police', name: 'Patrol Cruiser', type: 'car', price: 12000, spd: 46, acc: 20, turn: 2.0, col: '#1a1f2e', size: [1.9, 1.5, 4.4] },
  { id: 'pickup', name: 'Mudlark Pickup', type: 'car', price: 9000, spd: 38, acc: 16, turn: 1.8, col: '#a8402a', size: [2.1, 1.8, 4.8] },
  { id: 'hauler', name: 'Big Hauler Truck', type: 'truck', price: 14000, spd: 30, acc: 8, turn: 1.3, col: '#d8d8d0', size: [2.6, 3.4, 8.0] },
  { id: 'bus', name: 'City Bus', type: 'bus', price: 16000, spd: 28, acc: 7, turn: 1.2, col: '#f0b020', size: [2.6, 3.2, 10] },
  { id: 'firetruck', name: 'Fire Truck', type: 'truck', price: 22000, spd: 34, acc: 10, turn: 1.3, col: '#d8261c', size: [2.6, 3.2, 8.5] },
  { id: 'digger', name: 'Mega Digger', type: 'digger', price: 18000, spd: 16, acc: 6, turn: 1.4, col: '#f2a01a', size: [2.8, 3.0, 5.0] },
  { id: 'monster', name: 'Monster Truck', type: 'car', price: 35000, spd: 44, acc: 20, turn: 1.8, col: '#7ad21a', size: [3.0, 3.0, 5.0], bigwheels: 1 },
  { id: 'supercar', name: 'Viperline GT', type: 'car', price: 60000, spd: 70, acc: 34, turn: 2.2, col: '#ff2a4a', size: [2.0, 1.1, 4.5] },
  { id: 'hyper', name: 'Neonbolt X', type: 'car', price: 110000, spd: 88, acc: 44, turn: 2.4, col: '#2affd0', size: [2.0, 1.0, 4.6] },
  { id: 'speedboat', name: 'Speedboat', type: 'boat', price: 15000, spd: 46, acc: 16, turn: 1.6, col: '#fafafa', size: [2.4, 1.4, 6.0] },
  { id: 'jetski', name: 'Wave Jet Ski', type: 'jetski', price: 7000, spd: 42, acc: 24, turn: 2.6, col: '#ff7a1a', size: [1.0, 0.9, 2.6] },
  { id: 'sub', name: 'Deep Diver Sub', type: 'sub', price: 30000, spd: 20, acc: 8, turn: 1.4, col: '#ffd21a', size: [2.4, 2.4, 6.0] },
  { id: 'hover', name: 'Hovercraft', type: 'hover', price: 26000, spd: 40, acc: 14, turn: 1.8, col: '#7a4ac8', size: [2.6, 1.8, 5.0] },
  { id: 'heli', name: 'Whirlybird Chopper', type: 'heli', price: 55000, spd: 50, acc: 16, turn: 1.6, col: '#2a3a5a', size: [2.4, 2.4, 7.0] },
  { id: 'plane', name: 'Prop Plane', type: 'plane', price: 70000, spd: 80, acc: 18, turn: 1.3, col: '#f2f2f2', size: [9, 2.2, 7] },
  { id: 'jet', name: 'Stratos Jet', type: 'plane', price: 150000, spd: 150, acc: 30, turn: 1.4, col: '#8a96a8', size: [10, 2.6, 12] },
  { id: 'saucer', name: 'Lunar Saucer', type: 'heli', price: -1, secret: 'Recover all 5 parts at the desert crash site.', spd: 90, acc: 40, turn: 2.6, col: '#c8d0dc', size: [6, 1.6, 6], saucer: 1 },
];
H.VEHICLE = {}; H.VEHICLES.forEach(v => (H.VEHICLE[v.id] = v));
H.PAINTS = ['#e8442a', '#ff8a1a', '#ffd21a', '#7ad21a', '#1ab06a', '#1ad2c8', '#2a8ae8', '#3a4ae8', '#8a4ae8', '#e84ab0', '#f2f2f2', '#9aa0a8', '#2a2a30', '#8a5a36', '#c8a86a', '#ffd76a'];

// ---------------- COSMETICS (generated: several hundred items) ----------------
H.SLOTS = [
  { id: 'fur', name: 'Fur Color' }, { id: 'pattern', name: 'Pattern' }, { id: 'eyes', name: 'Eyes' },
  { id: 'hat', name: 'Headwear' }, { id: 'face', name: 'Face' }, { id: 'neck', name: 'Neck' },
  { id: 'body', name: 'Outfit' }, { id: 'back', name: 'Back' }, { id: 'feet', name: 'Feet' },
  { id: 'tail', name: 'Tail' }, { id: 'trail', name: 'Trail' }, { id: 'aura', name: 'Aura' }, { id: 'emote', name: 'Emotes' },
];
(function buildCosmetics() {
  const items = [];
  const add = (slot, base, name, rar, data, src) => items.push({ id: slot + ':' + base + (data.v !== undefined ? '_' + data.v : ''), slot, base, name, rar, price: H.RAR_PRICE[rar], data, src: src || 'shop' });
  const variants = [
    { v: 0, label: 'Classic', rar: 0 }, { v: 1, label: 'Crimson', rar: 1, c: '#d8263a' }, { v: 2, label: 'Ocean', rar: 1, c: '#2a8ae8' },
    { v: 3, label: 'Neon', rar: 2, c: '#39ff8a', glow: 1 }, { v: 4, label: 'Golden', rar: 3, c: '#ffcc33', metal: 1 },
    { v: 5, label: 'Diamond', rar: 4, c: '#b8f4ff', metal: 1, glow: 1 }, { v: 6, label: 'Cosmic', rar: 5, c: '#8a4aff', glow: 1, galaxy: 1 },
  ];
  const accessory = (slot, list, maxVar) => list.forEach(([base, name, col, baseRar]) => {
    variants.slice(0, maxVar).forEach(va => {
      const rar = Math.min(5, va.rar + (baseRar || 0));
      add(slot, base, (va.v ? va.label + ' ' : '') + name, rar, { v: va.v, c: va.c || col, glow: va.glow, metal: va.metal, galaxy: va.galaxy });
    });
  });
  accessory('hat', [['cap', 'Baseball Cap', '#2a5ad8'], ['tophat', 'Top Hat', '#1a1a1a'], ['cowboy', 'Cowboy Hat', '#8a5a2a'], ['beanie', 'Beanie', '#d84a2a'],
    ['crown', 'Crown', '#ffcc33', 2], ['helmet', 'Bike Helmet', '#f2f2f2'], ['viking', 'Viking Helmet', '#9aa0a8', 1], ['party', 'Party Hat', '#ff4ab0'],
    ['chef', 'Chef Hat', '#ffffff'], ['wizard', 'Wizard Hat', '#3a2ab0', 1], ['halo', 'Halo', '#fff27a', 2], ['propeller', 'Propeller Cap', '#ffd21a'],
    ['pirate', 'Pirate Hat', '#1a1a1a', 1], ['sombrero', 'Sombrero', '#e8c06a'], ['bunny', 'Bunny Ears', '#ffffff'], ['antlers', 'Antlers', '#8a6a4a'],
    ['cone', 'Traffic Cone', '#ff6a1a'], ['flowers', 'Flower Crown', '#ff8ad8'], ['devil', 'Devil Horns', '#d8261c', 1], ['astro', 'Space Helmet', '#e8eef5', 2]], 7);
  accessory('face', [['shades', 'Sunglasses', '#111111'], ['round', 'Round Glasses', '#5a3a1a'], ['monocle', 'Monocle', '#ffcc33'], ['goggles', 'Ski Goggles', '#2ad2ff'],
    ['hero', 'Hero Mask', '#d8263a'], ['ninja', 'Ninja Mask', '#1a1a1a'], ['clown', 'Clown Nose', '#ff2a2a'], ['stache', 'Mustache', '#2a1a10'],
    ['patch', 'Eye Patch', '#111111'], ['visor', 'VR Visor', '#3a3a4a', 1], ['phones', 'Headphones', '#2a2a2a'], ['heartglasses', 'Heart Glasses', '#ff4a8a']], 7);
  accessory('neck', [['collar', 'Collar', '#d8263a'], ['bowtie', 'Bow Tie', '#1a1a1a'], ['scarf', 'Scarf', '#2a8a4a'], ['chain', 'Bling Chain', '#ffcc33', 1],
    ['bell', 'Cow Bell', '#d8b23a'], ['lei', 'Flower Lei', '#ff8ad8'], ['tie', 'Necktie', '#2a4ad8'], ['medal', 'Gold Medal', '#ffcc33', 1], ['bandana', 'Bandana', '#d8263a']], 7);
  accessory('back', [['backpack', 'Backpack', '#e8842a'], ['angel', 'Angel Wings', '#ffffff', 2], ['bat', 'Bat Wings', '#2a1a2a', 1], ['cape', 'Cape', '#d8263a'],
    ['jetpack', 'Jetpack', '#9aa0a8', 2], ['guitar', 'Guitar', '#a85a2a'], ['shell', 'Turtle Shell', '#4a8a3a'], ['rocket', 'Firework Rocket', '#e8442a', 1],
    ['butterfly', 'Butterfly Wings', '#ff8ad8', 1], ['balloon', 'Balloon', '#ff2a4a']], 7);
  accessory('body', [['tshirt', 'T-Shirt', '#2a8ae8'], ['jacket', 'Leather Jacket', '#2a2020'], ['hoodie', 'Hoodie', '#7a7a8a'], ['tux', 'Tuxedo', '#111111', 1],
    ['armor', 'Knight Armor', '#9aa0a8', 2], ['spacesuit', 'Space Suit', '#f2f2f2', 2], ['hawaii', 'Hawaiian Shirt', '#ff8a3a'], ['sweater', 'Ugly Sweater', '#2a8a4a'],
    ['super', 'Super Suit', '#2a4ad8', 1], ['robe', 'Wizard Robe', '#4a2ab0', 1], ['vest', 'Life Vest', '#ff7a1a'], ['overalls', 'Farmer Overalls', '#3a5aa8']], 7);
  accessory('feet', [['sneakers', 'Sneakers', '#f2f2f2'], ['boots', 'Cowboy Boots', '#7a4a2a'], ['skates', 'Roller Skates', '#ff4ab0', 1], ['flippers', 'Flippers', '#1ad2c8'],
    ['socks', 'Striped Socks', '#d8263a'], ['hooves', 'Platform Shoes', '#ffcc33', 1]], 7);
  accessory('tail', [['bow', 'Tail Bow', '#ff4ab0'], ['ribbon', 'Ribbon', '#2a8ae8'], ['tbell', 'Tail Bell', '#d8b23a'], ['pompom', 'Pom-Pom', '#ffffff'],
    ['flame', 'Flame Tip', '#ff6a1a', 2], ['bolt', 'Lightning Tip', '#ffe21a', 2]], 7);
  // Fur colours: 32 swatches
  const furs = [['Snow', '#f6f3ec', 0], ['Cream', '#efe0c0', 0], ['Sand', '#d8b880', 0], ['Caramel', '#c08040', 0], ['Chocolate', '#5a3420', 0], ['Charcoal', '#3a3a40', 0], ['Ash', '#9aa0a6', 0], ['Midnight', '#16161c', 1],
    ['Ginger', '#e0782a', 1], ['Rose', '#f2a0b4', 1], ['Mint', '#9ae8c0', 1], ['Sky', '#9ad0f2', 1], ['Lemon', '#f8e26a', 1], ['Lavender', '#c0a0f0', 1], ['Moss', '#6a8a3a', 1], ['Rust', '#a8442a', 1],
    ['Cherry', '#e01a3a', 2], ['Cobalt', '#1a4ae0', 2], ['Emerald', '#0aa860', 2], ['Tangerine', '#ff8a00', 2], ['Grape', '#7a2ac0', 2], ['Bubblegum', '#ff6ad0', 2], ['Teal', '#00a8a8', 2], ['Slate', '#4a5a7a', 2],
    ['Toxic Green', '#7aff1a', 3], ['Hot Magenta', '#ff1ab0', 3], ['Electric Blue', '#1ad0ff', 3], ['Blood Moon', '#8a0010', 3], ['Pure Gold', '#ffcc33', 4], ['Silver Chrome', '#e8eef5', 4], ['Obsidian', '#0a0a10', 4], ['Prismatic', '#ffffff', 5]];
  furs.forEach(([n, c, r]) => add('fur', n.toLowerCase().replace(/ /g, ''), n, r, { c, metal: r >= 4 && n !== 'Obsidian', prism: n === 'Prismatic' }));
  const patterns = [['none', 'Plain', 0], ['spots', 'Spots', 0], ['stripes', 'Stripes', 1], ['patches', 'Patches', 1], ['zebra', 'Zebra', 2], ['tiger', 'Tiger', 2], ['leopard', 'Leopard', 2], ['checker', 'Checkerboard', 2],
    ['camo', 'Camo', 3], ['hearts', 'Hearts', 3], ['stars', 'Stars', 3], ['flames', 'Flames', 4], ['circuit', 'Circuit Board', 4], ['rainbow', 'Rainbow', 4], ['galaxy', 'Galaxy', 5], ['lava', 'Lava', 5], ['ice', 'Ice Crystal', 4], ['pixel', 'Pixel Glitch', 5]];
  patterns.forEach(([b, n, r]) => add('pattern', b, n, r, {}));
  const eyes = [['normal', 'Normal', 0, '#111'], ['blue', 'Blue', 0, '#2a6ae8'], ['green', 'Green', 0, '#2aa84a'], ['amber', 'Amber', 1, '#e0a01a'], ['googly', 'Googly Eyes', 1, '#111'], ['sleepy', 'Sleepy', 1, '#111'],
    ['hearts', 'Heart Eyes', 2, '#ff2a6a'], ['stars', 'Star Eyes', 2, '#ffd21a'], ['red', 'Glowing Red', 3, '#ff1a1a'], ['cyan', 'Glowing Cyan', 3, '#1affff'], ['void', 'Void Eyes', 4, '#000000'], ['laser', 'Laser Eyes', 5, '#ff2a2a']];
  eyes.forEach(([b, n, r, c]) => add('eyes', b, n, r, { c, glow: r >= 3 }));
  const trails = [['sparkle', 'Sparkles', 1, '#fff6a0'], ['bubbles', 'Bubbles', 1, '#a0e8ff'], ['leaves', 'Leaves', 1, '#5ab03a'], ['hearts', 'Hearts', 2, '#ff4a8a'], ['snow', 'Snowflakes', 2, '#ffffff'],
    ['money', 'Money Rain', 3, '#4ad04a'], ['fire', 'Fire Trail', 3, '#ff7a1a'], ['lightning', 'Lightning', 4, '#ffe21a'], ['ghost', 'Ghost Trail', 4, '#d0d0ff'], ['rainbow', 'Rainbow Trail', 5, '#ff4a4a'], ['stardust', 'Stardust', 5, '#b98cff']];
  trails.forEach(([b, n, r, c]) => add('trail', b, n, r, { c }));
  const auras = [['warm', 'Warm Glow', 2, '#ffb84a'], ['cool', 'Cool Glow', 2, '#4ab8ff'], ['toxic', 'Toxic Glow', 3, '#7aff1a'], ['royal', 'Royal Glow', 3, '#b84aff'], ['angel', 'Holy Light', 4, '#fff6c0'], ['shadow', 'Shadow Smoke', 4, '#2a1a3a'], ['inferno', 'Inferno', 5, '#ff3a1a'], ['aurora', 'Aurora', 5, '#4affc8']];
  auras.forEach(([b, n, r, c]) => add('aura', b, n, r, { c }));
  const emotes = [['spin', 'Spin', 0], ['wiggle', 'Wiggle Dance', 0], ['sit', 'Sit', 0], ['playdead', 'Play Dead', 1], ['flip', 'Front Flip', 1], ['backflip', 'Backflip', 2], ['headbang', 'Headbang', 1], ['moonwalk', 'Moonwalk', 2],
    ['breakdance', 'Breakdance', 3], ['salute', 'Salute', 1], ['wave', 'Wave', 0], ['cheer', 'Cheer', 1], ['worm', 'The Worm', 3], ['twirl', 'Ballerina Twirl', 2], ['tornado', 'Tornado', 4], ['levitate', 'Levitate', 5], ['victory', 'Victory Pose', 2], ['bow', 'Take a Bow', 1]];
  emotes.forEach(([b, n, r]) => add('emote', b, n, r, {}));
  // Secret and source-locked items
  const special = [
    ['hat', 'goldhorns', 'Golden Statue Crown', 6, { c: '#ffcc33', metal: 1, glow: 1 }, 'statues6'],
    ['back', 'ufo', 'Mini UFO Buddy', 6, { c: '#c8d0dc', glow: 1 }, 'ufo'],
    ['hat', 'labhelmet', 'Hazmat Hood', 6, { c: '#f2e21a' }, 'lab'],
    ['body', 'pirate', 'Pirate Captain Coat', 6, { c: '#5a1a1a' }, 'shipwreck'],
    ['face', 'mossmask', 'Mossback Mask', 6, { c: '#3f4a2a' }, 'mossback'],
    ['trail', 'footprints', 'Giant Footprints', 6, { c: '#3a2a1a' }, 'mossback'],
    ['aura', 'cosmic', 'Event Horizon', 6, { c: '#000000' }, 'statues12'],
    ['hat', 'duckhat', 'Rubber Duck Hat', 6, { c: '#ffd21a' }, 'ducks'],
    ['pattern', 'gnome', 'Gnome Camo', 6, {}, 'gnomes'],
    ['emote', 'summit', 'Summit Yodel', 6, {}, 'summit'],
    ['back', 'egg', 'Dino Egg Backpack', 6, { c: '#f0e0c0' }, 'cave'],
    ['fur', 'templegold', 'Temple Gold', 6, { c: '#ffd76a', metal: 1, glow: 1 }, 'temple'],
    ['neck', 'keycard', 'Lab Keycard Lanyard', 6, { c: '#2affd0' }, 'lab'],
    ['hat', 'lighthouse', 'Lighthouse Lamp', 6, { c: '#fff27a', glow: 1 }, 'lighthouse'],
    ['trail', 'meteor', 'Meteor Shower', 6, { c: '#ff8a3a' }, 'event'],
    // Mission/achievement exclusives (Epic–Mythical, not in shop)
    ['hat', 'racehelmet', 'Champion Race Helmet', 4, { c: '#e8442a', metal: 1 }, 'missions'],
    ['body', 'jersey', 'Kickabout Jersey', 3, { c: '#1ab06a' }, 'missions'],
    ['back', 'trophy', 'Trophy Backpack', 4, { c: '#ffcc33', metal: 1 }, 'missions'],
    ['face', 'chefstache', 'Chef Mustache', 3, { c: '#ffffff' }, 'missions'],
    ['hat', 'fishhat', 'Angler Bucket Hat', 3, { c: '#6a8a5a' }, 'missions'],
    ['feet', 'golden', 'Golden Hooves', 5, { c: '#ffcc33', metal: 1, glow: 1 }, 'achievements'],
    ['aura', 'chaos', 'Chaos Aura', 5, { c: '#ff2a6a' }, 'achievements'],
    ['back', 'wingsdemon', 'Demon Wings', 5, { c: '#8a0010', glow: 1 }, 'chests'],
    ['hat', 'crownmythic', 'Mythic Crown', 5, { c: '#ff5592', metal: 1, glow: 1 }, 'chests'],
  ];
  special.forEach(([slot, base, name, rar, data, src]) => items.push({ id: slot + ':' + base, slot, base, name, rar, price: 0, data, src }));
  H.COSMETICS = items; H.COSMETIC = {}; items.forEach(i => (H.COSMETIC[i.id] = i));
})();

// ---------------- FURNITURE ----------------
// parts: [geo, sx, sy, sz, x, y, z, color]
H.FURNITURE = [
  ['sofa', 'Comfy Sofa', 600, [['box', 3, 0.6, 1.2, 0, 0.3, 0, '#c84a3a'], ['box', 3, 0.9, 0.3, 0, 0.75, -0.45, '#a83a2a'], ['box', 0.3, 0.8, 1.2, -1.35, 0.6, 0, '#a83a2a'], ['box', 0.3, 0.8, 1.2, 1.35, 0.6, 0, '#a83a2a']]],
  ['bed', 'Double Bed', 900, [['box', 2.4, 0.6, 3, 0, 0.3, 0, '#8a6a4a'], ['box', 2.2, 0.25, 2.6, 0, 0.7, 0.1, '#f2f2f2'], ['box', 2.4, 1.2, 0.2, 0, 0.6, -1.4, '#6a4a2a'], ['box', 0.8, 0.2, 0.5, -0.5, 0.9, -1, '#ffffff'], ['box', 0.8, 0.2, 0.5, 0.5, 0.9, -1, '#ffffff']]],
  ['tv', 'Giant TV', 1200, [['box', 2.6, 1.5, 0.12, 0, 1.4, 0, '#111111'], ['box', 2.4, 1.3, 0.02, 0, 1.4, 0.07, '#2a6ae8'], ['box', 1.6, 0.6, 0.6, 0, 0.3, 0, '#5a3a2a']]],
  ['lamp', 'Floor Lamp', 200, [['cyl', 0.08, 1.8, 0.08, 0, 0.9, 0, '#2a2a2a'], ['cone', 0.7, 0.5, 0.7, 0, 1.9, 0, '#ffe8a0']]],
  ['plant', 'Potted Plant', 150, [['cyl', 0.5, 0.6, 0.5, 0, 0.3, 0, '#c86a3a'], ['lowSphere', 1.0, 1.2, 1.0, 0, 1.1, 0, '#3a8a3a']]],
  ['rug', 'Round Rug', 180, [['cyl', 3, 0.04, 3, 0, 0.02, 0, '#d8a83a']]],
  ['table', 'Dining Table', 450, [['box', 2.4, 0.12, 1.4, 0, 0.9, 0, '#8a5a2a'], ['box', 0.12, 0.9, 0.12, -1, 0.45, -0.55, '#6a4a2a'], ['box', 0.12, 0.9, 0.12, 1, 0.45, -0.55, '#6a4a2a'], ['box', 0.12, 0.9, 0.12, -1, 0.45, 0.55, '#6a4a2a'], ['box', 0.12, 0.9, 0.12, 1, 0.45, 0.55, '#6a4a2a']]],
  ['chair', 'Chair', 120, [['box', 0.6, 0.1, 0.6, 0, 0.5, 0, '#8a5a2a'], ['box', 0.6, 0.7, 0.1, 0, 0.85, -0.25, '#8a5a2a'], ['box', 0.08, 0.5, 0.08, -0.25, 0.25, 0.25, '#6a4a2a'], ['box', 0.08, 0.5, 0.08, 0.25, 0.25, 0.25, '#6a4a2a'], ['box', 0.08, 0.5, 0.08, -0.25, 0.25, -0.25, '#6a4a2a'], ['box', 0.08, 0.5, 0.08, 0.25, 0.25, -0.25, '#6a4a2a']]],
  ['fridge', 'Fridge', 700, [['box', 1, 2.1, 0.9, 0, 1.05, 0, '#e8eef2'], ['box', 0.06, 0.6, 0.06, 0.35, 1.4, 0.47, '#9aa0a8']]],
  ['arcade', 'Arcade Machine', 2500, [['box', 1, 2, 0.9, 0, 1, 0, '#2a1a5a'], ['box', 0.8, 0.6, 0.05, 0, 1.4, 0.45, '#2affd0'], ['box', 0.9, 0.1, 0.4, 0, 0.95, 0.5, '#ff2a6a']]],
  ['jukebox', 'Jukebox', 1800, [['box', 1.2, 1.6, 0.8, 0, 0.8, 0, '#a8262a'], ['sphere', 1.2, 0.8, 0.8, 0, 1.6, 0, '#ffd21a']]],
  ['aquarium', 'Aquarium', 2200, [['box', 2.2, 1.2, 0.8, 0, 1.4, 0, '#6ad0ff'], ['box', 2.3, 0.8, 0.9, 0, 0.4, 0, '#2a2a2a']]],
  ['hay', 'Hay Bed', 80, [['box', 1.8, 0.8, 1.2, 0, 0.4, 0, '#e8c45a']]],
  ['trophy', 'Trophy Case', 3000, [['box', 1.8, 2.2, 0.6, 0, 1.1, 0, '#6a4a2a'], ['box', 1.6, 2.0, 0.05, 0, 1.1, 0.3, '#c8e8ff'], ['cone', 0.3, 0.5, 0.3, 0, 1.4, 0, '#ffcc33']]],
  ['piano', 'Grand Piano', 6000, [['box', 1.8, 0.5, 2.2, 0, 1.0, 0, '#111111'], ['box', 1.6, 0.06, 0.3, 0, 0.9, 1.2, '#ffffff'], ['cyl', 0.12, 0.8, 0.12, -0.7, 0.4, -0.8, '#111111'], ['cyl', 0.12, 0.8, 0.12, 0.7, 0.4, -0.8, '#111111'], ['cyl', 0.12, 0.8, 0.12, 0, 0.4, 0.9, '#111111']]],
  ['bathtub', 'Clawfoot Tub', 1500, [['box', 1.2, 0.8, 2.2, 0, 0.5, 0, '#f2f2f2'], ['box', 1.0, 0.1, 2.0, 0, 0.85, 0, '#8ad0ff']]],
  ['disco', 'Disco Ball', 2000, [['sphere', 1, 1, 1, 0, 3.2, 0, '#e0e8f0'], ['cyl', 0.03, 1, 0.03, 0, 4.1, 0, '#cccccc']]],
  ['hottub', 'Hot Tub', 8000, [['cyl', 3, 0.9, 3, 0, 0.45, 0, '#8a5a3a'], ['cyl', 2.6, 0.1, 2.6, 0, 0.85, 0, '#5ad8ff']]],
  ['statue', 'Goat Statue', 4000, [['box', 1, 1, 1, 0, 0.5, 0, '#cfcfcf'], ['box', 0.6, 0.6, 1.0, 0, 1.3, 0, '#e8e8e8'], ['cone', 0.2, 0.5, 0.2, 0, 1.9, 0.2, '#e8e8e8']]],
  ['rocketmodel', 'Rocket Model', 5000, [['cyl', 0.6, 3, 0.6, 0, 1.8, 0, '#f2f2f2'], ['cone', 0.6, 1, 0.6, 0, 3.8, 0, '#d8263a'], ['box', 1.4, 0.8, 0.1, 0, 0.6, 0, '#d8263a']]],
  ['bookshelf', 'Bookshelf', 500, [['box', 1.6, 2.2, 0.5, 0, 1.1, 0, '#7a5030'], ['box', 1.4, 0.4, 0.4, 0, 0.6, 0.02, '#3a6ab0'], ['box', 1.4, 0.4, 0.4, 0, 1.2, 0.02, '#b03a3a'], ['box', 1.4, 0.4, 0.4, 0, 1.8, 0.02, '#3ab05a']]],
  ['desk', 'Gaming Desk', 900, [['box', 2, 0.1, 1, 0, 0.9, 0, '#2a2a30'], ['box', 0.1, 0.9, 0.9, -0.9, 0.45, 0, '#2a2a30'], ['box', 0.1, 0.9, 0.9, 0.9, 0.45, 0, '#2a2a30'], ['box', 1.2, 0.7, 0.05, 0, 1.4, -0.3, '#1ad2ff']]],
  ['fireplace', 'Fireplace', 3500, [['box', 2.4, 2, 0.8, 0, 1, 0, '#8a6a5a'], ['box', 1.4, 1, 0.3, 0, 0.6, 0.3, '#ff7a1a']]],
  ['beanbag', 'Bean Bag', 250, [['lowSphere', 1.4, 0.8, 1.4, 0, 0.4, 0, '#ff8a1a']]],
  ['palm', 'Indoor Palm', 400, [['cyl', 0.15, 2.2, 0.15, 0, 1.1, 0, '#8a6a3a'], ['cone', 2, 0.6, 2, 0, 2.3, 0, '#3aa04a']]],
  ['pooltable', 'Pool Table', 4500, [['box', 2.6, 0.2, 1.5, 0, 0.9, 0, '#1a7a3a'], ['box', 2.4, 0.8, 1.3, 0, 0.4, 0, '#5a3a1a']]],
  ['throne', 'Throne', 12000, [['box', 1.4, 0.6, 1.2, 0, 0.3, 0, '#d8263a'], ['box', 1.4, 2.6, 0.3, 0, 1.3, -0.5, '#ffcc33'], ['box', 0.3, 1, 1.2, -0.6, 0.6, 0, '#ffcc33'], ['box', 0.3, 1, 1.2, 0.6, 0.6, 0, '#ffcc33']]],
  ['trampoline', 'Trampoline', 1500, [['cyl', 3.5, 0.15, 3.5, 0, 0.9, 0, '#1a1a2a'], ['cyl', 0.1, 0.9, 0.1, 1.5, 0.45, 0, '#9aa0a8'], ['cyl', 0.1, 0.9, 0.1, -1.5, 0.45, 0, '#9aa0a8']], { bouncy: 1 }],
  ['neon', 'Neon Sign', 1100, [['box', 2, 0.8, 0.1, 0, 2.2, 0, '#ff2ad8']], { glow: 1 }],
  ['grill', 'BBQ Grill', 700, [['sphere', 1, 0.6, 1, 0, 1, 0, '#1a1a1a'], ['cyl', 0.06, 0.9, 0.06, 0, 0.45, 0, '#5a5a5a']]],
  ['lavalamp', 'Lava Lamp', 350, [['cyl', 0.3, 0.9, 0.3, 0, 0.45, 0, '#ff4ab0']], { glow: 1 }],
  ['robotbutler', 'Robot Butler', 15000, [['box', 0.8, 1.2, 0.6, 0, 1.0, 0, '#b8c4cc'], ['sphere', 0.6, 0.6, 0.6, 0, 1.9, 0, '#b8c4cc'], ['box', 0.4, 0.1, 0.05, 0, 1.95, 0.3, '#2affd0']]],
  ['hamsterwheel', 'Giant Hamster Wheel', 5500, [['torus', 3, 3, 1.5, 0, 1.6, 0, '#ff8a1a']]],
  ['mirror', 'Wardrobe Mirror', 800, [['box', 1.2, 2.2, 0.1, 0, 1.1, 0, '#c8e0f0']], { wardrobe: 1 }],
  ['garagelift', 'Car Lift', 9000, [['box', 3, 0.2, 5, 0, 0.6, 0, '#e8b81a'], ['box', 0.3, 1.2, 0.3, -1.5, 0.6, -2, '#5a5a5a'], ['box', 0.3, 1.2, 0.3, 1.5, 0.6, 2, '#5a5a5a']]],
  ['ballpit', 'Ball Pit', 3000, [['box', 3, 0.6, 3, 0, 0.3, 0, '#2a8ae8'], ['lowSphere', 2.6, 0.5, 2.6, 0, 0.6, 0, '#ff4a8a']]],
  ['clock', 'Grandfather Clock', 1600, [['box', 0.8, 2.6, 0.5, 0, 1.3, 0, '#5a3a1a'], ['cyl', 0.6, 0.05, 0.6, 0, 2.2, 0.26, '#f2f2e0', Math.PI / 2]]],
  ['sciencelab', 'Mad Science Kit', 7000, [['box', 2, 1, 1, 0, 0.5, 0, '#f2f2f2'], ['cyl', 0.3, 0.8, 0.3, -0.5, 1.4, 0, '#7aff1a'], ['cyl', 0.3, 0.6, 0.3, 0.5, 1.3, 0, '#ff2ad8']], { glow: 1 }],
  ['snowglobe', 'Giant Snow Globe', 2600, [['box', 1.2, 0.4, 1.2, 0, 0.2, 0, '#7a4a2a'], ['sphere', 1.4, 1.4, 1.4, 0, 1.1, 0, '#d8f0ff']]],
  ['goldbar', 'Pile of Gold', 25000, [['box', 1.6, 0.4, 0.8, 0, 0.2, 0, '#ffcc33'], ['box', 1.2, 0.4, 0.6, 0, 0.6, 0, '#ffcc33'], ['box', 0.6, 0.4, 0.4, 0, 1.0, 0, '#ffcc33']], { glow: 1 }],
].map(([id, name, price, parts, flags]) => ({ id, name, price, parts, flags: flags || {} }));
H.FURN = {}; H.FURNITURE.forEach(f => (H.FURN[f.id] = f));

// ---------------- PROPERTIES ----------------
// style drives the exterior model; room = interior size; garage = vehicle slots; slots = furniture cap
H.PROPERTIES = [
  { id: 'apt', name: 'Tiny City Apartment', price: 5000, x: 105, z: 175, style: 'apartment', room: [14, 12], slots: 10, garage: 1, desc: 'Cozy. Smells like noodles.' },
  { id: 'burb1', name: 'Maple Loop Starter Home', price: 12000, x: -470, z: 0, style: 'house', col: '#d8c08a', room: [20, 16], slots: 18, garage: 2, desc: 'White picket fence, beige ambitions.' },
  { id: 'burb2', name: 'Maple Loop Family House', price: 22000, x: -560, z: 120, style: 'house', col: '#8ab0d8', room: [24, 18], slots: 24, garage: 2, desc: 'Big yard. Bigger lawn-mowing obligations.' },
  { id: 'beachhut', name: 'Beach Hut', price: 9000, x: -420, z: 1060, style: 'hut', room: [14, 14], slots: 12, garage: 1, desc: 'Sand everywhere. Literally everywhere.' },
  { id: 'farmhouse', name: 'Clover Patch Farmhouse', price: 28000, x: -980, z: 430, style: 'farmhouse', room: [26, 20], slots: 26, garage: 3, desc: 'Comes with a barn and a suspicious rooster.' },
  { id: 'cabin', name: 'Whispering Pines Cabin', price: 18000, x: -860, z: -560, style: 'cabin', room: [18, 16], slots: 18, garage: 1, desc: 'Fireplace, pine smell, possible cryptid neighbors.' },
  { id: 'treehouse', name: 'Jungle Treehouse', price: 35000, x: 900, z: -780, style: 'treehouse', room: [18, 18], slots: 20, garage: 0, desc: 'Ten metres up. Vines included.' },
  { id: 'lighthouse', name: 'Lighthouse', price: 40000, x: -1250, z: 1060, style: 'lighthouse', room: [16, 16], slots: 18, garage: 1, desc: 'The best views and the worst stairs.' },
  { id: 'penthouse', name: 'Skyline Penthouse', price: 90000, x: -105, z: -105, style: 'penthouse', room: [30, 24], slots: 36, garage: 4, desc: 'Top of the tallest tower in Bleatsburg.' },
  { id: 'garage', name: 'Mega Garage', price: 30000, x: 380, z: -250, style: 'garage', room: [36, 24], slots: 12, garage: 10, desc: 'Stores ten vehicles. Smells like gasoline and dreams.' },
  { id: 'mansion1', name: 'Gilded Hill Mansion', price: 150000, x: -690, z: -330, style: 'mansion', col: '#f2ead8', room: [40, 30], slots: 50, garage: 6, desc: 'Columns. Fountain. A butler who quit.' },
  { id: 'mansion2', name: 'Cliffside Mega Mansion', price: 300000, x: -600, z: -430, style: 'mansion', col: '#e0e8f0', room: [48, 36], slots: 70, garage: 8, desc: 'Infinity pool overlooking the whole map.' },
  { id: 'bunker', name: 'Desert Secret Bunker', price: 200000, x: 1260, z: 760, style: 'bunker', room: [36, 28], slots: 40, garage: 6, desc: 'Underground. Off the grid. Very evil-lair.' },
  { id: 'island', name: 'Private Island Villa', price: 500000, x: 650, z: 1420, style: 'villa', col: '#fff4e0', room: [40, 30], slots: 60, garage: 4, desc: 'Your own island. Boat or chopper required.' },
];
H.PROP = {}; H.PROPERTIES.forEach(p => (H.PROP[p.id] = p));

// ---------------- SHOPS (physical locations) ----------------
H.SHOPS = [
  { id: 'clothes', name: 'Fluff & Stuff Boutique', kind: 'cosmetics', x: 35, z: -105 },
  { id: 'clothes2', name: 'Megamall Fashion', kind: 'cosmetics', x: 370, z: 336, inMall: 1 },
  { id: 'pets', name: 'Critter Adoption Center', kind: 'animals', x: -105, z: 35 },
  { id: 'dealer', name: 'Vroom Motors Dealership', kind: 'vehicles', x: 175, z: 35 },
  { id: 'boats', name: 'Salty Dog Marina', kind: 'vehicles', x: 330, z: 1110 },
  { id: 'hangar', name: 'Gust Air Sales', kind: 'vehicles', x: 880, z: 60 },
  { id: 'furniture', name: 'Nest & Rest Furniture', kind: 'furniture', x: 430, z: 336, inMall: 1 },
  { id: 'realty', name: 'Open Door Realty', kind: 'properties', x: -35, z: 175 },
  { id: 'mods', name: 'Torque Bros Mod Shop', kind: 'garage', x: 490, z: -260 },
  { id: 'fishmarket', name: 'Fish Market', kind: 'fish', x: 170, z: 1090 },
  { id: 'farmstand', name: 'Farm Stand', kind: 'cosmetics', x: -860, z: 600 },
];

// ---------------- FISH ----------------
H.FISH = [
  ['Minnow', 0, 10], ['Sunfish', 0, 15], ['Perch', 0, 20], ['Trout', 1, 35], ['Bass', 1, 45], ['Catfish', 1, 55], ['Carp', 1, 40], ['Pike', 2, 90],
  ['Salmon', 2, 110], ['Clownfish', 2, 120], ['Pufferfish', 3, 220], ['Swordfish', 3, 300], ['Tuna', 3, 260], ['Octopus', 3, 340], ['Anglerfish', 4, 650],
  ['Golden Koi', 4, 900], ['Old Boot', 0, 1], ['Message in a Bottle', 4, 500], ['Ghost Shrimp', 5, 1800], ['Ancient Coelacanth', 5, 3000],
].map(([name, rar, val]) => ({ name, rar, val }));

// ---------------- ACHIEVEMENTS ----------------
H.ACHIEVEMENTS = [
  ['butt10', 'Bonk!', 'Headbutt 10 things', 'headbutts', 10, 200], ['butt200', 'Professional Bonker', 'Headbutt 200 things', 'headbutts', 200, 1500],
  ['butt1000', 'Headbutt Hall of Fame', 'Headbutt 1,000 things', 'headbutts', 1000, 6000, 'feet:golden'],
  ['rag10', 'Floppy', 'Ragdoll 10 people', 'npcHits', 10, 300], ['rag100', 'Bowling for Humans', 'Ragdoll 100 people', 'npcHits', 100, 2500],
  ['break50', 'Clumsy', 'Break 50 objects', 'breaks', 50, 500], ['break500', 'Agent of Chaos', 'Break 500 objects', 'breaks', 500, 5000, 'aura:chaos'],
  ['boom10', 'Kaboom', 'Blow up 10 explosive barrels', 'explosions', 10, 800],
  ['drive5', 'Road Trip', 'Drive 5 km', 'driveKm', 5, 500], ['drive50', 'Long Haul', 'Drive 50 km', 'driveKm', 50, 4000],
  ['fly2', 'Frequent Flyer', 'Fly 2 km as an animal or aircraft', 'flyKm', 2, 800], ['swim1', 'Splash Zone', 'Swim 1 km', 'swimKm', 1, 500],
  ['air10', 'Hang Time', 'Spend 10 s airborne in one jump', 'bestAir', 10, 1200], ['flip5', 'Flippin\' Out', 'Do 5 vehicle flips', 'flips', 5, 1000],
  ['m10', 'Getting Started', 'Complete 10 missions', 'missions', 10, 1000], ['m50', 'Busy Goat', 'Complete 50 missions', 'missions', 50, 6000],
  ['m150', 'Legend of Bleatsburg', 'Complete 150 missions', 'missions', 150, 25000],
  ['a5', 'Zookeeper', 'Own 5 animals', 'animals', 5, 1500], ['a15', 'Menagerie', 'Own 15 animals', 'animals', 15, 8000], ['a30', 'Noah', 'Own 30 animals', 'animals', 30, 30000],
  ['v3', 'Car Collector', 'Own 3 vehicles', 'vehicles', 3, 1000], ['v10', 'Fleet Owner', 'Own 10 vehicles', 'vehicles', 10, 8000],
  ['p1', 'Home Owner', 'Buy a property', 'properties', 1, 1000], ['p5', 'Real Estate Mogul', 'Own 5 properties', 'properties', 5, 15000],
  ['c25', 'Fashionista', 'Own 25 cosmetics', 'cosmetics', 25, 1500], ['c100', 'Wardrobe Overflow', 'Own 100 cosmetics', 'cosmetics', 100, 10000],
  ['duck20', 'Duck Hunter', 'Find 20 rubber ducks', 'ducks', 20, 2000], ['gnome10', 'Gnome Finder', 'Find 10 gnomes', 'gnomes', 10, 2000],
  ['chest20', 'Treasure Hunter', 'Open 20 treasure chests', 'chests', 20, 3000], ['fish10', 'Angler', 'Catch 10 fish', 'fishCaught', 10, 800],
  ['fishall', 'Master Angler', 'Discover all fish species', 'fishSpecies', 20, 10000], ['secret5', 'Snoop', 'Discover 5 secret places', 'secrets', 5, 3000],
  ['rich', 'Moneybags', 'Hold 100,000 coins at once', 'coinsPeak', 100000, 5000], ['lick50', 'Tongue Twister', 'Grab 50 things with your tongue', 'grabs', 50, 800],
  ['roar25', 'Loud Neighbor', 'Use special abilities 25 times', 'specials', 25, 600], ['heat5', 'Most Wanted', 'Reach 5-star Animal Control heat', 'maxHeat', 5, 2000],
  ['emote20', 'Show-Off', 'Emote 20 times', 'emotes', 20, 400], ['night', 'Night Owl', 'Play through a full day-night cycle', 'days', 1, 500],
  ['summit', 'Peak Performer', 'Stand on top of Grumblepeak', 'summit', 1, 1500], ['event5', 'Weirdness Magnet', 'Witness 5 world events', 'events', 5, 2000],
].map(([id, name, desc, stat, goal, reward, item]) => ({ id, name, desc, stat, goal, reward, item }));

// ---------------- EVERYTHING IS FREE ----------------
// Every animal, vehicle, cosmetic, property and piece of furniture costs nothing (secret ones included).
H.FREE = true;
H.RAR_PRICE = H.RAR_PRICE.map(() => 0);
for (const a of H.ANIMALS) { a.price = 0; delete a.secret; }
for (const v of H.VEHICLES) { v.price = 0; delete v.secret; }
for (const c of H.COSMETICS) c.price = 0;
for (const f of H.FURNITURE) f.price = 0;
for (const p of H.PROPERTIES) p.price = 0;
