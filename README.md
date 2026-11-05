# ZK POOL
AIM • STRIKE • CONQUER  
ZK LABS · by TechBaseML

## Play locally
Install Node.js 22 or newer. Extract the ZIP, open a terminal inside the zk-pool folder and run:

```sh
npm start
```

Open **http://localhost:4173** in the browser. The same process serves the clubhouse and the real multiplayer API. There are no package dependencies or API keys to install. On Android with a current Node installation in Termux, run the same command and open localhost in Chrome. On a trusted Wi-Fi network, another device can open the host computer's LAN address on port 4173. For PWA caching on a second device, use HTTPS.

Enter your name once. Play Now opens a rack against the computer. Point or touch the felt to aim, choose power, then press Strike. Use the arrow keys for fine aim and Space to strike when focus is outside a form control. For ball in hand select Place cue ball, then tap clear felt. After the break call a ball and a pocket. Spin control applies physical draw/follow and side English. Rules and practice instructions are also in the game.

## Play a real friend online
Player one opens Online Multiplayer, creates a room and copies the invitation. Player two opens it on the same reachable frontend and joins using the room code. Both press Ready. A remote friend needs a public HTTPS endpoint. Invitations copied from localhost only work in another browser on the same machine. The room remains inside ZK POOL. Refreshing the same tab reconnects with its temporary seat credential. The invite contains only the room code. A rematch requires both players. Reconnection is available while the server process and room are alive.

## Architecture and design
| System | Implementation |
| --- | --- |
| Interface | ES modules, semantic HTML, native dialogs, keyboard and touch input, Canvas 2D. The cockpit, navigation, preferences, online room and training lifecycle are wired in public/app.js. |
| Table | public/render.js draws cached high-DPI felt, cushions, six pockets, wood, rail sights, balls, rotation, projected contact point and cue. |
| Physics | public/physics.js integrates with a fixed 1/240-second step. Equal-mass ball impulses, sliding-to-rolling friction, rotation, side spin and damped cushion response feed a shot event log. |
| Rules | public/rules.js resolves the rack from the completed shot log. RULES.md records competitive rules and digital conventions. public/game.js validates commands and maintains turn, sequence and scoring. |
| AI | public/ai.js ranks ghost-ball and pocket paths, tries shots in cloned simulations and scores actual outcomes. Higher levels consider cue position, safety and next-shot availability. The offline browser uses a worker. |
| Multiplayer | server.js validates requests and runs the canonical resolver once. public/network.js opens an authenticated HTTP stream and reconnects. Both screens render snapshots; the browser never submits a result. |
| Profiles and history | public/storage.js stores the local profile, settings and completed racks. Player one owns shared-device statistics. Online result records come from server state. Local history is editable browser data. |
| Audio and training | public/sound.js synthesizes sounds. public/practice.js defines eight layouts/objectives and checks drill outcomes. |
| PWA | build.js generates a hash-versioned service worker and copies the release to dist. App icons and all offline game assets are local. The new cache activates after old controlled tabs close. |
| Data contracts | types/match.d.ts documents the shared engine and protocol structures for TypeScript consumers. |

The dashboard uses a navy background (#07111F), champagne-gold highlights (#F2CA85), green felt (#176B50) and dark walnut rails. Custom PWA icons and local billiards illustrations accompany the five game entry points. Settings control felt, cue, interface theme, assistance, spin, rendering resolution, animation, sensitivity, sound and volume.

## Test and package
```sh
npm test
npm run build
```

The source ZIP includes the generated service worker so npm start works immediately. Run the build command after editing frontend assets. The static output directory is dist. For a manual PWA check, load via localhost or HTTPS, allow the initial asset caching to finish, install from the browser, close and reopen offline, and play a local rack.

## Deployment after owner approval
**Single origin:** use a long-running Node 22+ service with HTTPS and streaming support. Use npm run build as the build step and npm start as the start command. Set PORT to the listener port supplied by the host. The browser selects the same origin for multiplayer by default. Reverse proxies must forward streaming responses without buffering. Keep a single process per deployment with this room store. Established rooms expire after ten disconnected minutes or two idle hours. Restarting the server clears its rooms. The code takes no payments, uses no metered AI and requires no paid dependency. Hosting quotas and uptime depend on the host.

**GitHub Pages frontend:** The published build lives in `docs/` on main. Run `npm run build && node pages.js` after frontend changes. Under Settings → Pages select main and /docs. The browser calls a separate HTTPS room service and stays on the GitHub Pages address for gameplay and invitations. The hosted API uses the same physics and rules with D1-backed rooms and seat authentication. The local development server uses its in-memory store.

**Release verification:** open the actual public address on a computer and phone, create a room, join via the invite on another network, compare a shot and its ruling, refresh mid-match, and finish or resign and rematch. Check installed offline play and restoration on the target devices.

## Verification record
31 automated tests passed with Node 24. They cover rack geometry, collisions, cushion English, draw, settling, scratch, call and foul rulings, contested breaks, head-string placement, actual eight-ball finish, all five AI levels, practice layouts and authenticated two-client room traffic. Integration tests cover room capacity, unauthorized or wrong-turn actions, input bounds, duplicate shots, shared positions and results, disconnect, resume, re-rack, placement, resignation and rematch.

Desktop Chrome QA exercised first-time profile creation, persistence after refresh, Quick Play and a settled legal break. Two independent browser seats also created and joined a private room, confirmed readiness, played a synchronized break, and observed control passing to the second player. The preview used a local server. Physical Android/tablet testing, installation on those devices, long-duration/load testing and public deployment verification are pending.
