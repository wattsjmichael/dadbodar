# Validation — Dadbod AR proof of concept

Performed 2026-09-12.

## Passed

- Inspected the current official A-Frame image-target example, its app/HTML/Webpack
  configuration, supplied named-image-target component, and current CLI source.
- Installed the project dependencies from its lockfile with `npm ci`.
- Ran `npx --yes @8thwall/image-target-cli@latest` (resolved 1.0.0), answered its
  interactive prompts and generated the included flat sample as `dadbod-test-can`.
- `npm run check`: generated target metadata and referenced local image assets pass.
- `npm run build`: successful production compilation. Remaining warnings describe
  the size of supplied engine resources, not module or compilation errors.
- Started the HTTPS Webpack development server using the project's npm dev script.
  A same-environment HTTPS request, validating the generated development certificate,
  received the Dadbod AR start page rather than a directory listing.
- HTTP 200 with correct content types for the application bundle, 8Frame, XRExtras,
  XR8 entrypoint, XR8 tracking chunk, and the generated target luminance image.
- Confirmed `image-targets/source` and `image-targets/generated` are excluded from
  production output while the active target JSON and image assets are included.

## Fixed during verification

- Official example's CommonJS package context rejected Babel-generated imports:
  configured the JavaScript loader as `javascript/auto`.
- Network-interface enumeration failed in this managed environment: development
  config falls back to loopback there; ordinary computers listen on all interfaces.
- Relative production asset paths were not being served at `/` by development
  middleware: explicitly set its development public path to `/`.
- Exclusion glob did not omit source files: replaced it with an explicit copy filter.

## Not verified here

This environment did not provide a compatible interactive browser preview for the
retained Webpack example. No successful live camera session, target recognition,
pose accuracy, found/lost event sequence or permission-denial flow is claimed.
No browser simulation was used as a substitute for physical tracking validation.

Complete these acceptance checks on physical devices:

| Test | Expected result |
| --- | --- |
| Modern iPhone Safari and Android Chrome, trusted HTTPS | Start screen, rear camera after START AR |
| Deny camera permission | Readable recovery screen; permission instructions |
| Hold sample print steadily in view | FOUND IT and a flapping owl flies out |
| Translate/tilt phone around print | Owl follows target position, rotation and scale |
| Move print out of view | Owl hides, animation resets, LOOK FOR THE LABEL returns |
| Bring print back | Tracking and animation resume |
| Switch tabs and return | Stale owl hidden; scanning resumes |
| Tap STOP AR | Camera is released and start screen returns |
| Replace target with generated beer-label data | Same interaction on the new artwork |
| Substitute a correctly measured cylinder target | Owl remains attached outside the can surface |

First test the included flat print. Then validate a real can under diffuse light,
including rotation, loss/reacquisition and glare. The sprint's physical success
criterion remains open until these tests pass.
