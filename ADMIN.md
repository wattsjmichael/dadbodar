# Dadbod AR internal admin

This is a local development admin and API. It is separate from the public camera
scanner. It has no accounts or authentication and binds only to loopback. Do not
publish it behind a tunnel or public reverse proxy. `NODE_ENV=production` refuses
to start until an authenticated deployment is implemented. GitHub Pages still
hosts only the static scanner; it cannot run this Node/SQLite service.

## Start

Use Node **24 LTS** (minimum 22.13). From the repository root:

```sh
npm install
npm run dev:all
```

- Admin: **http://localhost:3001/admin/**
- API-backed scanner: **https://localhost:8080/?config=api**
- Original static scanner: **https://localhost:8080/**
- Original Brewer Tour demo: **https://localhost:8080/?experience=brewer-tour**
- SQLite database: **data/dadbod.sqlite** (WAL sidecars may appear).
- Uploaded files: **uploads/labels**, **uploads/targets**, **uploads/thumbnails**.

`npm run admin` starts just the API/admin. `npm run dev` starts just the scanner.
Ctrl+C stops both processes when using `dev:all`. A port collision stops the
launcher; close your earlier development server before restarting.

The first launch automatically seeds two labels, two experiences, and two
assignments. The original Elysian cylindrical target is copied into managed
storage and stays associated with Pumpkin Invasion. The second label is a draft
sample associated with Brewer Tour: it deliberately has no fabricated target.
Seeding is recorded in the database and never recreates deleted records on restart.

## Add a label and attach Brewer Tour

1. Open **Labels → Add label**. Enter internal/display names, target type, and
   a unique tracking key. Upload the source artwork and save as **draft**.
2. Generate the target with the existing CLI workflow:
   `npx @8thwall/image-target-cli@latest`. Use the same tracking key. Use measured
   dimensions for cylindrical/conical packaging. No tracking code changes are needed.
3. Edit the label. In **Generated target data + images**, select the generated
   JSON and **all** generated images in one selection. Do not upload a ZIP.
   The server checks referenced assets and preserves the generated geometry.
4. Ensure the key and type match the JSON, set status **active**, and save.
5. Open the label's detail page → **Attach experience** → select **Brewer Tour**.
   Enable the assignment, enter overrides, and save, for example:

```json
{
  "breweryName": "Example Brewing",
  "beerName": "Night Owl IPA",
  "brewerName": "Michael"
}
```

You can attach the experience before uploading target data, too. It will not
launch until the label and experience are active and the assignment is enabled.
The label page shows attached experiences; the experience page shows all assigned
labels. **Configure**, **Disable/Enable**, and **Remove** operate on assignments.
Deleting a label/experience cascades its assignments. Uploaded files are retained
so deletions do not silently destroy source assets; no garbage collector is included.

The runtime selects the enabled assignment with the **lowest priority number**;
ties use assignment ID order. Multiple assignments are stored and returned, but
this first UI/runtime does not offer an end-user experience picker.

Configuration merges recursively: template defaults, experience defaults, then
assignment overrides. Arrays are replaced. Brewer Tour uses its existing copy,
colors and product settings. Pumpkin Invasion receives configuration on its root;
its existing gameplay currently uses its built-in tuning. Do not add new source
code to reuse either implementation with another label. Creating an entirely new
implementation still requires registering an actual module in the runtime.

## Runtime integration

API mode is opt-in. With `?config=api`, START AR loads an active-target manifest,
fetches local generated target JSON/assets, and passes it to the **existing** XR8
image-target configuration. Existing named anchors and cylinder offsets remain.
The manifest contains each target's active experiences and merged configuration;
recognition launches the selected implementation from this startup snapshot.
Reload the scanner after changing assignments or targets in the admin.

`src/runtime-config.js` also exposes `getExperienceForTarget(name)` for future
live lookups. API failure shows a startup error; it does not silently fall back
to the static sample label. There is one mounted experience at a time, avoiding
duplicate global game controls. Brief tracking loss pauses/resumes the same
instance. Switching to another label disposes and restarts the experience.

For phone testing, use the existing trusted HTTPS instructions in README. On the
same Wi-Fi, open `https://YOUR-COMPUTER-IP:8080/?config=api`. The Webpack server
proxies **only public APIs and uploads** to the loopback backend. Admin CRUD is
not proxied. The phone never needs access to port 3001. Physical camera tracking,
phone performance, and video capture still need on-device regression testing.

For eventual separate deployment, set `window.DADBOD_API_BASE` in
`public/runtime-settings.js` to an HTTPS API base ending in `/`; implement a
specific CORS allowlist and authentication on the deployed API. No remote API base
is configured by default. Do not point a public scanner at localhost.

## API and boundaries

Admin routes (local, same-origin only, mutations require `X-Dadbod-Admin: 1`):

- `GET /api/admin/dashboard`
- `GET /api/admin/implementations`
- `GET/POST /api/admin/labels`, `GET/PATCH/DELETE /api/admin/labels/:id`
- Equivalent routes for `experiences` and `assignments`
- `POST /api/admin/uploads/labels`, `/targets`, `/thumbnails`
  (multipart FormData, field `files`; 32 MB combined maximum)

Public read-only routes:

- `GET /api/runtime/manifest`
- `GET /api/runtime/target/:targetName`
- `GET /api/labels`, `/api/labels/:id`, `/api/labels/by-target/:targetName`
- `GET /api/labels/:id/experiences`
- `GET /api/experiences`

Public label lookups omit drafts, disabled labels, and labels without active
assignments. Runtime results require enabled assignments and active experiences.
Public experience listing includes active experience definitions. Upload URLs
are publicly readable when known; do not upload confidential material.

## Structure and persistence

- `src/`: existing AR runtime, experiences, capture, and optional lookup adapter.
- `apps/admin/`: standalone vanilla HTML/CSS/JS frontend; no AR imports.
- `apps/api/repository.cjs`: SQLite-specific SQL, foreign keys, prepared statements.
- `apps/api/service.cjs`: validation, assignments, runtime projections.
- `apps/api/storage.cjs`: local storage boundary, replaceable by object storage.
- `apps/api/server.cjs`: HTTP transport and local admin authorization boundary.
- `packages/shared/contracts.cjs`: implementation identifiers and config merging.

To move to Postgres, replace the repository and its migrations while retaining
service/frontend API contracts. The first migration creates normal records and
indexes, with unique names/keys/slugs and label–experience pairs. Lists provide
search and client pagination; server-side pagination is a later scaling step.

Optional environment variables: `DADBOD_DATABASE`, `DADBOD_UPLOADS`,
`DADBOD_API_PORT` (default 3001), and the existing `AR_HOST` / `AR_HTTPS`.
Database/upload paths should be absolute when overridden. Back up the database
and uploads together **after stopping the API**. They are excluded from Git and
Webpack output. Deleting the database intentionally resets seed state on startup.

## Verification

```sh
npm test
npm run check
npm run build
```

Tests exercise actual HTTP CRUD, persistence/reopening, complete target imports,
activation rules, config merging, priority, disabling/removal, public/admin
separation, static runtime fallback, and experience lifecycle. Existing game,
video capture, and Brewer Tour tests remain. The build runs production-bundle
START AR smoke tests for both original entry modes.
