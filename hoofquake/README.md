# Scentline × Hoofquake

One open-world 3D animal game in the browser. **Scentline is the base game** (its world, engine, controls, police, guns, planets and online play), and **Hoofquake's animals, vehicles, city, collectibles and missions are built into it**. It is one world, one save and one set of menus. Everything is free.

**Play:** https://zanetitusgallagher-jesus.github.io/vector-game/hoofquake/

## What Hoofquake added to Scentline

- **35 more animals (44 in all).** Sheep, cow, pig, horse, zebra, unicorn, lion, tiger, wolf, fox, rabbit, hamster, chicken, owl, flamingo, penguin, land shark, elephant, rhino, giraffe, camel, kangaroo, panda, T-Rex, triceratops, baby raptor, pterodactyl, dragon, Robo-Goat 3000, Mecha Bear, Mutant Goat, Cosmic Goat, Lab Slime, The Mossback and deer.
  - They sit next to Scentline's dog, cat, goat, boar, gorilla, bear, crocodile, pit bull and eagle in the Animals tab (**Tab**).
  - Each new animal has its own attack, heavy move, sound and special. Hoofquake's specials came along too: fire breath, eye lasers, trunk blast, buck, rainbow blast, egg bomb, spit, shoulder rocket, teleport and black hole.
  - Flyers (dragon, owl, pterodactyl, Robo-Goat, Cosmic Goat, chicken, flamingo) fly the way Scentline's eagle does.
- **Bleatsburg**, Hoofquake's city, is a new district in the west of Scentline's map, on the highway between Ironworks and Dustwater. It has:
  - Goat Plaza with a giant golden goat, City Hall and the Moo-tel Tower.
  - Shops: the Critter Adoption Center (pick any animal), the Hoof Mall (guns, gear and vehicles) and Gnome Gnook (change your look).
  - The Hay Bale Diner, a football stadium, and apartment towers.
- **Hoofquake's vehicles** are in the dealership and parked around the world:
  - Cars: supercar, stretch limo, golf cart, turbo kart, ice cream van, monster truck.
  - Work and other vehicles: mega digger, pedal bike, jet ski, stunt plane and a secret saucer.
- **70 Hoofquake missions** across the whole map, marked by yellow beacons. Walk or drive into a beacon and press **T**.
  - Mission types: foot races, street races, air races through rings in the sky, deliveries, chaos sprees, scare fests, stunt jumps, hunts, stadium football, rooftop climbs, coin rushes and a rubber-duck hunt.
  - The new **Missions** tab lists them all and sets waypoints.
- **33 rubber ducks**, Hoofquake's collectible, are hidden all over Scentline's world.

The rest is Scentline as it was: hunting, the RPG stats, wanted levels and police, guns and gear, the raceway, Fort Grizzle, bank heists, secret bases, the starship and six planets, and peer-to-peer online play.

## Controls

**PC:**

| Key | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Q / left click | Attack |
| R / right click | Heavy |
| E | Special |
| F | Grab / throw |
| G | Sound |
| T | Use, enter a vehicle, start a mission |
| C | Dodge |
| Tab | Animals and menus |
| M | Map |

**Touch:** stick plus context buttons.

## Saving and accounts

Progress saves in the browser on this device, per local account. Choose "Play as guest" for a throwaway one.

## Files

| File | Role |
| --- | --- |
| `index.html` | The whole game. Scentline's engine first, then the "HOOFQUAKE, MERGED INTO SCENTLINE" script block at the end, which adds the animals, vehicles, Bleatsburg, ducks, missions and the Missions tab |
| `vendor/three.r128.min.js` | Offline fallback for Three.js r128 (MIT, see `vendor/THREE-LICENSE`) |
