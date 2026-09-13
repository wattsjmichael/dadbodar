# Pumpkin Invasion

Open https://wattsjmichael.github.io/dadbodar/ on your phone. Tap START AR,
scan the existing Elysian label, and wait for the owl entrance. Drag horizontally
over the camera view to steer; feathers fire automatically. Each pumpkin scores
100 points. Clear a formation to increase the wave and speed. A breach costs one
of three lives and moves surviving invaders back up. PLAY AGAIN resets the game
without restarting the camera. No audio or new dependencies are included.

All game coordinates are local to the existing curved-target anchor. Tracking
loss and backgrounding pause the simulation, including an incomplete entrance.
Reacquisition resumes it. The simulation has no timers: one A-Frame tick advances
it. Fifteen pumpkins, twelve shots and fifteen hit effects have reusable meshes.
The model's original Fly clip is played with A-Frame's own AnimationMixer.

`src/pumpkin-game.js` contains the pure simulation plus the A-Frame adapter.
`src/app.js` connects the original target events to that adapter. `src/owl.js`
is retained unchanged as the original standalone demo component.

Checks: `npm ci`, `npm test`, `npm run check`, `npm run build`.
Physical acceptance: test drag response, arena size, owl orientation, label
loss/reacquisition mid-wave, background/resume, and PLAY AGAIN on both iPhone
Safari and Android Chrome. Automated logic checks do not prove physical AR quality.
