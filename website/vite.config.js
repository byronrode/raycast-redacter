import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

// Keep the marketing demonstration on the shipped editor's markup and styles.
function editorDemo() {
  const source = (name) =>
    readFileSync(new URL(`../assets/${name}`, import.meta.url), "utf8");
  const fixture = readFileSync(
    new URL("./demo-shot.html", import.meta.url),
    "utf8",
  );
  const files = () => ({
    "vendor/fonts/PlusJakartaSans.ttf": readFileSync(
      new URL("../assets/vendor/fonts/PlusJakartaSans.ttf", import.meta.url),
    ),
    "vendor/fonts/OFL.txt": source("vendor/fonts/OFL.txt"),
    "editor.html": source("editor.html")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(
        '<link rel="stylesheet" href="./editor.css" />',
        '<link rel="stylesheet" href="./editor.css" /><link rel="stylesheet" href="./demo.css" />',
      )
      .replace(
        /<div id="canvasStack" class="canvas-stack">[\s\S]*?<\/div>/,
        `<div id="canvasStack" class="canvas-stack">${fixture}<span class="fixture-label">Made with Cloakshot</span></div>`,
      )
      .replace(
        '<div id="framePreview" class="frame-preview" hidden>',
        '<div id="framePreview" class="frame-preview">',
      )
      .replace(
        "</body>",
        '<div class="demo-toast">✓ Copied PNG</div><script src="./demo.js"></script></body>',
      ),
    "editor.css": source("editor.css"),
    "demo.css": readFileSync(new URL("./demo.css", import.meta.url), "utf8"),
    "demo.js": readFileSync(new URL("./demo.js", import.meta.url), "utf8"),
  });
  return {
    name: "cloakshot-editor-demo",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split("?")[0].replace(/^\/demo\//, "");
        const content = files()[name];
        if (!request.url?.startsWith("/demo/") || !content) return next();
        response.setHeader(
          "Content-Type",
          name.endsWith(".ttf")
            ? "font/ttf"
            : name.endsWith(".css")
              ? "text/css"
              : name.endsWith(".js")
                ? "text/javascript"
                : "text/html",
        );
        response.end(content);
      });
    },
    generateBundle() {
      for (const [name, content] of Object.entries(files()))
        this.emitFile({
          type: "asset",
          fileName: `demo/${name}`,
          source: content,
        });
    },
  };
}
export default defineConfig({ plugins: [editorDemo()] });
