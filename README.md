# Image Redacter

Redact sensitive information from screenshots and photos without modifying the source image.

## How to use

1. Select an image in Finder or File Explorer, copy an image to the clipboard, or choose one in the command's file picker.
2. Run **Redact Image**. Press `⌘V` on macOS or `Ctrl+V` on Windows to load the clipboard image. You can also paste another image directly into the canvas editor.
3. Choose Rectangle, Circle, Freeform, Paint, or Text and mark everything that should be hidden.
4. Keep the default Mosaic effect, or switch to Blur or Solid.
5. Save a plain redacted PNG, copy it, or export it with a presentation-ready frame.

Text detection runs locally in the browser with Tesseract.js. On its first use, the browser downloads the OCR engine and English language model from the jsDelivr CDN; the selected image is not uploaded.

## Privacy and file safety

- The editor is served temporarily from `127.0.0.1` using an unguessable URL.
- The image stays on the computer and is never sent to a service.
- Export always creates a new PNG download. The source file is opened read-only and is never overwritten.

## Why framing is built in

[ray.so](https://ray.so) frames source code and does not provide an API or upload flow for arbitrary images. Image Redacter therefore includes its own framed PNG export rather than relying on an unsupported integration.
