const fs = require('node:fs');
const path = require('node:path');

const distDir = process.env.VERCEL ? '.next' : '.next-dev';
const appDir = path.join(process.cwd(), distDir, 'server', 'app');
const rootManifest = path.join(appDir, 'page_client-reference-manifest.js');
const dashboardManifest = path.join(appDir, '(dashboard)', 'page_client-reference-manifest.js');

if (!fs.existsSync(rootManifest)) {
  process.exit(0);
}

if (!fs.existsSync(path.dirname(dashboardManifest))) {
  fs.mkdirSync(path.dirname(dashboardManifest), { recursive: true });
}

if (!fs.existsSync(dashboardManifest)) {
  fs.copyFileSync(rootManifest, dashboardManifest);
  console.log(`[fix-next-manifests] created ${path.relative(process.cwd(), dashboardManifest)}`);
}
