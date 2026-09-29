# Marketing site

Hero, demonstration, and pricing. The pre-rendered Remotion video uses captures
of the actual editor with fictional content. It performs no document processing
or clipboard access in the website. See [video authoring](video/README.md).

`npm run dev`, `npm test`, `npm run build`.

The default install label is **Coming to a launcher near you soon**. After Store approval,
set `VITE_RAYCAST_AVAILABLE=true` and `VITE_RAYCAST_STORE_URL` to its HTTPS
`www.raycast.com/author/extension` URL, then rebuild. Set the flag to `false`
to disable availability. Pro checkout stays disabled until payments are connected.

Typography: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans),
bundled locally under the SIL Open Font License alongside the editor font.
