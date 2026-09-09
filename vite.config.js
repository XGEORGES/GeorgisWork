import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function pwaPrecachePlugin() {
  return {
    name: 'pwa-precache-plugin',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.resolve(distDir, 'assets');
      const swDistPath = path.resolve(distDir, 'sw.js');

      if (!fs.existsSync(swDistPath)) return;

      const assets = ['./', './index.html', './icon.png', './manifest.json'];

      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        files.forEach((file) => {
          assets.push(`./assets/${file}`);
        });
      }

      let swContent = fs.readFileSync(swDistPath, 'utf-8');
      const assetsString = JSON.stringify(assets, null, 2);
      swContent = swContent.replace(
        /const ASSETS_TO_PRECACHE = \[[\s\S]*?\];/,
        `const ASSETS_TO_PRECACHE = ${assetsString};`
      );

      fs.writeFileSync(swDistPath, swContent, 'utf-8');
      console.log(`✔ [PWA Precache] ${assets.length} archivos incluidos en sw.js para soporte 100% offline.`);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [pwaPrecachePlugin()],
  server: {
    port: 5173,
    open: false
  }
});
