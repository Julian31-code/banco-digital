import app from "../artifacts/api-server/src/app.js";
import { fileURLToPath } from "url";
import path from "path";
import { createReadStream, existsSync, statSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const filePath = path.join(publicDir, req.path);
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    if (ext !== ".html") {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(publicDir, "index.html");
    res.setHeader("Content-Type", "text/html");
    createReadStream(indexPath).pipe(res);
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Railway server listening on port ${port}`);
});
