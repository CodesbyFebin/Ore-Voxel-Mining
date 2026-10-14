import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
export default defineConfig({
 base:"/Ore-Voxel-Mining/",
 publicDir:"public",
 plugins:[tailwindcss(),react()],
 resolve:{alias:{"@":path.resolve(process.cwd(),"src")}},
 build:{outDir:"dist-pages",emptyOutDir:true,rollupOptions:{input:path.resolve(process.cwd(),"pages/index.html")}},
});
