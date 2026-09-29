# Marketing site

Hero, demonstration, and pricing. The demonstration reuses `../assets/editor.html`
and `editor.css` at build time with a fictional screenshot. It does not load the
editor's document/OCR code or access the clipboard.

`npm run dev`, `npm test`, `npm run build`.

The default install label is **Coming to launch soon**. After Store approval,
set `VITE_RAYCAST_AVAILABLE=true` and `VITE_RAYCAST_STORE_URL` to its HTTPS
`www.raycast.com/author/extension` URL, then rebuild. Set the flag to `false`
to disable availability. Pro checkout stays disabled until payments are connected.

Typography: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans),
served by Google Fonts under the SIL Open Font License.
