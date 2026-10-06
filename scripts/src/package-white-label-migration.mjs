import path from "node:path";
process.chdir(path.resolve(import.meta.dirname, "../.."));
await import("../migration/package-project2.mjs");
