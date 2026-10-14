import {cpSync,copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve,join} from "node:path";
const dest=resolve("dist-pages");const nested=join(dest,"pages");
if(!existsSync(join(nested,"index.html")))throw new Error("Vite Pages index missing");
let html=readFileSync(join(nested,"index.html"),"utf8");
// Pages publishes /Ore-Voxel-Mining/ and /Ore-Voxel-Mining/game/.
// Vite emits index in /pages; copy it to both public entry paths.
writeFileSync(join(dest,"index.html"),html);
mkdirSync(join(dest,"game"),{recursive:true});writeFileSync(join(dest,"game","index.html"),html);
writeFileSync(join(dest,"404.html"),html);
const assets=html.match(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)||[];
if(!assets.length)throw new Error("No JS/CSS assets in published index");
console.log("Prepared GitHub Pages entry points",assets.length);
