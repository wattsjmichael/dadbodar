# Meet the Brewer

Experience #2 uses the existing XR8 image-target pipeline, A-Frame named anchors,
curved-target geometry offsets, and five-second recorder. No new AR engine or
runtime dependencies are required.

## Try it

Open `https://wattsjmichael.github.io/dadbodar/?experience=brewer-tour` on your
phone and scan the existing Elysian bottle. The normal URL keeps Pumpkin Invasion.
This explicit demo override exists because a second label target has not yet been
supplied. It does not create a second distinct recognition target.

Each of the first four stages enables NEXT after eight tracked seconds. Transitions
take one second. Canning reaches CHEERS after ten seconds. The minimum full tour
takes about 46 seconds; viewers can linger. Tracking loss and backgrounding pause
progress, including transitions. Reacquiring resumes the same stage.

## Connect a second label

1. Generate a uniquely named image target using the existing README workflow.
2. Copy its JSON and all generated images into `image-targets/`.
3. Add a campaign in `src/experiences/registry.js` using the commented example.
4. Set `component: 'brewer-tour'` and supply configuration. Keep the pumpkin entry.
5. Build and deploy with the existing workflow. Test both labels on the normal URL.

The registry passes all configured target data to the existing engine. Each target
has its own official anchor. One experience is active at a time; scanning another
pauses the previous one. Use distinct artwork and unique internal target names.

## Customize

Edit `src/experiences/brewer-tour/config.js` or override fields per campaign:
`brewerName`, `breweryName`, `beerName`, `hops`, `malt`, `description`, `steps`,
`colors`, and `labelTexture`. Colors are a complete palette object when overridden.
The first implementation uses generic brewing copy; ingredient metadata is reserved
for future customization. No creator interface exists.

The reference-inspired character uses a baseball cap, long brown hair, full beard,
and broad silhouette. Clothing/body below the photo are stylized approximations.
All meshes and animations are procedural. The demo wraps the available cropped
Elysian target around finished cans; supply full wrap artwork via `labelTexture`
for accurate final packaging. No photo is sent to a third-party asset service.

## Modules and validation

`BrewerTour.js` owns presentation, `TourState.js` owns progression,
`BrewerCharacter.js` owns the reusable character, `scenes/index.js` builds the five
small dioramas, and `geometry.js` shares geometry/material resources. Copy stays in
config. The AR app only routes tracking to registered experience components.

Run `npm test`, `npm run check`, and `npm run build`.
On a physical phone, verify all five animations, NEXT, one-second transitions,
tracking loss during a transition, reacquisition, CHEERS, replay, and video capture.
Also test the normal URL still runs Pumpkin Invasion. Actual FPS and tracking
readability must be measured on phones; automated tests cannot establish them.
