# Cloakshot demo video

Reproducible Remotion authoring package. The website serves the finished MP4 and
poster; it does not ship React or the Remotion Player.

```sh
npm ci --prefix website/video --include=optional
npm --prefix website/video run render
```

Run from the repository root. Rendering writes
`website/public/demo/cloakshot.mp4` and `cloakshot-poster.png`. Remotion obtains
its headless browser on the first render. Pinning every Remotion package to the
same version avoids render compatibility drift.

The 1000 × 760 captures in `public/shots` come from the actual editor using
`fixtures/sample.png`, a fictional Morgan Ellis message. `fixtures/morgan.html`
retains the original fictional content for future capture. To refresh the demo,
open that sample in the editor and capture the clean, email-redacted, both-redacted,
framed, and successfully copied states. Only the fixture is used; no customer data.
The real copy capture includes the successful toast; no website visitor's
clipboard is touched. Cursor positions in `src/index.jsx` match these captures.

Timing is shared with the website in `../demo-timeline.js`. Edit the composition,
render, then run `npm --prefix website test`. Generated artifacts are committed,
so regular website deployment needs no rendering dependency or browser.

[Remotion CLI rendering](https://www.remotion.dev/docs/cli/render) and
[still rendering](https://www.remotion.dev/docs/cli/still) are the owning commands.
Remotion is authoring software with its own [license](https://www.remotion.dev/license):
individuals and for-profit organizations with up to three employees can create
commercial videos for free; larger for-profit organizations need a company
license. The dependency is not relicensed under this repository's MIT license.
Plus Jakarta Sans is bundled with its SIL Open Font License in `public/OFL.txt`.
