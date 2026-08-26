import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { basename, join } from "node:path";
import { randomBytes } from "node:crypto";
import { environment, open } from "@raycast/api";

type EditorSession = {
  url: string;
  loaded: Promise<void>;
  close: () => Promise<void>;
};

const REQUIRED_RESOURCES = new Set(["page", "css", "js", "config", "source"]);

export async function startEditorSession(
  sourcePath: string,
  mimeType: string,
): Promise<EditorSession> {
  const token = randomBytes(24).toString("hex");
  const assets = environment.assetsPath;
  const sourceStat = await stat(sourcePath);
  const served = new Set<string>();
  let resolveLoaded!: () => void;
  let settled = false;
  let closeTimer: NodeJS.Timeout | undefined;
  const loaded = new Promise<void>((resolve) => {
    resolveLoaded = resolve;
  });

  function markServed(resource: string) {
    served.add(resource);
    if (!settled && [...REQUIRED_RESOURCES].every((name) => served.has(name))) {
      settled = true;
      resolveLoaded();
      closeTimer = setTimeout(() => void close(), 3_000);
    }
  }

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const route = requestUrl.pathname;
    const prefix = `/${token}`;

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");

    try {
      if (route === prefix || route === `${prefix}/`) {
        await sendAsset(
          response,
          join(assets, "editor.html"),
          "text/html; charset=utf-8",
        );
        markServed("page");
      } else if (route === `${prefix}/editor.css`) {
        await sendAsset(
          response,
          join(assets, "editor.css"),
          "text/css; charset=utf-8",
        );
        markServed("css");
      } else if (route === `${prefix}/editor.js`) {
        await sendAsset(
          response,
          join(assets, "editor.js"),
          "text/javascript; charset=utf-8",
        );
        markServed("js");
      } else if (route === `${prefix}/config`) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ filename: basename(sourcePath) }));
        markServed("config");
      } else if (route === `${prefix}/source`) {
        response.statusCode = 200;
        response.setHeader("Content-Type", mimeType);
        response.setHeader("Content-Length", sourceStat.size);
        const stream = createReadStream(sourcePath);
        stream.on("error", () => response.destroy());
        stream.on("end", () => markServed("source"));
        stream.pipe(response);
      } else {
        response.statusCode = 404;
        response.end("Not found");
      }
    } catch {
      response.statusCode = 500;
      response.end("Unable to load the editor");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not start the private editor.");
  }

  const close = async () => {
    if (closeTimer) clearTimeout(closeTimer);
    if (!server.listening) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      resolveLoaded();
    }
    void close();
  }, 60_000);
  timeout.unref();
  loaded.finally(() => clearTimeout(timeout)).catch(() => undefined);

  return { url: `http://127.0.0.1:${address.port}/${token}/`, loaded, close };
}

export async function openEditor(
  sourcePath: string,
  mimeType: string,
): Promise<void> {
  const session = await startEditorSession(sourcePath, mimeType);
  try {
    await open(session.url);
    await session.loaded;
  } catch (error) {
    await session.close();
    throw error;
  }
}

async function sendAsset(
  response: ServerResponse,
  path: string,
  contentType: string,
): Promise<void> {
  const body = await readFile(path);
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", body.byteLength);
  response.end(body);
}
