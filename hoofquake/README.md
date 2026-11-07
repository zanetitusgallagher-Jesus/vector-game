# Hoofquake

An original 3D open-world animal sandbox that runs in the browser (Three.js, no build step).

## Play online

**https://zanetitusgallagher-jesus.github.io/vector-game/hoofquake/**

Online play there is peer-to-peer, the same way the brawler works: everyone on the page meets through PeerJS's public broker, the first player in a room hosts it in their browser tab, and if the host leaves another player takes over. Add `#roomname` to the address for a private room. Players behind very strict networks (some corporate or mobile NATs) may fail to connect, since there's no relay server.

The game picks its connection automatically: its own server when served by `server/server.js`, the claude.ai live room when opened as a claude.ai artifact, otherwise peer-to-peer.

## Run it (with online multiplayer)

```bash
cd hoofquake/server
npm install
npm start
# open http://localhost:8080 — everyone who opens this address plays together
```

Add `#roomname` to the URL to play in a private room (for example `http://your-host:8080/#party`). The Multiplayer screen shows the invite link.

### Deploy the server

- **Render (free tier, WebSockets supported):** New → Blueprint → this repo, blueprint path `hoofquake/server/render.yaml`. You get a public `https://…onrender.com` link.
- **Docker anywhere:** from `hoofquake/`, `docker build -f server/Dockerfile -t hoofquake .` then `docker run -p 8080:8080 hoofquake`.
- **Any Node 18+ host:** run `node server/server.js` with `PORT` set. Put it behind HTTPS so browsers use `wss://`.

### Online play as a claude.ai artifact

When the game runs as a claude.ai artifact it uses the platform's live room instead of this server: signed-in people the owner shares the page with join the same world. Public-link visitors can't join that room.

Three.js loads from jsDelivr, with `vendor/three.min.js` (MIT, see `vendor/THREE-LICENSE`) as an offline fallback.

## Two worlds, everything free

- **Everything is free.** Every animal (secret ones included), vehicle, cosmetic, property, piece of furniture, gadget, upgrade and paint job costs nothing and is unlocked from the start. Coins still pay out, there's just nothing you need them for.
- **Scentline** is a second world in `scentline/`: a separate open-world animal game (dog, cat, goat, boar, gorilla, bear, crocodile, pitbull, eagle) with its own towns, cars, aircraft, guns, bases and banks. Get there from the main menu (**Travel to Scentline**) or the glowing portal in Bleatsburg's city plaza; its title and pause screens have a button back. In Scentline every animal, rare coat and weapon is unlocked and every shop item, vehicle, upgrade, base move, repair and galaxy trip is free. Scentline keeps its own save (on the device) and its own online play.

## What's in it

| Area | Contents |
| --- | --- |
| World | 3.2 km × 3.2 km map: Bleatsburg City, suburbs, a mansion plateau, mall, industrial yard, airport, theme park (rideable coaster and drop tower), sports complex, golf course, farm, village, lake, river with bridges, beach and pier, lighthouse, island, desert with stunt park, jungle temple, pine forest, mountains with an observatory, a floating Cloud Garden |
| Secrets | Hidden laboratory (keycard chain), Grumble Cave, sunken shipwreck, UFO crash site, the Mossback cryptid quest, a dino egg that hatches at night, 14 discoverable secret places |
| Animals | 41 playable animals (36 buyable, 5 secret), each with its own model, voice, stats, movement (fly, glide, climb, dive, double jump, dig) and special ability |
| Vehicles | 25 vehicles: cars, supercars, trucks, bus, fire truck, motorbike, bike, skateboard, go-kart, tractor, digger, monster truck, boats, jet ski, submarine, hovercraft, helicopter, planes, a secret saucer. Buy, summon, paint and upgrade (engine, handling, nitro) |
| Missions | 261 generated missions across 22 types (races on foot, road, water and air, deliveries, taxi, chaos, human bowling, scares, stunts, flips, football, basketball, 9-hole golf, bowling, fishing, sheep herding, harvest, cooking, treasure hunts, rooftop parkour, skate, obstacle course, star hunts, secret quests) plus three daily challenges |
| Cosmetics | 648 items in 13 slots (fur, patterns, eyes, hats, face, neck, outfits, back, feet, tail, trails, auras, emotes) across Common → Mythical and Secret rarities, with try-on preview and five saved outfits per animal |
| Properties | 14 properties from a tiny apartment to a private island, each with a decoratable interior, wardrobe, garage terminal and trophy shelf; 40 furniture items |
| Collectibles | 60 rubber ducks, 25 gnomes, 12 golden statues, 40 treasure chests, 20 fish species, 40 achievements |
| Living world | Pedestrians with day/night routines, farm animals and wildlife, road traffic, Animal Control heat, random world events (meteor shower, UFO abductions, fruit storm, stampede, coin rain, giant beach ball), dynamic weather and a 20-minute day/night cycle |
| Interact with everything | Gadgets (Paint Blaster, Hay Shotgun, Rocket Launcher, Gust Cannon, Snooze Dart) with camera aiming; shoot people, wildlife, traffic, parked cars and the planes and helicopters flying overhead. Vehicles take damage and explode; crash a plane and it blows up and throws you out. Ride sheep, cows, pigs, deer, camels, wild goats and bears (bears buck you off). Talk to anyone for gossip, tips or a job. Headbutt trees to drop apples. Bears and wild goats fight back |
| Multiplayer | Online (server, peer-to-peer, or claude.ai room): see other players' animals, outfits and vehicles live, headbutt them, chat (Enter/T), rooms with invite links, join a friend's mission, visit their open-house property. Local: two-player split-screen |
| Controls | Keyboard + mouse with rebindable keys, and a full touch layout (stick, look pad, action buttons) |

## Saving

When the game runs as a claude.ai artifact it saves to the player's private `db` record (server-side) automatically. Anywhere else, use **Settings → Save & load** to copy a save code or load one from a file. The game never uses browser storage.

## Code map

| File | Role |
| --- | --- |
| `js/util.js` | Noise, RNG, geometry merging, spatial hash |
| `js/data.js` | Animals, vehicles, cosmetics generator, furniture, properties, shops, fish, achievements |
| `js/world.js` | Terrain, roads and bridges, collision queries, sky, day/night, weather |
| `js/build.js` | Every region, landmark, interior, collectible and spawn list |
| `js/models.js` | Procedural animals (with cosmetics), humans, vehicles, collectibles |
| `js/physics.js` | Dynamic props, explosions, particles, floating text, chaos combos |
| `js/player.js` | Animal controller, abilities, ragdoll, emotes, camera |
| `js/npc.js` | Pedestrians, animals, traffic, Animal Control |
| `js/vehicles.js` | Driving, flying, boating, summoning |
| `js/state.js` | Economy, stats, achievements, collectibles, interactions, world events, saving |
| `js/missions.js` | Mission generation and runtime, fishing |
| `js/ui.js` | Menus, shops, customization, garage, map, HUD, touch controls |
| `js/mayhem.js` | Gadgets, vehicle damage, air traffic, riding, talking, tree shaking |
| `js/net.js` | Online multiplayer: server and claude.ai-room transports, remote players, chat, name tags |
| `js/main.js` | Boot, input, game loop, split-screen |
| `server/server.js` | Static host + WebSocket relay (rooms of up to 24, 20 Hz batched state, rate limits) |
