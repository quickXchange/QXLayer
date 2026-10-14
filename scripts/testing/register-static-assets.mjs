import { register } from "node:module";
register(new URL("./static-asset-loader.mjs", import.meta.url), import.meta.url);
