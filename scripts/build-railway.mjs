import { build as esbuild } from "esbuild";
import { execSync } from "child_process";
import { mkdirSync, rmSync, cpSync } from "fs";

const OUT = "dist-railway";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/public`, { recursive: true });

console.log("1/3 Building frontend...");
execSync("pnpm --filter @workspace/banco-ds run build", {
  stdio: "inherit",
  cwd: process.cwd(),
});
cpSync("artifacts/banco-ds/dist/public", `${OUT}/public`, { recursive: true });
console.log("    Frontend → dist-railway/public/");

console.log("2/3 Bundling API...");
await esbuild({
  entryPoints: ["scripts/railway-entry.mjs"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: `${OUT}/server.mjs`,
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
console.log("    API → dist-railway/server.mjs");

console.log("3/3 Done! Output at dist-railway/");
