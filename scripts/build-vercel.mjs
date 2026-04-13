import { build as esbuild } from "esbuild";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";

const OUT = ".vercel/output";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/static`, { recursive: true });
mkdirSync(`${OUT}/functions/api.func`, { recursive: true });

console.log("1/3 Building frontend...");
execSync("pnpm --filter @workspace/banco-ds run build", {
  stdio: "inherit",
  cwd: process.cwd(),
});

cpSync("artifacts/banco-ds/dist/public", `${OUT}/static`, { recursive: true });
console.log("    Frontend → .vercel/output/static/");

console.log("2/3 Bundling API...");
await esbuild({
  entryPoints: ["api/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: `${OUT}/functions/api.func/index.mjs`,
  external: ["@node-rs/bcrypt"],
  banner: {
    js: "import{createRequire as _cr}from'module';const require=_cr(import.meta.url);",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: true,
  logLevel: "info",
});
console.log("    API → .vercel/output/functions/api.func/index.mjs");

console.log("3/3 Writing Vercel config...");

writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/api/(.*)", dest: "/api" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  `${OUT}/functions/api.func/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      environment: {},
    },
    null,
    2,
  ),
);

console.log("Done! Output at .vercel/output/");
