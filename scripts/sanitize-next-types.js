const fs = require('node:fs');
const path = require('node:path');

const files = [
  path.join(process.cwd(), 'tsconfig.json'),
  path.join(process.cwd(), 'apps', 'dashboard', 'tsconfig.json'),
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.include)) continue;

  const nextDevInclude = '.next-dev/types/**/*.ts';
  const legacyNextDevInclude = '.next-dev/dev/types/**/*.ts';
  const nextInclude = '.next/types/**/*.ts';
  const before = json.include.join('|');

  if (!json.include.includes(nextInclude)) {
    json.include.push(nextInclude);
  }
  if (!json.include.includes(nextDevInclude)) {
    json.include.push(nextDevInclude);
  }
  if (!json.include.includes(legacyNextDevInclude)) {
    json.include.push(legacyNextDevInclude);
  }

  if (json.include.join('|') !== before) {
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    console.log(`[sanitize-next-types] updated ${path.relative(process.cwd(), file)}`);
  }
}
