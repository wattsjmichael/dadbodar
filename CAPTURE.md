# Five-second video capture

RECORD 5 SEC requires an active tracked game. The three-second countdown cancels
if tracking is lost. Once recording starts it runs for five seconds, even if the
label disappears. Leaving the page cancels/discards the clip. Preview offers
SHARE VIDEO, SAVE VIDEO, RETAKE and CLOSE without restarting the camera/game.

Uses the locally bundled `XR8.MediaRecorder.pipelineModule`, `configure`,
`recordVideo` and `stopRecording`. This is the same recorder called by the
current official XRExtras record-button implementation:
https://github.com/8thwall/8thwall/blob/main/packages/xrextras/src/mediarecorder/record-button.js

The engine composites camera + WebGL and negotiates native encoding or its
internal encoder. We do not override its MIME selection. Filenames use the
returned Blob MIME type. Output is capped at 720 pixels on the longest side;
frame rate/bitrate are engine controlled. `maxDurationMs: 5000` and no end card
bound the clip; container duration can differ slightly by an encoded frame.
`requestMic: manual` and no audio sources mean no microphone prompt or audible
audio; the engine may include a silent audio track. The onProcessFrame compositor
callback burns in Dadbod AR text. HTML HUD/capture controls are not recorded.

No screen capture, external upload service or cloud recording is used. Web Share
is invoked from the preview's explicit button gesture. Downloads do not silently
save into Photos: iPhone users may need Share → Save Video on the downloaded clip.

Run `npm test`, `npm run check`, `npm run build` (includes production startup test).
Physical iPhone Safari/Android Chrome testing is still required: confirm camera
and AR are both present, orientation, playable duration, silent audio, native share,
download, retake, close and background cancellation. Automated state tests cannot
prove device encoder behavior. The UI reports capture failure without stopping AR.
